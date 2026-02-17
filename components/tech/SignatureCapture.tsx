'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SignatureCaptureProps {
  jobId: string
  existingSignature?: string | null
}

export default function SignatureCapture({ jobId, existingSignature }: SignatureCaptureProps) {
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(!!existingSignature)
  const [signatureUrl, setSignatureUrl] = useState<string | null>(existingSignature || null)
  const [saving, setSaving] = useState(false)
  const [showCanvas, setShowCanvas] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (showCanvas && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#0f172a'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.strokeStyle = '#22d3ee'
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        
        // Draw grid lines
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.1)'
        ctx.lineWidth = 1
        for (let i = 0; i < canvas.width; i += 20) {
          ctx.beginPath()
          ctx.moveTo(i, 0)
          ctx.lineTo(i, canvas.height)
          ctx.stroke()
        }
        for (let i = 0; i < canvas.height; i += 20) {
          ctx.beginPath()
          ctx.moveTo(0, i)
          ctx.lineTo(canvas.width, i)
          ctx.stroke()
        }
        
        // Reset stroke for drawing
        ctx.strokeStyle = '#22d3ee'
        ctx.lineWidth = 3
      }
    }
  }, [showCanvas])

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Redraw grid
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.1)'
    ctx.lineWidth = 1
    for (let i = 0; i < canvas.width; i += 20) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, canvas.height)
      ctx.stroke()
    }
    for (let i = 0; i < canvas.height; i += 20) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(canvas.width, i)
      ctx.stroke()
    }
    
    ctx.strokeStyle = '#22d3ee'
    ctx.lineWidth = 3
  }

  const handleSave = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    setSaving(true)
    try {
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png')
      })

      const fileName = `signatures/${jobId}-${Date.now()}.png`
      const { error: uploadError } = await supabase.storage
        .from('job-photos')
        .upload(fileName, blob)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('job-photos')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('jobs')
        .update({ customer_signature: publicUrl })
        .eq('id', jobId)

      if (updateError) throw updateError

      setSignatureUrl(publicUrl)
      setHasSignature(true)
      setShowCanvas(false)
    } catch (error: any) {
      alert('Failed to save signature: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // Completed state
  if (hasSignature && signatureUrl) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="pointer-events-none absolute inset-0 opacity-55 [background:radial-gradient(circle_at_30%_0%,rgba(52,211,153,0.10),transparent_55%)] dark:opacity-70 dark:[background:radial-gradient(circle_at_30%_0%,rgba(52,211,153,0.12),transparent_55%)]" />
        <div className="relative mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Customer Signature</h3>
        </div>
        <div className="relative rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-400/25 dark:bg-emerald-400/10">
          <div className="mb-3 font-semibold text-slate-900 dark:text-slate-100">Signature captured</div>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-2 overflow-hidden">
            <img
              src={signatureUrl}
              alt="Customer signature"
              className="h-auto w-full"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
        <button type="button"
          onClick={() => {
            setHasSignature(false)
            setSignatureUrl(null)
            setShowCanvas(true)
          }}
          className="relative mt-4 h-11 w-full rounded-2xl border border-slate-200 bg-white/70 font-semibold text-slate-800 backdrop-blur transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:bg-slate-800/60"
        >
          Recapture Signature
        </button>
      </div>
    )
  }

  // Empty state
  if (!showCanvas) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(circle_at_30%_0%,rgba(34,211,238,0.12),transparent_55%)] dark:opacity-80 dark:[background:radial-gradient(circle_at_30%_0%,rgba(34,211,238,0.16),transparent_55%)]" />
        <div className="relative mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Customer Signature</h3>
        </div>
        <div className="relative text-center py-6">
          <p className="mb-4 text-slate-600 dark:text-slate-300">No signature captured yet</p>
          <button type="button"
            onClick={() => setShowCanvas(true)}
            className="group relative h-12 w-full overflow-hidden rounded-2xl font-semibold text-white transition-opacity active:scale-[0.98]"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 opacity-90 transition-opacity group-hover:opacity-100 dark:from-cyan-500 dark:to-blue-500" />
            <span className="absolute inset-0 opacity-50 [background:radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.35),transparent_55%)]" />
            <span className="relative inline-flex items-center justify-center gap-2">Capture Signature</span>
          </button>
        </div>
      </div>
    )
  }

  // Canvas state
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(circle_at_30%_0%,rgba(34,211,238,0.12),transparent_55%)] dark:opacity-80 dark:[background:radial-gradient(circle_at_30%_0%,rgba(34,211,238,0.16),transparent_55%)]" />
      <div className="relative mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Signature</h3>
      </div>

      <div className="relative space-y-4">
        {/* Signature Canvas */}
        <div className="border-2 border-dashed border-slate-600 rounded-xl overflow-hidden bg-slate-900">
          <canvas
            ref={canvasRef}
            width={350}
            height={180}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full cursor-crosshair"
            style={{ touchAction: 'none' }}
          />
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button type="button"
            onClick={() => {
              clearSignature()
              setShowCanvas(false)
            }}
            className="h-11 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/70 font-semibold text-slate-800 backdrop-blur transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:bg-slate-800/60"
          >
            Cancel
          </button>

          <button type="button"
            onClick={clearSignature}
            className="h-11 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/70 font-semibold text-slate-800 backdrop-blur transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:bg-slate-800/60"
          >
            Clear
          </button>
        </div>

        <button type="button"
          onClick={handleSave}
          disabled={saving}
          className="group relative h-12 w-full overflow-hidden rounded-2xl font-semibold text-white transition-opacity active:scale-[0.98] disabled:opacity-50"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 opacity-90 transition-opacity group-hover:opacity-100 dark:from-cyan-500 dark:to-blue-500" />
          <span className="absolute inset-0 opacity-50 [background:radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.35),transparent_55%)]" />
          {saving ? (
            <div className="relative h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            null
          )}
          <span className="relative">Save Signature</span>
        </button>
      </div>
    </div>
  )
}
