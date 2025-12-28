import { useEffect, useRef } from 'react'
import Hero from '../components/home/Hero'
import About from '../components/home/About'
import Skills from '../components/home/Skills'
import Expertise from '../components/home/Expertise'
import Work from '../components/home/Work'
import Education from '../components/home/Education'
import Contact from '../components/home/Contact'

function Home() {
  const homeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    // Observe all sections except hero
    const sections = homeRef.current?.querySelectorAll('section:not(#hero)')
    sections?.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [])

  return (
    <div className="home-page" ref={homeRef}>
      <Hero />
      <About />
      <Skills />
      <Expertise />
      <Work />
      <Education />
      <Contact />
    </div>
  )
}

export default Home
