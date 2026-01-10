'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, Upload, X, Image, CheckCircle, Loader2 } from 'lucide-react'
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

  const photoTypes: { value: PhotoType; label: string }[] = [
    { value: 'before', label: 'Before' },
    { value: 'during', label: 'During' },
    { value: 'after', label: 'After' },
  ]

  const getPhotosByType = (type: PhotoType) => photos.filter(p => p.type === type)

  return (
    <div className="bg-surface-50/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-4">
      <div className="flex items-center mb-4">
        <Camera className="w-5 h-5 text-muted mr-2" />
        <h2 className="font-semibold text-ink">Proof of Work Photos</h2>
      </div>

      {/* Photo Type Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-surface-600 mb-2">Photo Type</label>
        <div className="grid grid-cols-3 gap-2">
          {photoTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={`py-2 px-3 rounded-xl border text-sm font-medium transition ${
                selectedType === type.value
                  ? 'border-warning/30 bg-warning/20 text-warning'
                  : 'border-surface-200 bg-surface-100 text-muted hover:bg-surface-50'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upload Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
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
          className="flex items-center justify-center py-3 px-4 bg-primary text-white dark:text-midnight-950 font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Camera className="w-5 h-5 mr-2" />
          )}
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
          className="flex items-center justify-center py-3 px-4 bg-surface-100 text-surface-600 font-medium rounded-xl hover:bg-surface-50 disabled:opacity-50 disabled:cursor-not-allowed transition border border-surface-200"
        >
          <Upload className="w-5 h-5 mr-2" />
          Upload
        </button>
      </div>

      {/* Photo Gallery by Type */}
      {photoTypes.map((type) => {
        const typePhotos = getPhotosByType(type.value)
        if (typePhotos.length === 0) return null

        return (
          <div key={type.value} className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-ink">{type.label} Photos</h3>
              <span className="text-xs text-muted">{typePhotos.length} photo(s)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {typePhotos.map((photo) => (
                <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-surface-100">
                  {photo.uploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-surface-100">
                      <Loader2 className="w-6 h-6 text-muted animate-spin" />
                    </div>
                  ) : (
                    <>
                      <img
                        src={photo.url}
                        alt={`${type.label} photo`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => deletePhoto(photo.id)}
                        className="absolute top-1 right-1 p-1 bg-danger text-white dark:text-midnight-950 rounded-full hover:bg-danger/90 transition"
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

      {/* Empty State */}
      {photos.length === 0 && (
        <div className="text-center py-6 bg-surface-100 rounded-xl border border-dashed border-surface-200">
          <Image className="w-10 h-10 text-muted mx-auto mb-2" />
          <p className="text-sm text-muted">No photos uploaded yet</p>
          <p className="text-xs text-muted mt-1">Take or upload photos to document your work</p>
        </div>
      )}

      {/* Photo Count Summary */}
      {photos.length > 0 && (
        <div className="mt-4 pt-4 border-t border-surface-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Total Photos:</span>
            <div className="flex items-center text-success">
              <CheckCircle className="w-4 h-4 mr-1" />
              <span className="font-medium">{photos.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
