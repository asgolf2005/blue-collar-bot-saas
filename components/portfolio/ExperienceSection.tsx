'use client'

import { motion } from 'framer-motion'

const professionalExperience = [
  {
    role: 'Receptionist & Digital Transformation Lead',
    company: 'Star Smiles Dental Centre',
    location: 'Wheelers Hill, VIC',
    period: '2022 – 2024',
    bullets: [
      'Managed all front-desk operations for a high-volume dental practice across a two-year tenure: patient scheduling, intake coordination, insurance processing, and day-to-day administrative workflow.',
      'Designed and deployed a complete AI-powered phone booking system using ElevenLabs voice agents, n8n automation workflows, and a Supabase backend — replacing legacy manual booking and reducing administrative overhead.',
      'Built a 13-page patient-facing Next.js website with modern UI/UX, online booking, a patient portal, and a Google Sheets-integrated feedback and review routing system.',
      'Automated appointment confirmation, modification, and cancellation workflows end-to-end, improving patient communication and reducing no-show rates.',
    ],
  },
  {
    role: 'Pro Shop Associate',
    company: 'Spring Valley Golf Club',
    location: 'Victoria, Australia',
    period: '2021 – 2022',
    bullets: [
      'Delivered premium customer service to club members and guests, providing equipment advice, tee time management, and course information in a professional golf facility environment.',
      'Managed retail inventory including stock ordering, visual merchandising, and point-of-sale operations.',
      'Applied personal competitive golf expertise to advise customers on club fitting, equipment selection, and course strategy.',
    ],
  },
]

const ventures = [
  {
    role: 'Developer & Founder',
    company: 'Blue Collar Bot',
    location: 'SaaS Platform for Trade Businesses',
    period: '2024',
    bullets: [
      'Conceived and built a SaaS platform providing AI receptionist capabilities and mobile technician management tools to trade businesses (plumbing, electrical, HVAC).',
      'Architected using Next.js, TypeScript, and Supabase with automated client communication flows and AI-powered appointment handling.',
    ],
  },
  {
    role: 'Founder & Operator',
    company: 'Eazy Sellz',
    location: 'Sneaker & Streetwear Resale Business',
    period: '2019 – 2022',
    bullets: [
      'Founded and independently operated a product resale business specialising in limited-edition sneakers and streetwear, growing the brand to over 500 active clients and 7,000+ Instagram followers within three years.',
      'Managed end-to-end business functions including product sourcing, pricing strategy, inventory control, order fulfilment, and customer communications across platforms including StockX and eBay.',
      'Developed digital marketing and social media skills through organic audience growth, demonstrating early commercial acumen and self-directed entrepreneurship.',
    ],
  },
]

interface ExperienceItemProps {
  role: string
  company: string
  location: string
  period: string
  bullets: string[]
  index: number
}

function ExperienceItem({ role, company, location, period, bullets, index }: ExperienceItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative pl-8 pb-10 last:pb-0"
    >
      {/* Timeline dot + line */}
      <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-blue-800 border-2 border-white shadow-sm z-10" />
      <div className="absolute left-[5px] top-4 bottom-0 w-[2px] bg-slate-200 last:hidden" />

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 hover:border-blue-200 hover:shadow-sm transition-all duration-200">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div>
            <h4 className="font-semibold text-slate-900 text-base">{role}</h4>
            <p className="text-blue-700 text-sm font-medium mt-0.5">
              {company}{' '}
              <span className="text-slate-400 font-normal">— {location}</span>
            </p>
          </div>
          <span className="text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 whitespace-nowrap">
            {period}
          </span>
        </div>
        <ul className="space-y-1.5">
          {bullets.map((bullet, i) => (
            <li key={i} className="text-sm text-slate-600 leading-relaxed flex gap-2">
              <span className="text-amber-500 mt-1.5 flex-shrink-0">▸</span>
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  )
}

export default function ExperienceSection() {
  return (
    <section id="experience" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-xs font-semibold tracking-[0.2em] uppercase text-amber-600 mb-4"
        >
          Experience
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-display text-slate-900 mb-16"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          WORK & VENTURES
        </motion.h2>

        <div className="grid lg:grid-cols-2 gap-16">
          {/* Professional */}
          <div>
            <motion.h3
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-xs font-bold tracking-[0.15em] uppercase text-slate-400 mb-8"
            >
              Professional Experience
            </motion.h3>
            <div className="relative">
              {professionalExperience.map((item, i) => (
                <ExperienceItem key={i} {...item} index={i} />
              ))}
            </div>
          </div>

          {/* Ventures */}
          <div>
            <motion.h3
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-xs font-bold tracking-[0.15em] uppercase text-slate-400 mb-8"
            >
              Entrepreneurial Ventures
            </motion.h3>
            <div className="relative">
              {ventures.map((item, i) => (
                <ExperienceItem key={i} {...item} index={i} />
              ))}
            </div>
          </div>
        </div>

        {/* Leadership */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-16 p-6 bg-slate-50 rounded-2xl border border-slate-200"
        >
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-slate-400 mb-4">
            Leadership & Community
          </p>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h4 className="font-semibold text-slate-900">Community Board Member</h4>
              <p className="text-blue-700 text-sm font-medium mt-0.5">
                City of Melbourne Young People&apos;s Board{' '}
                <span className="text-slate-400 font-normal">— Melbourne, VIC</span>
              </p>
              <p className="text-sm text-slate-600 mt-2 max-w-2xl">
                Elected as a youth representative on the City of Melbourne&apos;s Young People&apos;s Board, contributing to community policy discussions and civic planning at a local government level. Represented the interests and perspectives of young people in formal council proceedings.
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400 bg-white border border-slate-200 rounded-full px-3 py-1 whitespace-nowrap">
              2023
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
