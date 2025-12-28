const About = () => {
  return (
    <section id="about">
      <div className="about-grid">
        <div className="section-header">
          <p className="section-label">About</p>
          <h2 className="section-title">Crafting <em>High-Performance</em> Systems at Scale</h2>
        </div>
        <div className="about-content">
          <p>
            Throughout my career, I've crafted sophisticated parallel software that taps into the raw power of diverse
            hardware accelerators—like GPUs, pushing them to their limits in real-world applications.
          </p>
          <p>
            I'm passionate about elevating the functional depth, raw speed, scalability, and rock-solid reliability
            of those essential data processing operators at the heart of analytics engines or deep learning stacks.
          </p>
          <div className="about-highlights">
            <div className="highlight-item">
              <div className="highlight-icon pytorch-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="24" height="24">
                  <path fill="currentColor" d="M100.1 38.3l-9.2 9.2c15.1 15.1 15.1 39.4 0 54.3-15.1 15.1-39.4 15.1-54.3 0-15.1-15.1-15.1-39.4 0-54.3l24-24 3.4-3.4V2L27.8 38.2C7.7 58.3 7.7 90.8 27.8 111s52.6 20.1 72.4 0c20.1-20.2 20.1-52.5-.1-72.7z" />
                  <circle fill="currentColor" cx="82.1" cy="29.4" r="6.7" />
                </svg>
              </div>
              <div className="highlight-content">
                <h4>PyTorch Contributor</h4>
                <p>40+ PRs in Aten/scatter-tensor kernels, numerical accuracy and performance fixes</p>
              </div>
            </div>
            <div className="highlight-item">
              <div className="highlight-icon arrow-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                  <polygon fill="currentColor" points="3,3 12,12 3,21 3,16.5 7.5,12 3,7.5" />
                  <polygon fill="currentColor" points="9,3 18,12 9,21 9,16.5 13.5,12 9,7.5" />
                  <polygon fill="currentColor" points="15,3 24,12 15,21 15,16.5 19.5,12 15,7.5" />
                </svg>
              </div>
              <div className="highlight-content">
                <h4>Apache Arrow</h4>
                <p>9+ PRs improving performance, new features, and ecosystem interoperability</p>
              </div>
            </div>
            <div className="highlight-item">
              <div className="highlight-icon nvidia-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M8.948 8.798v-1.43a6.7 6.7 0 0 1 .424-.018c3.922-.124 6.493 3.374 6.493 3.374s-2.774 3.851-5.75 3.851c-.453 0-.87-.073-1.167-.166v-4.479c1.528.132 1.835.63 2.754 2.063l2.044-1.715s-1.685-1.639-3.945-1.639c-.31 0-.587.025-.853.068v.091zm0-4.595v2.054l.424-.036c5.456-.173 9.01 4.684 9.01 4.684s-4.109 5.255-8.28 5.255c-.414 0-.8-.047-1.154-.127v1.308c.301.036.617.055.947.055 3.887 0 6.7-1.957 9.435-4.267.453.36 2.31 1.246 2.69 1.632-2.457 1.903-8.178 3.925-12.07 3.925a8.9 8.9 0 0 1-1.002-.063v1.795h14.512V4.203H8.948zm0 12.983v1.146H4.54V6.349l.127-.018c.187-.024.397-.042.607-.066V4.203H2.627v15.2h6.321v-2.217a5.3 5.3 0 0 1-1.167-.175v.175h1.167zm0-6.054v1.235c-1.392-.232-1.777-1.073-2.754-2.553l-2.044 1.76s1.154 2.08 4.798 2.265v-1.234" />
                </svg>
              </div>
              <div className="highlight-content">
                <h4>RAPIDS/CUDF</h4>
                <p>7+ PRs in CUDA primitives and analytics kernels (groupby/join)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default About
