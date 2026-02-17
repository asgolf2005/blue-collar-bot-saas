'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PhotoType, Media } from '@/lib/types'
import PartIdentifier from '@/components/tech/PartIdentifier'
import CompletionVerifier from '@/components/tech/CompletionVerifier'

interface PhotoUploadProps {
  jobId: string
  existingPhotos?: Media[]
}

interface PhotoItem {
  id: string
  url: string
  type: PhotoType
  uploading?: boolean
}

type ProofTabKey = 'analysis' | 'proof' | 'verification'

const photoTypes: { value: PhotoType; label: string; description: string }[] = [
  { value: 'before', label: 'Before', description: 'Photos before starting work' },
  { value: 'during', label: 'During', description: 'Photos during work' },
  { value: 'after', label: 'After', description: 'Photos after completion' },
]

export default function PhotoUpload({ jobId, existingPhotos = [] }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>(
    existingPhotos.map(p => ({
      id: p.id,
      url: p.file_url,
      type: (p.file_type as PhotoType) || 'during'
    }))
  )
  const [openTabs, setOpenTabs] = useState<Record<ProofTabKey, boolean>>({
    analysis: true,
    proof: true,
    verification: true,
  })
  const [uploading, setUploading] = useState(false)
  const [selectedType, setSelectedType] = useState<PhotoType>('before')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      for (const file of Array.from(files)) {
        const tempId = `temp-${Date.now()}-${Math.random()}`
        const tempUrl = URL.createObjectURL(file)

        // Add temp preview
        setPhotos(prev => [...prev, { id: tempId, url: tempUrl, type: selectedType, uploading: true }])

        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${jobId}/${selectedType}-${Date.now()}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          setPhotos(prev => prev.filter(p => p.id !== tempId))
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(fileName)

        // Save to media table
        const { data: mediaData, error: mediaError } = await supabase
          .from('media')
          .insert({
            job_id: jobId,
            technician_id: user.id,
            file_url: publicUrl,
            file_type: selectedType
          })
          .select()
          .single()

        if (mediaError) {
          console.error('Media save error:', mediaError)
          setPhotos(prev => prev.filter(p => p.id !== tempId))
          continue
        }

        // Update with real data
        setPhotos(prev => prev.map(p =>
          p.id === tempId
            ? { id: mediaData.id, url: publicUrl, type: selectedType, uploading: false }
            : p
        ))
      }
    } catch (error: any) {
      console.error('Error uploading photo:', error)
      alert('Failed to upload photo: ' + error.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''
    }
  }

  const deletePhoto = async (photoId: string) => {
    try {
      const { error } = await supabase
        .from('media')
        .delete()
        .eq('id', photoId)

      if (error) throw error

      setPhotos(prev => prev.filter(p => p.id !== photoId))
    } catch (error: any) {
      console.error('Error deleting photo:', error)
      alert('Failed to delete photo')
    }
  }

  const getPhotosByType = (type: PhotoType) => photos.filter(p => p.type === type)
  const getPhotoCountByType = (type: PhotoType) => photos.filter(p => p.type === type && !p.uploading).length

  const toggleTab = (tab: ProofTabKey) => {
    setOpenTabs((previous) => ({
      ...previous,
      [tab]: !previous[tab],
    }))
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="pointer-events-none absolute inset-0 opacity-50 [background:linear-gradient(135deg,rgba(148,163,184,0.09)_0%,rgba(148,163,184,0)_40%)] dark:opacity-80 dark:[background:linear-gradient(135deg,rgba(148,163,184,0.14)_0%,rgba(148,163,184,0)_45%)]" />
      <div className="pointer-events-none absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-slate-300/70 to-transparent dark:from-slate-500/60" />
      <div className="relative mb-4 flex items-center gap-2">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Field Record</h3>
        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="relative space-y-3">
        {([
          {
            key: 'analysis',
            title: 'Photo Analysis',
            subtitle: 'Review likely part condition and next step',
            content: <PartIdentifier jobId={jobId} />,
          },
          {
            key: 'proof',
            title: 'Proof of Work',
            subtitle: `${photos.length} photo${photos.length === 1 ? '' : 's'} saved`,
            content: (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Photo Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {photoTypes.map((type) => {
                      const count = getPhotoCountByType(type.value)
                      const isSelected = selectedType === type.value
                      return (
                        <button
                          type="button"
                          key={type.value}
                          onClick={() => setSelectedType(type.value)}
                          className={`relative min-h-12 rounded-xl border px-2 py-3 text-sm font-medium transition-all ${
                            isSelected
                              ? 'bg-slate-200 border-slate-300 text-slate-900 dark:bg-slate-700/70 dark:border-slate-600 dark:text-slate-100'
                              : 'bg-white/70 border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <span className="block">{type.label}</span>
                          {count > 0 && (
                            <span
                              className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                                isSelected
                                  ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
                                  : 'bg-slate-700 text-white dark:bg-slate-600'
                              }`}
                            >
                              {count}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {photoTypes.find((type) => type.value === selectedType)?.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={uploading}
                    className="group relative min-h-12 overflow-hidden rounded-2xl font-semibold text-white transition-opacity active:scale-[0.98] disabled:opacity-50"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-slate-700 to-slate-900 opacity-90 transition-opacity group-hover:opacity-100 dark:from-slate-500 dark:to-slate-700" />
                    <span className="absolute inset-0 opacity-50 [background:radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.35),transparent_55%)]" />
                    <span className="relative inline-flex items-center justify-center">Take Photo</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="min-h-12 rounded-2xl border border-slate-200 bg-white/70 font-semibold text-slate-800 backdrop-blur transition-colors hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:bg-slate-800/60"
                  >
                    Upload
                  </button>
                </div>

                {photos.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {photoTypes.map((type) => {
                      const typePhotos = getPhotosByType(type.value)
                      if (typePhotos.length === 0) return null

                      return (
                        <div key={type.value}>
                          <div className="mb-2 flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{type.label}</h4>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{typePhotos.length} photo(s)</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {typePhotos.map((photo) => (
                              <div key={photo.id} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40">
                                {photo.uploading ? (
                                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur dark:bg-slate-900/60">
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-900/20 border-t-cyan-500 dark:border-white/10 dark:border-t-cyan-400" />
                                  </div>
                                ) : (
                                  <>
                                    <img
                                      src={photo.url}
                                      alt={`${type.label} photo`}
                                      className="absolute inset-0 h-full w-full object-cover"
                                      loading="lazy"
                                      decoding="async"
                                      referrerPolicy="no-referrer"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => deletePhoto(photo.id)}
                                      className="absolute top-1 right-1 rounded-lg bg-red-600/90 px-2 py-1 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-red-600"
                                      aria-label="Delete photo"
                                    >
                                      Remove
                                    </button>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {photos.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-800/40">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No photos yet</p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Take photos to document your work</p>
                  </div>
                )}

                {photos.length > 0 && (
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                    <span>Documentation</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">{photos.length} saved</span>
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'verification',
            title: 'Completion Verification',
            subtitle: 'Confirm problem identified and resolved',
            content: <CompletionVerifier jobId={jobId} />,
          },
        ] as const).map((tab) => {
          const isOpen = openTabs[tab.key]

          return (
            <section
              key={tab.key}
              className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-900/60 dark:shadow-[0_10px_24px_-18px_rgba(2,6,23,0.7)]"
            >
              <button
                type="button"
                onClick={() => toggleTab(tab.key)}
                className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-transparent px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{tab.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{tab.subtitle}</p>
                </div>
                <span className="shrink-0 rounded-full border border-slate-300 bg-slate-100/70 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
                  {isOpen ? 'Close' : 'Open'}
                </span>
              </button>

              <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className={`px-3 pb-3 transition-all duration-300 ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-6 opacity-0'}`}>
                    <div className={`mb-2 h-[2px] w-full origin-left bg-gradient-to-r from-slate-400/60 via-slate-300/20 to-transparent transition-transform duration-500 ${isOpen ? 'scale-x-100' : 'scale-x-0'}`} />
                    {tab.content}
                  </div>
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
