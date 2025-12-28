import Hero from '../components/home/Hero'
import About from '../components/home/About'
import Skills from '../components/home/Skills'
import Expertise from '../components/home/Expertise'
import Work from '../components/home/Work'
import Education from '../components/home/Education'
import Contact from '../components/home/Contact'

function Home() {
  return (
    <div className="home-page">
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
