import React from 'react';

const projects = [
  { name: 'distributed systems', description: 'comprehensive guide and algorithms on distributed systems implemented in zig' },
  { name: 'chsim', description: 'consistent hashing ring simulation in zig' },
  { name: 'lsm trees', description: 'ground up implementation of lsm trees in c++' },
  { name: 'dockermake', description: 'add a makefile for your docker' },
  { name: 'dynamodb', description: 'deep dive into the architecture of Amazon\'s DynamoDB' },
  { name: 'kubernetes', description: 'completed a beginner course on kubernetes' },
];

const LandingPage = () => {
  return (
    <div className="max-w-3xl mx-auto p-8 font-sans">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Basil Yusuf</h1>
        <nav>
          <a href="#projects" className="mr-4">projects</a>
          <a href="#writing" className="mr-4">writing</a>
          <a href="#resume">resume</a>
        </nav>
      </header>

      <main>
        <section className="mb-8">
          <p className="text-xl mb-4">
            is a <strong>software engineer</strong>, <strong>researcher</strong>, and <strong>reader</strong>.
          </p>
          <p className="mb-4">
            I am deeply passionate about distributed systems, infrastructure and container orchestration.
          </p>
          <p className="mb-4">
            What truly amazes me is how things break in often unpredictable ways as systems scale. It's like watching a high-stakes game of Jenga played out in code and infrastructure. Each optimization, each new layer of complexity, adds both power and fragility. I'm obsessed with finding that sweet spot where performance, reliability, and maintainability converge, always pushing the envelope of what's possible in large-scale distributed computing. If you share the same level of passion as me, feel free to reach out to me on X.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">What I have built and learned so far in 2024:</h2>
          <ul>
            {projects.map((project, index) => (
              <li key={index} className="mb-4">
                <h3 className="text-lg font-semibold">{project.name}</h3>
                <p>{project.description}</p>
                {project.name === 'dockermake' && (
                  <p className="text-sm text-gray-600">made this project after a reddit post got 100k views :)</p>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <p>Previously, I worked at Deloitte, Amazon, TD Bank, and Interac. I've also independently published things in the past, like an article on docker, and low-level networking for research. Additionally, I have also won three hackathons.</p>
          <p>I recently graduated from University of Guelph, where I was a Research Associate on Open Source Skill-based Matchmaking Architecture (SBMM) and a Teaching Assistant for Object-oriented Programming (CIS*2430).</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Other interests:</h2>
          <p>russian philosophy, islamic theology, geopolitics, history.</p>
        </section>
      </main>

      <footer className="mt-12 text-sm">
        <p>Template by Eric Zhang</p>
        <div className="mt-4">
          <p>Twitter: @basilyusuf1709</p>
          <p>GitHub: @basilysf1709</p>
          <p>Email: basilyusuf1709@gmail.com</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;