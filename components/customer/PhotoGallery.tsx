'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Camera, X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import type { PhotoType } from '@/lib/types'

interface Photo {
  id: string
  file_url: string
  photo_type?: PhotoType
  created_at: string
}

interface PhotoGalleryProps {
  photos: Photo[]
  showTypeFilter?: boolean
  columns?: 2 | 3 | 4
  emptyMessage?: string
}

export default function PhotoGallery({
  photos,
  showTypeFilter = true,
  columns = 3,
  emptyMessage = 'No photos yet'
}: PhotoGalleryProps) {
  const [selectedType, setSelectedType] = useState<PhotoType | 'all'>('all')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const typeFilters: Array<{ value: PhotoType | 'all'; label: string; color: string }> = [
    { value: 'all', label: 'All Photos', color: 'bg-surface-100 text-ink' },
    { value: 'before', label: 'Before', color: 'bg-warning/10 text-warning border border-warning/20' },
    { value: 'during', label: 'During', color: 'bg-info/10 text-info border border-info/20' },
    { value: 'after', label: 'After', color: 'bg-success/10 text-success border border-success/20' },
  ]

  const filteredPhotos = selectedType === 'all'
    ? photos
    : photos.filter(p => p.photo_type === selectedType)

  const getTypeColor = (type?: PhotoType) => {
    switch (type) {
      case 'before': return 'bg-orange-500'
      case 'during': return 'bg-blue-500'
      case 'after': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getTypeBadge = (type?: PhotoType) => {
    switch (type) {
      case 'before': return 'Before'
      case 'during': return 'During'
      case 'after': return 'After'
      default: return null
    }
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    document.body.style.overflow = 'hidden'
  }

  const closeLightbox = () => {
    setLightboxIndex(null)
    document.body.style.overflow = ''
  }

  const goToPrev = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1)
    }
  }

  const goToNext = () => {
    if (lightboxIndex !== null && lightboxIndex < filteredPhotos.length - 1) {
      setLightboxIndex(lightboxIndex + 1)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeLightbox()
    if (e.key === 'ArrowLeft') goToPrev()
    if (e.key === 'ArrowRight') goToNext()
  }

  const columnClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
  }[columns]

  if (photos.length === 0) {
    return (
      <div className="card p-8 text-center">
        <Camera className="w-12 h-12 text-muted mx-auto mb-3" />
        <p className="text-muted">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div>
      {/* Type Filter */}
      {showTypeFilter && (
        <div className="flex flex-wrap gap-2 mb-4">
          {typeFilters.map((filter) => {
            const count = filter.value === 'all'
              ? photos.length
              : photos.filter(p => p.photo_type === filter.value).length

            if (count === 0 && filter.value !== 'all') return null

            return (
              <button
                key={filter.value}
                onClick={() => setSelectedType(filter.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedType === filter.value
                    ? filter.color + ' ring-2 ring-offset-2 ring-primary/20'
                    : 'bg-surface-100 text-muted hover:bg-surface-50'
                }`}
              >
                {filter.label}
                <span className="ml-1.5 text-xs opacity-75">({count})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Photo Grid */}
      <div className={`grid ${columnClass} gap-3`}>
        {filteredPhotos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative group aspect-square rounded-xl overflow-hidden bg-surface-100 cursor-pointer border border-surface-200"
            onClick={() => openLightbox(index)}
          >
            <Image
              src={photo.file_url}
              alt={`Job photo ${index + 1}`}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 33vw"
            />

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
              <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Photo type badge */}
            {photo.photo_type && (
              <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium text-white ${getTypeColor(photo.photo_type)}`}>
                {getTypeBadge(photo.photo_type)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 p-2 text-white hover:bg-white hover:bg-opacity-10 rounded-full transition-colors z-10"
            onClick={closeLightbox}
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation - Previous */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 p-2 text-white hover:bg-white hover:bg-opacity-10 rounded-full transition-colors z-10"
              onClick={(e) => {
                e.stopPropagation()
                goToPrev()
              }}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Navigation - Next */}
          {lightboxIndex < filteredPhotos.length - 1 && (
            <button
              className="absolute right-4 p-2 text-white hover:bg-white hover:bg-opacity-10 rounded-full transition-colors z-10"
              onClick={(e) => {
                e.stopPropagation()
                goToNext()
              }}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Image */}
          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={filteredPhotos[lightboxIndex].file_url}
              alt={`Job photo ${lightboxIndex + 1}`}
              width={1200}
              height={800}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />

            {/* Photo info */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-3">
                {filteredPhotos[lightboxIndex].photo_type && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(filteredPhotos[lightboxIndex].photo_type)}`}>
                    {getTypeBadge(filteredPhotos[lightboxIndex].photo_type)}
                  </span>
                )}
                <span className="text-sm text-zinc-300">
                  {new Date(filteredPhotos[lightboxIndex].created_at).toLocaleDateString()}
                </span>
              </div>
              <span className="text-sm text-zinc-400">
                {lightboxIndex + 1} / {filteredPhotos.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
