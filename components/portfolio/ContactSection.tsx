'use client'

import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Github, Linkedin, ArrowUpRight } from 'lucide-react'

const contactItems = [
  {
    icon: Mail,
    label: 'Email',
    value: 'as.golf2005@gmail.com',
    href: 'mailto:as.golf2005@gmail.com',
  },
  {
    icon: Phone,
    label: 'Phone',
    value: '(413) 205-4090',
    href: 'tel:+14132054090',
  },
  {
    icon: MapPin,
    label: 'Location',
    value: 'Springfield, MA',
    href: null,
  },
]

const socialLinks = [
  {
    icon: Linkedin,
    label: 'LinkedIn',
    href: 'https://linkedin.com/in/aryan-sharma',
    username: 'aryan-sharma',
  },
  {
    icon: Github,
    label: 'GitHub',
    href: 'https://github.com/asgolf2005',
    username: 'asgolf2005',
  },
]

export default function ContactSection() {
  return (
    <>
      <section id="contact" className="py-24 bg-slate-900">
        <div className="max-w-6xl mx-auto px-6">
          {/* Section label */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xs font-semibold tracking-[0.2em] uppercase text-amber-500 mb-4"
          >
            Contact
          </motion.p>

          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left: CTA */}
            <div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl font-display text-white mb-6 leading-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                LET&apos;S WORK TOGETHER
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-slate-400 leading-relaxed mb-8 text-lg"
              >
                Whether you have a project in mind, a role to fill, or just want to connect — I&apos;m always open to a conversation. Let&apos;s see what we can build.
              </motion.p>

              <motion.a
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.25 }}
                href="mailto:as.golf2005@gmail.com"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 text-sm font-bold rounded-xl hover:bg-amber-50 transition-all duration-200 shadow-lg hover:shadow-xl group"
              >
                Send me an email
                <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </motion.a>
            </div>

            {/* Right: Contact details */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              {/* Contact items */}
              <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                {contactItems.map((item, i) => {
                  const Icon = item.icon
                  const content = (
                    <div
                      className={`flex items-center gap-4 px-6 py-4 ${i < contactItems.length - 1 ? 'border-b border-white/10' : ''}`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Icon size={16} className="text-white/70" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">{item.label}</p>
                        <p className="text-white text-sm font-medium">{item.value}</p>
                      </div>
                    </div>
                  )
                  return item.href ? (
                    <a key={item.label} href={item.href} className="block hover:bg-white/5 transition-colors">
                      {content}
                    </a>
                  ) : (
                    <div key={item.label}>{content}</div>
                  )
                })}
              </div>

              {/* Social links */}
              <div className="grid grid-cols-2 gap-4">
                {socialLinks.map((social) => {
                  const Icon = social.icon
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-4 hover:bg-white/10 hover:border-white/20 transition-all duration-200 group"
                    >
                      <Icon size={18} className="text-white/60 group-hover:text-white transition-colors" />
                      <div>
                        <p className="text-xs text-slate-500">{social.label}</p>
                        <p className="text-white text-sm font-medium">/{social.username}</p>
                      </div>
                    </a>
                  )
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} Aryan Sharma. Built with Next.js & Tailwind CSS.
          </p>
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => {
              const Icon = social.icon
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-600 hover:text-slate-400 transition-colors"
                  aria-label={social.label}
                >
                  <Icon size={15} />
                </a>
              )
            })}
          </div>
        </div>
      </footer>
    </>
  )
}
