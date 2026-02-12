'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, Upload, X, Image as ImageIcon, CheckCircle, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { PhotoType, Media } from '@/lib/types'

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

  return (
    <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Camera className="w-5 h-5 text-cyan-400" />
        <h3 className="font-semibold text-white">Proof of Work</h3>
        <span className="ml-auto text-xs text-slate-400">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-4">
        {/* Photo Type Selector */}
        <div className="space-y-2">
          <label className="text-xs text-slate-400 uppercase tracking-wider">Photo Type</label>
          <div className="grid grid-cols-3 gap-2">
            {photoTypes.map((type) => {
              const count = getPhotoCountByType(type.value)
              const isSelected = selectedType === type.value
              return (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`relative py-3 px-2 rounded-xl border text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                      : 'bg-slate-700/30 border-slate-600/30 text-slate-400 hover:bg-slate-700/50'
                  }`}
                >
                  <span className="block">{type.label}</span>
                  {count > 0 && (
                    <span className={`absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full ${
                      isSelected ? 'bg-cyan-500 text-slate-900' : 'bg-slate-600 text-white'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-slate-500">
            {photoTypes.find(t => t.value === selectedType)?.description}
          </p>
        </div>

        {/* Upload Buttons */}
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
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="h-12 flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] active:scale-[0.98] disabled:opacity-50"
          >
            <Camera className="w-5 h-5" />
            Take Photo
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
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-12 flex items-center justify-center gap-2 bg-slate-700/50 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-600 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Upload className="w-5 h-5" />
            Upload
          </button>
        </div>

        {/* Photo Gallery */}
        {photos.length > 0 && (
          <div className="space-y-3 pt-2">
            {photoTypes.map((type) => {
              const typePhotos = getPhotosByType(type.value)
              if (typePhotos.length === 0) return null

              return (
                <div key={type.value}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-white">{type.label}</h4>
                    <span className="text-xs text-slate-400">{typePhotos.length} photo(s)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {typePhotos.map((photo) => (
                      <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-slate-700 border border-slate-600">
                        {photo.uploading ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                          </div>
                        ) : (
                          <>
                            <Image
                              src={photo.url}
                              alt={`${type.label} photo`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 33vw, 20vw"
                            />
                            <button
                              onClick={() => deletePhoto(photo.id)}
                              className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-colors"
                              aria-label="Delete photo"
                            >
                              <X className="w-3 h-3" />
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

        {/* Empty State */}
        {photos.length === 0 && (
          <div className="text-center py-8 px-4 bg-slate-700/30 border border-dashed border-slate-600/50 rounded-xl">
            <ImageIcon className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No photos yet</p>
            <p className="text-xs text-slate-500 mt-1">Take photos to document your work</p>
          </div>
        )}

        {/* Completion Indicator */}
        {photos.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
            <span className="text-sm text-slate-400">Documentation</span>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{photos.length} saved</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
