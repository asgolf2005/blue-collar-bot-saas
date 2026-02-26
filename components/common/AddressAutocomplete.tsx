'use client'

import { useLoadScript, Autocomplete } from '@react-google-maps/api'
import { useRef, useState } from 'react'

const libraries: ('places')[] = ['places']

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  showApiHint?: boolean
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Enter address',
  className = '',
  disabled = false,
  showApiHint = true,
}: AddressAutocompleteProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  })

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance)
  }

  const onPlaceChanged = () => {
    if (!autocomplete) return
    const place = autocomplete.getPlace()
    if (place.formatted_address) {
      onChange(place.formatted_address)
    }
  }

  if (loadError) {
    // Fallback to regular input if Maps API fails to load.
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />
    )
  }

  if (!isLoaded) {
    return (
      <input
        type="text"
        placeholder="Loading..."
        className={className}
        disabled={true}
      />
    )
  }

  // If no API key is set, use regular input with optional helper note.
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
          disabled={disabled}
        />
        {showApiHint && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable autocomplete
          </p>
        )}
      </div>
    )
  }

  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{
        componentRestrictions: { country: ['au'] }, // Australia - change as needed
        types: ['address'],
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />
    </Autocomplete>
  )
}
