'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
] as const

interface UseVoiceRecorderOptions {
  maxDurationMs?: number
}

interface UseVoiceRecorderResult {
  isSupported: boolean
  isRecording: boolean
  recordingMs: number
  error: string | null
  startRecording: () => Promise<boolean>
  stopRecording: () => Promise<Blob | null>
  cancelRecording: () => void
  clearError: () => void
}

function getSupportedMimeType() {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return ''
  }

  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}): UseVoiceRecorderResult {
  const { maxDurationMs = 60_000 } = options
  const [isRecording, setIsRecording] = useState(false)
  const [recordingMs, setRecordingMs] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<number>(0)

  const isSupported = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== 'undefined',
    []
  )

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Voice recording is not supported on this browser.')
      return false
    }

    if (isRecording) {
      return true
    }

    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = getSupportedMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)

      chunksRef.current = []
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onerror = () => {
        setError('Recording failed. Please try again.')
      }
      recorder.onstop = () => {
        clearTimer()
        stopTracks()
        setIsRecording(false)
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      startedAtRef.current = Date.now()
      setRecordingMs(0)
      setIsRecording(true)

      clearTimer()
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAtRef.current
        setRecordingMs(elapsed)

        if (elapsed >= maxDurationMs && recorder.state === 'recording') {
          recorder.stop()
        }
      }, 200)

      return true
    } catch (startError) {
      console.error('Voice recorder start error:', startError)
      stopTracks()
      setError('Microphone access denied. Enable microphone permissions and try again.')
      setIsRecording(false)
      return false
    }
  }, [clearTimer, isRecording, isSupported, maxDurationMs, stopTracks])

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current
    if (!recorder) {
      return null
    }

    if (recorder.state === 'inactive') {
      const fallbackType = chunksRef.current[0] instanceof Blob ? (chunksRef.current[0] as Blob).type : 'audio/webm'
      const fallbackBlob = new Blob(chunksRef.current, { type: fallbackType || 'audio/webm' })
      chunksRef.current = []
      mediaRecorderRef.current = null
      clearTimer()
      stopTracks()
      setIsRecording(false)
      return fallbackBlob.size > 0 ? fallbackBlob : null
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      recorder.addEventListener(
        'stop',
        () => {
          const type = recorder.mimeType || 'audio/webm'
          const recordedBlob = new Blob(chunksRef.current, { type })
          chunksRef.current = []
          resolve(recordedBlob.size > 0 ? recordedBlob : null)
        },
        { once: true }
      )
      recorder.stop()
    })

    mediaRecorderRef.current = null
    clearTimer()
    stopTracks()
    setIsRecording(false)
    return blob
  }, [clearTimer, stopTracks])

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }

    chunksRef.current = []
    mediaRecorderRef.current = null
    clearTimer()
    stopTracks()
    setIsRecording(false)
    setRecordingMs(0)
  }, [clearTimer, stopTracks])

  useEffect(() => {
    return () => {
      cancelRecording()
    }
  }, [cancelRecording])

  return {
    isSupported,
    isRecording,
    recordingMs,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError,
  }
}
