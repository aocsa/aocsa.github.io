import { useState, FormEvent } from 'react'

interface ContactProps {
  isPage?: boolean
}

const Contact = ({ isPage = false }: ContactProps) => {
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormStatus('submitting')

    const form = e.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch('https://formspree.io/f/mykgrppj', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      })

      if (response.ok) {
        setFormStatus('success')
        form.reset()
      } else {
        setFormStatus('error')
      }
    } catch {
      setFormStatus('error')
    }
  }

  return (
    <section id="contact" className={isPage ? 'contact-page' : ''}>
      <div className="contact-container">
        <div className="contact-header">
          <p className="contact-label">
            <span className="label-line"></span>
            Contact
            <span className="label-line"></span>
          </p>
          <h3 className="contact-title">Let's <em>Connect</em></h3>
          <p className="contact-description">
            I'm deeply passionate about data structures and algorithms, especially how they evolve and scale. I enjoy solving the complex puzzles of system optimization.
          </p>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input type="text" id="name" name="name" placeholder="Your name" required />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" name="email" placeholder="your@email.com" required />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <input type="text" id="subject" name="subject" placeholder="Project inquiry, collaboration, etc." />
          </div>
          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea id="message" name="message" rows={6} placeholder="Tell me about your project or opportunity..." required></textarea>
          </div>
          <button type="submit" className="submit-btn" disabled={formStatus === 'submitting'}>
            {formStatus === 'submitting' ? 'Sending...' : 'Send Message'}
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2 11 13" />
              <path d="M22 2 15 22 11 13 2 9 22 2z" />
            </svg>
          </button>
          {formStatus === 'success' && <p className="form-success">Message sent successfully!</p>}
          {formStatus === 'error' && <p className="form-error">Failed to send message. Please try again.</p>}
        </form>

        <div className="contact-divider"></div>

        <div className="contact-direct">
          <p>Or reach out directly at</p>
          <a href="mailto:aocsa.cs@gmail.com" className="contact-email">aocsa.cs at gmail.com</a>
        </div>
      </div>
    </section>
  )
}

export default Contact
