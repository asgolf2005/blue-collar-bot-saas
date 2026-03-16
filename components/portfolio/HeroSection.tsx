'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDown, Mail } from 'lucide-react'

const subtitles = [
  'Full-Stack Developer',
  'Entrepreneur',
  'NCAA College Golfer',
  'Australian in America',
]

export default function HeroSection() {
  const [subtitleIndex, setSubtitleIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setSubtitleIndex((prev) => (prev + 1) % subtitles.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  const scrollToProjects = () => {
    document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToContact = () => {
    document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-white">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(15, 23, 42, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15, 23, 42, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Soft gradient overlay bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />

      {/* Accent blob top-right */}
      <div
        className="absolute top-20 right-10 w-72 h-72 rounded-full opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #1e40af 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Location badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-500 text-xs font-medium tracking-widest uppercase mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Springfield, MA · Open to Opportunities
        </motion.div>

        {/* Big name */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-[clamp(4rem,14vw,10rem)] leading-none font-display tracking-wider text-slate-900 mb-4"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          ARYAN
          <br />
          <span className="text-blue-800">SHARMA</span>
        </motion.h1>

        {/* Animated subtitle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="h-10 flex items-center justify-center mb-6"
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={subtitleIndex}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="text-xl md:text-2xl text-amber-600 font-semibold tracking-wide"
            >
              {subtitles[subtitleIndex]}
            </motion.span>
          </AnimatePresence>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Economics & Finance @ AIC · GPA 3.8 · NCAA Golfer · Builder of AI-powered products
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.75 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <button
            onClick={scrollToProjects}
            className="px-7 py-3 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            View Projects
          </button>
          <button
            onClick={scrollToContact}
            className="px-7 py-3 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 flex items-center gap-2"
          >
            <Mail size={15} />
            Get in Touch
          </button>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-400"
      >
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ArrowDown size={16} />
        </motion.div>
      </motion.div>
    </section>
  )
}
