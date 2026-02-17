'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Mic, SendHorizontal } from '@/components/ui/icons'
import { showToast } from '@/lib/utils/toast'
import TroubleshootMessage from '@/components/tech/TroubleshootMessage'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface TroubleshootChatProps {
  jobId: string
}

interface TroubleshootResponse {
  success?: boolean
  reply?: string
  error?: string
}

const buildWelcomeMessage = (): ChatMessage => ({
  id: 'assistant-welcome',
  role: 'assistant',
  content:
    'Describe the symptom and I will return likely causes, step-by-step checks, safety warnings, and when to escalate.',
})

export default function TroubleshootChat({ jobId }: TroubleshootChatProps) {
  const storageKey = `tech_troubleshoot_chat_${jobId}`
  const [messages, setMessages] = useState<ChatMessage[]>([buildWelcomeMessage()])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { isSupported, isRecording, startRecording, stopRecording } = useVoiceRecorder({
    maxDurationMs: 60_000,
  })

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey)
      if (!stored) return

      const parsed = JSON.parse(stored) as ChatMessage[]
      if (!Array.isArray(parsed) || parsed.length === 0) return

      const sanitized = parsed
        .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
        .map((item) => ({
          id: typeof item.id === 'string' ? item.id : `${item.role}-${Date.now()}`,
          role: item.role,
          content: item.content.trim(),
        }))
        .filter((item) => item.content.length > 0)
        .slice(-40)

      if (sanitized.length > 0) {
        setMessages(sanitized)
      }
    } catch (error) {
      console.error('Failed to load troubleshooting history:', error)
    }
  }, [storageKey])

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(messages.slice(-40)))
    } catch (error) {
      console.error('Failed to persist troubleshooting history:', error)
    }
  }, [messages, storageKey])

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight
      }
    })
  }

  const autoResizeTextarea = () => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = '0px'
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
  }

  const sendMessage = async (messageText?: string) => {
    const outgoing = (messageText || input).trim()
    if (!outgoing || sending) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: outgoing,
    }

    const historyPayload = messages
      .filter((message) => message.id !== 'assistant-welcome')
      .map((message) => ({ role: message.role, content: message.content }))

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setSending(true)
    scrollToBottom()

    try {
      const response = await fetch('/api/ai/troubleshoot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          message: outgoing,
          history: historyPayload,
          persist: false,
        }),
      })

      const data = (await response.json()) as TroubleshootResponse
      if (!response.ok || !data.reply) {
        throw new Error(data.error || 'Troubleshooting request failed')
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.reply || 'No response generated.',
        },
      ])
      scrollToBottom()
    } catch (sendError) {
      console.error('Troubleshoot send failed:', sendError)
      showToast.error(sendError instanceof Error ? sendError.message : 'Troubleshoot request failed')
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: 'AI is unavailable right now. Continue with your manual diagnostic checklist.',
        },
      ])
      scrollToBottom()
    } finally {
      setSending(false)
    }
  }

  const toggleVoiceInput = async () => {
    if (transcribing || sending) return

    if (!isRecording) {
      const started = await startRecording()
      if (started) {
        showToast.info('Recording started. Tap the mic again to transcribe.')
      }
      return
    }

    setTranscribing(true)
    try {
      const blob = await stopRecording()
      if (!blob || blob.size === 0) {
        showToast.error('No voice input captured.')
        return
      }

      const formData = new FormData()
      const file = new File([blob], `troubleshoot-${Date.now()}.webm`, {
        type: blob.type || 'audio/webm',
      })
      formData.append('audio', file)
      formData.append('jobId', jobId)
      formData.append('mode', 'transcript')

      const response = await fetch('/api/ai/voice-notes', {
        method: 'POST',
        body: formData,
      })

      const data = (await response.json()) as { transcript?: string; error?: string }
      if (!response.ok) {
        throw new Error(data.error || 'Voice transcription failed')
      }

      const transcript = data.transcript?.trim()
      if (!transcript) {
        throw new Error('No transcript returned')
      }

      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
      showToast.success('Voice input added.')
      requestAnimationFrame(autoResizeTextarea)
    } catch (voiceError) {
      console.error('Voice transcription failed:', voiceError)
      showToast.error(voiceError instanceof Error ? voiceError.message : 'Voice transcription failed')
    } finally {
      setTranscribing(false)
    }
  }

  useEffect(() => {
    autoResizeTextarea()
  }, [input])

  return (
    <section className="animate-fade-in rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-elevation-1 dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Troubleshooting Assistant
        </h3>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          Ask for likely causes, checks, and when to escalate.
        </p>
      </div>

      <div
        ref={listRef}
        className="max-h-[24rem] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60"
      >
        {messages.map((message) => (
          <TroubleshootMessage key={message.id} role={message.role} content={message.content} />
        ))}
        {sending && (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-600 dark:text-slate-300" />
            <span>Generating troubleshooting guidance...</span>
          </div>
        )}
      </div>

      <form
        className="mt-3"
        onSubmit={(event) => {
          event.preventDefault()
          void sendMessage()
        }}
      >
        <div className="rounded-[30px] border border-slate-300 bg-white px-2 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-end gap-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Describe symptom, tests completed, and what you observed..."
              className="min-h-[48px] max-h-40 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-400"
              disabled={sending || transcribing}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  if (canSend) {
                    void sendMessage()
                  }
                }
              }}
            />

            <div className="mb-1 flex shrink-0 items-center gap-1 rounded-full border border-slate-300 bg-slate-100/90 p-1 dark:border-slate-700 dark:bg-slate-800/90">
              <button
                type="button"
                onClick={() => void toggleVoiceInput()}
                disabled={!isSupported || sending || transcribing}
                className={`inline-flex h-12 w-12 items-center justify-center rounded-full text-slate-700 transition-colors disabled:opacity-45 dark:text-slate-200 ${
                  isRecording
                    ? 'bg-red-500/20 text-red-200 hover:bg-red-500/30'
                    : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                aria-label={isRecording ? 'Stop voice dictation' : 'Start voice dictation'}
              >
                {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
              </button>

              <button
                type="submit"
                disabled={!canSend}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white transition-colors hover:bg-slate-800 disabled:opacity-45 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                aria-label="Send troubleshooting message"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {!isSupported && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Voice input is unavailable in this browser.
          </p>
        )}

        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setMessages([buildWelcomeMessage()])
              try {
                window.localStorage.removeItem(storageKey)
              } catch {
                // ignore storage cleanup errors
              }
            }}
            className="text-xs text-slate-500 underline underline-offset-4 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Clear Chat
          </button>
        </div>
      </form>
    </section>
  )
}
