'use client'

import { motion } from 'framer-motion'

const achievements = [
  { value: '+2.0', label: 'Handicap Index', sub: 'Top-tier amateur standard' },
  { value: '3×', label: 'Victorian State Rep', sub: 'National-level amateur competition' },
  { value: '50+', label: 'Tournament Wins', sub: 'Junior & amateur circuits in Australia' },
  { value: 'NCAA', label: 'D1 Varsity Golfer', sub: 'AIC Yellow Jackets — 2025–Present' },
]

export default function AthleticsSection() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-xs font-semibold tracking-[0.2em] uppercase text-amber-600 mb-4"
        >
          Athletics
        </motion.p>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text */}
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-display text-slate-900 mb-6 leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              GOLF — COMPETING AT THE HIGHEST LEVEL
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-slate-600 leading-relaxed mb-6"
            >
              Competing as an NCAA D1 student-athlete at American International College while maintaining a full academic load and a 3.8 GPA. Golf has shaped my work ethic, competitive mindset, and ability to perform under pressure.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25 }}
              className="text-slate-600 leading-relaxed mb-8"
            >
              A former Golf Team Captain at Haileybury College, I led team operations, managed inter-school competition strategy, and mentored junior players — developing the same leadership skills I bring to every professional endeavour.
            </motion.p>

            {/* Career highlights list */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              {[
                '3× Victorian State Team Representative — selected for national-level amateur competition across three consecutive years',
                '50+ competitive tournament victories across junior and amateur circuits in Australia',
                'Current handicap index: +2.0 — placing among the top tier of Australian amateur golfers',
                'Former Golf Team Captain at Haileybury College — led team operations and mentored junior players',
              ].map((point, i) => (
                <div key={i} className="flex gap-3 text-sm text-slate-600">
                  <span className="text-amber-500 mt-0.5 flex-shrink-0">▸</span>
                  {point}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {achievements.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-amber-200 hover:shadow-md transition-all duration-200 text-center"
              >
                <div
                  className="text-3xl md:text-4xl font-display text-amber-600 mb-1"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {item.value}
                </div>
                <div className="text-sm font-semibold text-slate-800 mb-0.5">{item.label}</div>
                <div className="text-xs text-slate-400">{item.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
