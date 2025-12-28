const Education = () => {
  const education = [
    {
      degree: 'PhD in Computer Science',
      school: 'Universidad Nacional de San Agustin',
      year: '2013 — 2017 • Arequipa, Peru',
      honor: 'Summa cum laude'
    },
    {
      degree: 'M.Cs in Computer Science',
      school: 'Sao Paulo University',
      year: '2010 — 2012 • Sao Paulo, Brazil',
      honor: 'Maximum Distinction'
    },
    {
      degree: 'B.S. in Computer Science',
      school: 'Universidad Nacional de San Agustin',
      year: '2004 — 2009 • Arequipa, Peru',
      honor: 'Ranked 1st in Engineering Class'
    }
  ]

  return (
    <section id="education">
      <div className="education-container">
        <div className="section-header">
          <p className="section-label">Education</p>
          <h2 className="section-title">Academic <em>Background</em></h2>
        </div>
        <div className="education-grid">
          {education.map((edu, index) => (
            <div key={index} className="education-card">
              <h3>{edu.degree}</h3>
              <p className="school">{edu.school}</p>
              <p className="year">{edu.year}</p>
              <p className="honor">{edu.honor}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Education
