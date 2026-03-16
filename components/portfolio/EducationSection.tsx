'use client'

import { motion } from 'framer-motion'

const education = [
  {
    degree: 'B.S. Economics & Finance',
    school: 'American International College',
    location: 'Springfield, MA',
    period: 'Expected May 2029',
    gpa: '3.8',
    details: [
      'Relevant Coursework: Macroeconomics, Principles of Marketing, English Composition, APEX 1005',
      'Competing as a Varsity Golfer on the NCAA Division I Yellow Jackets team',
    ],
  },
  {
    degree: 'Victorian Certificate of Education (VCE)',
    school: 'Haileybury College',
    location: 'Melbourne, VIC, Australia',
    period: 'Graduated 2024',
    details: [
      'Academic Leader — held formal school leadership position recognised for scholastic performance and contribution to school community.',
      'High Distinction results across core VCE subjects; awarded High Distinction in the Australian Mathematics Competition (AMC) and national English academic assessments.',
      'Golf Team Captain — led school team in competition and training, managing scheduling, player development, and team strategy.',
      'Completed structured public speaking programme (2015–2019), building strong presentation and communication foundations.',
    ],
  },
]

export default function EducationSection() {
  return (
    <section id="education" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-xs font-semibold tracking-[0.2em] uppercase text-amber-600 mb-4"
        >
          Education
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-display text-slate-900 mb-16"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          ACADEMIC BACKGROUND
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-8">
          {education.map((edu, i) => (
            <motion.div
              key={edu.school}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="bg-slate-50 rounded-2xl border border-slate-200 p-8 hover:border-blue-200 hover:shadow-sm transition-all duration-200"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="text-lg font-bold text-slate-900">{edu.degree}</h3>
                {edu.gpa && (
                  <div className="text-right flex-shrink-0">
                    <div className="text-xl font-display text-blue-800" style={{ fontFamily: 'var(--font-display)' }}>
                      {edu.gpa}
                    </div>
                    <div className="text-xs text-slate-400">GPA</div>
                  </div>
                )}
              </div>
              <p className="text-blue-700 font-semibold text-sm mb-0.5">{edu.school}</p>
              <p className="text-slate-400 text-xs mb-1">{edu.location}</p>
              <span className="inline-block text-xs font-medium text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1 mb-5">
                {edu.period}
              </span>

              {/* Details */}
              <ul className="space-y-2">
                {edu.details.map((detail, j) => (
                  <li key={j} className="text-sm text-slate-600 leading-relaxed flex gap-2">
                    <span className="text-amber-500 mt-1 flex-shrink-0 text-xs">▸</span>
                    {detail}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
