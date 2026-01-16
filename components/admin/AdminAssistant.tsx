'use client'

import { useState } from 'react'
import { FileText, BarChart3, Users, Paperclip, Image as ImageIcon, Mic, Send } from 'lucide-react'

interface AdminAssistantProps {
  userName?: string
}

export default function AdminAssistant({ userName = 'Admin' }: AdminAssistantProps) {
  const [message, setMessage] = useState('')
  const maxLength = 300

  const quickActions = [
    { label: 'Create a job', icon: FileText },
    { label: 'Get reports', icon: BarChart3 },
    { label: 'Manage techs', icon: Users },
  ]

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-3xl)',
        padding: '32px 24px',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Decorative Sphere */}
      <div
        className="gradient-orb-blue"
        style={{
          width: '140px',
          height: '140px',
          borderRadius: 'var(--radius-full)',
          marginBottom: 'var(--spacing-6)',
        }}
      />

      {/* Welcome Text */}
      <h2 style={{
        fontSize: 'var(--text-4xl)',
        fontWeight: 'var(--font-bold)',
        color: 'var(--gray-900)',
        textAlign: 'center',
        marginBottom: 'var(--spacing-2)',
      }}>
        Welcome, {userName}
      </h2>

      <p style={{
        fontSize: 'var(--text-xl)',
        color: 'var(--gray-500)',
        textAlign: 'center',
        marginBottom: 'var(--spacing-6)',
      }}>
        What can I help with today?
      </p>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-2 justify-center mb-5">
        {quickActions.map((action, idx) => (
          <button
            key={idx}
            style={{
              height: 'var(--button-md)',
              padding: '8px 14px',
              background: 'var(--bg-card)',
              border: '1px solid var(--gray-200)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-1)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-medium)',
              color: 'var(--gray-700)',
              transition: 'var(--transition-base)',
            }}
            className="hover:bg-[#F9FAFB] hover:border-[#D1D5DB] hover:-translate-y-[1px]"
          >
            <action.icon style={{ width: 'var(--icon-sm)', height: 'var(--icon-sm)', color: 'var(--gray-600)' }} />
            {action.label}
          </button>
        ))}
      </div>

      {/* Chat Input */}
      <div
        style={{
          width: '100%',
          border: '1px solid var(--gray-200)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--spacing-3)',
          background: 'var(--bg-card)',
          transition: 'var(--transition-base)',
        }}
        className="focus-within:border-[#3B82F6]"
      >
        {/* Input Field */}
        <input
          type="text"
          placeholder="Ask me anything"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
          style={{
            border: 'none',
            background: 'transparent',
            width: '100%',
            fontSize: 'var(--text-md)',
            color: 'var(--gray-900)',
            outline: 'none',
            marginBottom: 'var(--spacing-2)',
          }}
          className="placeholder:text-[#9CA3AF]"
        />

        {/* Toolbar */}
        <div
          style={{
            paddingTop: 'var(--spacing-2)',
            borderTop: '1px solid var(--gray-100)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Left Buttons */}
          <div className="flex gap-2">
            {/* Attach File */}
            <button
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--gray-50)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition-fast)',
              }}
              className="hover:bg-[#E5E7EB]"
            >
              <Paperclip style={{ width: 'var(--icon-sm)', height: 'var(--icon-sm)', color: 'var(--gray-600)' }} />
            </button>

            {/* Create/Image Button */}
            <button
              style={{
                height: '32px',
                padding: '6px 12px',
                background: 'var(--gray-100)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-1)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-medium)',
                color: 'var(--gray-700)',
                transition: 'var(--transition-fast)',
              }}
              className="hover:bg-[#E5E7EB]"
            >
              <ImageIcon style={{ width: 'var(--icon-xs)', height: 'var(--icon-xs)' }} />
              Create
            </button>

            {/* Voice Input */}
            <button
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-full)',
                background: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition-fast)',
              }}
              className="hover:bg-[#F9FAFB]"
            >
              <Mic style={{ width: 'var(--icon-sm)', height: 'var(--icon-sm)', color: 'var(--gray-600)' }} />
            </button>
          </div>

          {/* Right - Character Counter */}
          <div className="flex items-center gap-3">
            <span style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-medium)',
              color: 'var(--gray-400)',
            }}>
              {message.length}/{maxLength}
            </span>

            {/* Send Button */}
            <button
              disabled={!message.trim()}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-full)',
                background: message.trim() ? 'var(--gray-900)' : 'var(--gray-200)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition-fast)',
                cursor: message.trim() ? 'pointer' : 'not-allowed',
              }}
              className={message.trim() ? 'hover:scale-110' : ''}
            >
              <Send style={{
                width: 'var(--icon-sm)',
                height: 'var(--icon-sm)',
                color: message.trim() ? 'white' : 'var(--gray-400)',
              }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
