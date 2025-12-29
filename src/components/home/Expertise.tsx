const Expertise = () => {
  return (
    <section id="expertise">
      <div className="expertise-container">
        <div className="section-header">
          <p className="section-label">Services</p>
          <h2 className="section-title">Areas of <em>Expertise</em></h2>
        </div>
        <div className="expertise-grid">
          <article className="expertise-item">
            <div className="expertise-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" />
                <path d="M9 1v3" />
                <path d="M15 1v3" />
                <path d="M9 20v3" />
                <path d="M15 20v3" />
                <path d="M20 9h3" />
                <path d="M20 14h3" />
                <path d="M1 9h3" />
                <path d="M1 14h3" />
              </svg>
            </div>
            <div className="expertise-content">
              <h3>GPU-Accelerated Systems</h3>
              <p>Design and implementation of high-performance GPU computing solutions that push hardware to its limits for real-world applications.</p>
            </div>
          </article>

          <article className="expertise-item">
            <div className="expertise-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14a9 3 0 0 0 18 0V5" />
                <path d="M3 12a9 3 0 0 0 18 0" />
              </svg>
            </div>
            <div className="expertise-content">
              <h3>Query Engine Architecture</h3>
              <p>Building petabyte-scale query engines with advanced memory management, distributed execution, and optimal performance characteristics.</p>
            </div>
          </article>

          <article className="expertise-item">
            <div className="expertise-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div className="expertise-content">
              <h3>Performance Optimization</h3>
              <p>Deep profiling and optimization of system bottlenecks, from I/O and messaging to kernel concurrency and multi-node scalability.</p>
            </div>
          </article>

          <article className="expertise-item">
            <div className="expertise-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v4" />
                <path d="M12 19v4" />
                <path d="M5.64 5.64 8.17 8.17" />
                <path d="M15.83 15.83 18.36 18.36" />
                <path d="M1 12h4" />
                <path d="M19 12h4" />
                <path d="M5.64 18.36 8.17 15.83" />
                <path d="M15.83 8.17 18.36 5.64" />
              </svg>
            </div>
            <div className="expertise-content">
              <h3>Technical Leadership</h3>
              <p>Guiding teams through complex architectural decisions, code reviews, and establishing best practices for high-performance systems.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

export default Expertise
