import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Posts from '@/pages/Posts'
import PostView from '@/pages/PostView'
import Projects from '@/pages/Projects'
import Contact from '@/pages/Contact'

import { PostProvider } from '@/contexts/PostContext'

function App() {
  return (
    <BrowserRouter>
      <PostProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/posts" element={<Posts />} />
            <Route path="/posts/:slug" element={<PostView />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </Layout>
      </PostProvider>
    </BrowserRouter>
  )
}

export default App
