import PortfolioNav from '@/components/portfolio/PortfolioNav'
import HeroSection from '@/components/portfolio/HeroSection'
import AboutSection from '@/components/portfolio/AboutSection'
import ExperienceSection from '@/components/portfolio/ExperienceSection'
import ProjectsSection from '@/components/portfolio/ProjectsSection'
import SkillsSection from '@/components/portfolio/SkillsSection'
import AthleticsSection from '@/components/portfolio/AthleticsSection'
import EducationSection from '@/components/portfolio/EducationSection'
import ContactSection from '@/components/portfolio/ContactSection'

export const metadata = {
  title: 'Aryan Sharma — Full-Stack Developer & Entrepreneur',
  description:
    'Portfolio of Aryan Sharma — Economics & Finance student-athlete, full-stack developer, entrepreneur, and NCAA college golfer based in Springfield, MA.',
}

export default function HomePage() {
  return (
    <main className="bg-white text-slate-900">
      <PortfolioNav />
      <HeroSection />
      <AboutSection />
      <ExperienceSection />
      <ProjectsSection />
      <SkillsSection />
      <AthleticsSection />
      <EducationSection />
      <ContactSection />
    </main>
  )
}
