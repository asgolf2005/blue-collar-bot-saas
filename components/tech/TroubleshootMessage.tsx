'use client'

interface TroubleshootMessageProps {
  role: 'user' | 'assistant'
  content: string
}

export default function TroubleshootMessage({ role, content }: TroubleshootMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[92%] rounded-3xl px-4 py-3 text-sm shadow-sm ${
          isUser
            ? 'bg-slate-900 text-white dark:bg-slate-700'
            : 'border border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100'
        }`}
      >
        <p
          className={`mb-1 text-[11px] font-medium tracking-[0.06em] ${
            isUser ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {isUser ? 'You' : 'Assistant'}
        </p>
        <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
      </div>
    </div>
  )
}
