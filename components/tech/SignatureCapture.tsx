'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PenTool, X, Check, RotateCcw, CheckCircle } from 'lucide-react'

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
        ctx.fillStyle = '#f4f4f5'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.strokeStyle = '#3f3f46'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
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

    ctx.fillStyle = '#f4f4f5'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
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

  if (hasSignature && signatureUrl) {
    return (
      <div className="bg-surface-50/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-4">
        <div className="flex items-center mb-4">
          <PenTool className="w-5 h-5 text-muted mr-2" />
          <h2 className="font-semibold text-ink">Customer Signature</h2>
        </div>

        <div className="bg-surface-100 border border-surface-200 rounded-xl p-4">
          <div className="flex items-center justify-center mb-3">
            <CheckCircle className="w-5 h-5 text-success mr-2" />
            <span className="font-medium text-ink">Signature Captured</span>
          </div>
          <div className="bg-surface-50 border border-surface-200 rounded-xl p-2">
            <img
              src={signatureUrl}
              alt="Customer signature"
              className="w-full h-auto"
            />
          </div>
          <button
            onClick={() => {
              setHasSignature(false)
              setSignatureUrl(null)
              setShowCanvas(true)
            }}
            className="mt-3 w-full flex items-center justify-center py-2 px-4 bg-surface-50 text-muted font-medium rounded-xl hover:bg-surface-100 transition text-sm border border-surface-200"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Recapture Signature
          </button>
        </div>
      </div>
    )
  }

  if (!showCanvas) {
    return (
      <div className="bg-surface-50/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-4">
        <div className="flex items-center mb-4">
          <PenTool className="w-5 h-5 text-muted mr-2" />
          <h2 className="font-semibold text-ink">Customer Signature</h2>
        </div>

        <div className="text-center py-6">
          <PenTool className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted mb-4">No signature captured yet</p>
          <button
            onClick={() => setShowCanvas(true)}
            className="w-full flex items-center justify-center py-3 px-4 bg-primary text-white dark:text-midnight-950 font-medium rounded-xl hover:bg-primary/90 border border-primary/30 transition"
          >
            <PenTool className="w-5 h-5 mr-2" />
            Capture Signature
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-50/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-4">
      <div className="flex items-center mb-4">
        <PenTool className="w-5 h-5 text-muted mr-2" />
        <h2 className="font-semibold text-ink">Customer Signature</h2>
      </div>

      <div className="mb-4">
        <p className="text-sm text-surface-600 mb-3 bg-surface-100 border border-surface-200 rounded-xl p-3">
          Please ask the customer to sign below to confirm job completion
        </p>

        <div className="border-2 border-dashed border-surface-200 rounded-xl overflow-hidden bg-surface-50">
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
        <p className="text-xs text-muted mt-2 text-center">
          Sign above with finger or mouse
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <button
          onClick={() => {
            clearSignature()
            setShowCanvas(false)
          }}
          className="flex items-center justify-center py-2.5 px-4 bg-surface-50 text-muted font-medium rounded-xl hover:bg-surface-100 transition border border-surface-200"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </button>

        <button
          onClick={clearSignature}
          className="flex items-center justify-center py-2.5 px-4 bg-surface-50 text-muted font-medium rounded-xl hover:bg-surface-100 transition border border-surface-200"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Clear
        </button>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center py-3 px-4 bg-primary text-white dark:text-midnight-950 font-medium rounded-xl hover:bg-primary/90 border border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        <Check className="w-5 h-5 mr-2" />
        {saving ? 'Saving...' : 'Save Signature'}
      </button>
    </div>
  )
}
