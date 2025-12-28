const Work = () => {
  const experiences = [
    {
      company: 'VoltronData',
      role: 'Staff Software Engineer',
      date: '2021 — Present',
      location: 'Remote',
      side: 'left',
      details: [
        'Designed physical execution abstractions with spill paths across GPU HBM → RAM → Disk',
        'Shaped a distributed count-distinct algorithm delivering ~5× speedup at cluster scale',
        'Enhanced Apache Arrow codebase contributing to C++ and Python implementations',
        'Proposed and implemented core architectural improvements to the Theseus engine'
      ]
    },
    {
      company: 'Quansight',
      role: 'Senior C++ Software Engineer',
      date: '2020 — 2021',
      location: 'Remote',
      side: 'right',
      details: [
        'Shipped advanced numerical and deep-learning features in PyTorch',
        'Built GPU-accelerated sparse-tensor kernels for efficient large-scale processing',
        'Optimized low-level ATen operators eliminating inefficient memory/compute patterns'
      ]
    },
    {
      company: 'BlazingDB Inc.',
      role: 'Senior Software Engineer',
      date: '2018 — 2020',
      location: 'Lima, Peru',
      side: 'left',
      details: [
        'Designed the original execution model combining async executors for compute, comms, and memory/spill',
        'Built UCX-based multipart GPU messaging layer increasing network throughput',
        'Led physical plan + cache layers of pull-based execution engine'
      ]
    },
    {
      company: 'Laboratoria',
      role: 'Software Engineer & Bootcamp Teacher',
      date: '2017 — 2018',
      location: 'Lima, Peru',
      side: 'right',
      details: [
        'Led teaching and instructional role as a Bootcamp teacher, guiding and developing talent',
        'Led the development of talento.laboratoria.la, connecting 300+ companies with graduates'
      ]
    },
    {
      company: 'Northern World Entertainment',
      role: 'Software Engineer',
      date: '2015 — 2016',
      location: 'Toronto, Canada',
      side: 'left',
      details: [
        'Contributed to Holographic Mixed Reality Apps for the Microsoft HoloLens',
        'Successfully launched applications on both iOS and Android platforms'
      ]
    }
  ]

  return (
    <section id="work">
      <div className="work-container">
        <div className="section-header">
          <p className="section-label">Experience</p>
          <h2 className="section-title">Professional <em>Journey</em></h2>
        </div>
        <div className="timeline-alt">
          {experiences.map((exp, index) => (
            <article key={index} className={`timeline-card ${exp.side}`}>
              {exp.side === 'right' && <div className="timeline-dot"></div>}
              <div className="card-content">
                <div className="card-meta">
                  <span className="card-date">{exp.date}</span>
                  <span className="card-location">{exp.location}</span>
                </div>
                <h3 className="card-company">{exp.company}</h3>
                <p className="card-role">{exp.role}</p>
                <ul className="card-details">
                  {exp.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              </div>
              {exp.side === 'left' && <div className="timeline-dot"></div>}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Work
