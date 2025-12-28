const Skills = () => {
  const skills = [
    'C++', 'CUDA', 'Python', 'PyTorch', 'Apache Arrow', 'RAPIDS/cuDF',
    'GPU Computing', 'Query Engines', 'Distributed Systems', 'Performance Optimization',
    'Numerical Computing', 'Deep Learning', 'Algorithm Design', 'Database Systems'
  ]

  return (
    <section id="skills">
      <div className="skills-container">
        <div className="section-header">
          <p className="section-label">Skills</p>
          <h2 className="section-title">Technical <em>Expertise</em></h2>
        </div>
        <div className="skills-grid">
          {skills.map((skill) => (
            <span key={skill} className="skill-badge">{skill}</span>
          ))}
        </div>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">10+</div>
            <div className="stat-label">Years Experience</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">56+</div>
            <div className="stat-label">Open Source PRs</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">PhD</div>
            <div className="stat-label">Computer Science</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">5×</div>
            <div className="stat-label">Performance Gains</div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Skills
