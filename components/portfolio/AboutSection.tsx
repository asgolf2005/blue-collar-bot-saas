'use client'

import { motion } from 'framer-motion'

const stats = [
  { value: '3.8', label: 'GPA', sub: 'Economics & Finance' },
  { value: 'NCAA', label: 'D1 Golfer', sub: 'AIC Varsity Team' },
  { value: '+2.0', label: 'Golf Handicap', sub: 'Top-tier amateur' },
  { value: '500+', label: 'Clients Served', sub: 'Across ventures' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: 'easeOut' },
  }),
}

export default function AboutSection() {
  return (
    <section id="about" className="py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section label */}
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={0}
          variants={fadeUp}
          className="text-xs font-semibold tracking-[0.2em] uppercase text-amber-600 mb-4"
        >
          About
        </motion.p>

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Bio */}
          <div>
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={1}
              variants={fadeUp}
              className="text-4xl md:text-5xl font-display text-slate-900 mb-8 leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              BUILDER. ATHLETE. ENTREPRENEUR.
            </motion.h2>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={2}
              variants={fadeUp}
              className="space-y-4 text-slate-600 leading-relaxed"
            >
              <p>
                I&apos;m a first-year Economics and Finance student-athlete at American International College (GPA 3.8) with a multidisciplinary background spanning full-stack web development, business operations, and elite-level competitive golf.
              </p>
              <p>
                I bring six years of real-world professional and entrepreneurial experience — including leading a complete AI-powered digital transformation for a healthcare practice, founding and scaling a product-resale business to 500+ clients, and competing at national amateur standard.
              </p>
              <p>
                Fluent in English and Hindi, with a track record of academic distinction, formal community leadership, and the work ethic developed through years of high-performance sport. I&apos;m seeking roles in technology, business, marketing, or golf where immediate, measurable contribution is possible.
              </p>
            </motion.div>

            {/* Languages */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={3}
              variants={fadeUp}
              className="mt-8 flex gap-3"
            >
              {['English (Native)', 'Hindi (Fluent)'].map((lang) => (
                <span
                  key={lang}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-full text-slate-600"
                >
                  {lang}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i + 2}
                variants={fadeUp}
                className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all duration-200"
              >
                <div
                  className="text-3xl md:text-4xl font-display text-slate-900 mb-1"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {stat.value}
                </div>
                <div className="text-sm font-semibold text-slate-800 mb-0.5">{stat.label}</div>
                <div className="text-xs text-slate-400">{stat.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
