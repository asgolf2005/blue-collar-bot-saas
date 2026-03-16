'use client'

import { motion } from 'framer-motion'

const skillGroups = [
  {
    category: 'Programming & Development',
    icon: '⌨️',
    skills: [
      'Next.js', 'React', 'TypeScript', 'JavaScript', 'Python',
      'HTML/CSS', 'SQL', 'Supabase', 'n8n', 'ElevenLabs', 'GitHub', 'Vercel',
    ],
  },
  {
    category: 'Design & E-Commerce',
    icon: '🎨',
    skills: ['Figma', 'Adobe Illustrator', 'Canva', 'Shopify'],
  },
  {
    category: 'Business & Marketing',
    icon: '📊',
    skills: [
      'Financial Analysis', 'Marketing Strategy', 'Business Process Automation',
      'CRM', 'Social Media Growth', 'Retail Operations', 'Inventory Management',
    ],
  },
  {
    category: 'Tools & Platforms',
    icon: '🛠',
    skills: ['Microsoft Office Suite', 'Google Workspace', 'Slack', 'Notion'],
  },
]

export default function SkillsSection() {
  return (
    <section id="skills" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-xs font-semibold tracking-[0.2em] uppercase text-amber-600 mb-4"
        >
          Skills
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-display text-slate-900 mb-16"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          WHAT I WORK WITH
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-8">
          {skillGroups.map((group, i) => (
            <motion.div
              key={group.category}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-slate-50 rounded-2xl p-6 border border-slate-200"
            >
              <div className="flex items-center gap-3 mb-5">
                <span className="text-xl">{group.icon}</span>
                <h3 className="text-sm font-bold text-slate-700 tracking-wide uppercase">
                  {group.category}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.skills.map((skill, j) => (
                  <motion.span
                    key={skill}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.05 + j * 0.03 }}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-700 font-medium hover:border-blue-300 hover:text-blue-700 transition-all duration-150 cursor-default"
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
