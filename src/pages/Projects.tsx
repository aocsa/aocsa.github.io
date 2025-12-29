interface Project {
  title: string
  description: string
  tags: string[]
  link?: string
}

const projects: Project[] = [
  {
    title: 'GPU Query Engine (Theseus)',
    description: 'Petabyte-scale GPU-accelerated query engine with advanced memory management and distributed execution. Designed physical execution abstractions with spill paths across GPU HBM → RAM → Disk.',
    tags: ['C++', 'CUDA', 'Apache Arrow'],
    link: 'https://arxiv.org/html/2508.05029v1',
  },
  {
    title: 'PyTorch Sparse Tensors',
    description: 'Enhanced PyTorch sparse tensor capabilities with GPU-accelerated kernels. Contributed 40+ PRs in Aten/scatter-tensor kernels with numerical accuracy and performance fixes.',
    tags: ['C++', 'CUDA', 'PyTorch'],
    link: 'https://github.com/pytorch/pytorch/pulls?q=is%3Apr+author%3Aaocsa+is%3Aclosed',
  },
  {
    title: 'BlazingSQL',
    description: 'Distributed GPU SQL engine with UCX-based messaging and pull-based execution model. Built async executors for compute, comms, and memory/spill.',
    tags: ['C++', 'CUDA', 'SQL'],
    link: 'https://github.com/BlazingDB/blazingsql/pulls?q=is%3Apr+author%3Aaocsa+is%3Aclosed',
  },
  {
    title: 'Apache Arrow',
    description: 'Contributing to the Apache Arrow ecosystem with 9+ PRs improving performance, new features, and ecosystem interoperability.',
    tags: ['C++', 'Python'],
    link: 'hhttps://github.com/apache/arrow/pulls?q=is%3Apr+author%3Aaocsa+is%3Aclosed',
  },
  {
    title: 'RAPIDS/cuDF',
    description: 'Contributed 7+ PRs in CUDA primitives and analytics kernels including groupby and join operations.',
    tags: ['C++', 'CUDA', 'Python'],
    link: 'https://github.com/rapidsai/cudf/pulls?q=is%3Apr+author%3Aaocsa+is%3Aclosed',
  },
]

function Projects() {
  return (
    <div className="projects-list-container projects-page">
      <h1 className="projects-title">Projects</h1>
      <ul className="projects-list">
        {projects.map((project, index) => (
          <li key={index} className="projects-item">
            <div className="projects-item-header">
              {project.link ? (
                <a href={project.link} target="_blank" rel="noopener noreferrer" className="projects-item-title">
                  {project.title}
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              ) : (
                <span className="projects-item-title">{project.title}</span>
              )}
              <div className="projects-item-tags">
                {project.tags.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            </div>
            <p className="projects-item-description">{project.description}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Projects
