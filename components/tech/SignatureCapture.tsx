'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PenTool, X, Check, RotateCcw, CheckCircle, FileSignature } from 'lucide-react'
import Image from 'next/image'

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
      <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <h3 className="font-semibold text-white">Customer Signature</h3>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-white">Signature Captured</span>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-2 overflow-hidden">
            <Image
              src={signatureUrl}
              alt="Customer signature"
              width={600}
              height={200}
              className="w-full h-auto"
              sizes="100vw"
            />
          </div>
        </div>
        <button
          onClick={() => {
            setHasSignature(false)
            setSignatureUrl(null)
            setShowCanvas(true)
          }}
          className="w-full mt-4 h-11 flex items-center justify-center gap-2 bg-slate-700/50 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-600 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Recapture Signature
        </button>
      </div>
    )
  }

  // Empty state
  if (!showCanvas) {
    return (
      <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <PenTool className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-white">Customer Signature</h3>
        </div>
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-600">
            <FileSignature className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-400 mb-4">No signature captured yet</p>
          <button
            onClick={() => setShowCanvas(true)}
            className="w-full h-12 flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] active:scale-[0.98]"
          >
            <PenTool className="w-5 h-5" />
            Capture Signature
          </button>
        </div>
      </div>
    )
  }

  // Canvas state
  return (
    <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <PenTool className="w-5 h-5 text-cyan-400" />
        <h3 className="font-semibold text-white">Capture Signature</h3>
      </div>

      <div className="space-y-4">
        {/* Instructions */}
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
          <p className="text-sm text-cyan-400">
            Please ask the customer to sign below to confirm job completion
          </p>
        </div>

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
        <p className="text-xs text-slate-500 text-center">
          Sign with finger or stylus
        </p>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              clearSignature()
              setShowCanvas(false)
            }}
            className="h-11 flex items-center justify-center gap-2 bg-slate-700/50 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-600 transition-all"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>

          <button
            onClick={clearSignature}
            className="h-11 flex items-center justify-center gap-2 bg-slate-700/50 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-600 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Clear
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-5 h-5" />
          )}
          Save Signature
        </button>
      </div>
    </div>
  )
}
