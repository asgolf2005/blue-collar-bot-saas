'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight, ExternalLink } from 'lucide-react'

const projects = [
  {
    name: 'Blue Collar Bot',
    tagline: 'SaaS CRM & AI Receptionist for Trade Businesses',
    description:
      'A full-stack SaaS platform providing AI-powered phone receptionist capabilities, job management, customer CRM, and mobile technician tools for trade businesses — plumbers, electricians, HVAC specialists, and more.',
    stack: ['Next.js', 'TypeScript', 'Supabase', 'OpenAI', 'ElevenLabs', 'Twilio', 'Stripe'],
    link: '#',
    status: 'Live',
    color: 'blue',
    highlights: [
      'AI voice receptionist for automated booking',
      'Real-time job tracking and technician dispatch',
      'Customer portal with invoice management',
      'Multi-tenant SaaS with Stripe billing',
    ],
  },
  {
    name: 'Blue Savings Bot',
    tagline: 'Intelligent Savings & Financial Automation Tool',
    description:
      'An AI-powered savings and financial management bot designed to help users automate their savings goals, track spending patterns, and make smarter financial decisions through intelligent automation.',
    stack: ['Next.js', 'TypeScript', 'Supabase', 'OpenAI', 'n8n'],
    link: '#',
    status: 'In Development',
    color: 'amber',
    highlights: [
      'Automated savings goal tracking',
      'AI-powered financial insights',
      'Smart spending pattern analysis',
      'Automated transaction categorisation',
    ],
  },
  {
    name: 'Star Smiles Patient Portal',
    tagline: 'AI-Powered Dental Practice Digital Transformation',
    description:
      'A comprehensive 13-page patient-facing Next.js website with AI voice booking, online appointment management, a patient portal, Google Sheets-integrated feedback system, and automated communication workflows.',
    stack: ['Next.js', 'ElevenLabs', 'n8n', 'Supabase', 'Google Sheets'],
    link: '#',
    status: 'Deployed',
    color: 'green',
    highlights: [
      'AI phone booking via ElevenLabs voice agents',
      'Online patient portal with appointment history',
      'Automated confirmation & cancellation flows',
      'Review routing and feedback collection',
    ],
  },
]

const statusColors: Record<string, string> = {
  Live: 'bg-green-50 text-green-700 border-green-200',
  'In Development': 'bg-amber-50 text-amber-700 border-amber-200',
  Deployed: 'bg-blue-50 text-blue-700 border-blue-200',
}

const accentColors: Record<string, string> = {
  blue: 'border-t-blue-800',
  amber: 'border-t-amber-500',
  green: 'border-t-green-600',
}

export default function ProjectsSection() {
  return (
    <section id="projects" className="py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-xs font-semibold tracking-[0.2em] uppercase text-amber-600 mb-4"
        >
          Projects
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-display text-slate-900 mb-4"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          THINGS I&apos;VE BUILT
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="text-slate-500 mb-14 max-w-xl"
        >
          Real-world products built from scratch — each solving a specific business problem with modern technology.
        </motion.p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, i) => (
            <motion.div
              key={project.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              whileHover={{ y: -4 }}
              className={`bg-white rounded-2xl border border-slate-200 border-t-4 ${accentColors[project.color]} overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300`}
            >
              <div className="p-6 flex-1">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-lg font-bold text-slate-900">{project.name}</h3>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${statusColors[project.status]}`}>
                    {project.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-blue-700 mb-3">{project.tagline}</p>
                <p className="text-sm text-slate-600 leading-relaxed mb-5">{project.description}</p>

                {/* Highlights */}
                <ul className="space-y-1.5 mb-6">
                  {project.highlights.map((h, j) => (
                    <li key={j} className="text-xs text-slate-500 flex gap-2 items-start">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">✓</span>
                      {h}
                    </li>
                  ))}
                </ul>

                {/* Stack tags */}
                <div className="flex flex-wrap gap-1.5">
                  {project.stack.map((tech) => (
                    <span
                      key={tech}
                      className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="px-6 pb-6">
                <a
                  href={project.link}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-blue-700 transition-colors group"
                >
                  {project.link === '#' ? (
                    <>
                      <span className="text-slate-400">Link coming soon</span>
                      <ExternalLink size={14} className="text-slate-300" />
                    </>
                  ) : (
                    <>
                      View Project
                      <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </>
                  )}
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
