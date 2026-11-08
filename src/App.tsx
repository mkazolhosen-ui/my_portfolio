import Navbar from './components/Navbar'
import SceneLayer from './components/SceneLayer'
import Hero from './components/Hero'
import About from './components/About'
import Projects from './components/Projects'
import Skills from './components/Skills'
import SignalSection from './terminal/SignalSection'
import Contact from './components/Contact'
import useScrollChoreography from './hooks/useScrollChoreography'
import ContentProvider from './content/ContentProvider'
import { useSiteContent } from './content/contentContext'

/**
 * Mounts only after content is resolved, so the scroll choreography and the nav observer
 * always see the final DOM instead of a page that is about to change.
 */
function Site() {
  const { content } = useSiteContent()
  useScrollChoreography()

  return (
    <>
      <Navbar />
      <main id="main">
        <Hero />
        <About />
        <Projects />
        <Skills />
        <SignalSection />
        <Contact />
      </main>
      <footer className="footer">
        <div className="container footer__inner">
          <p>
            © {new Date().getFullYear()} {content.name}
          </p>
          <p className="footer__tag">{content.eyebrow}</p>
        </div>
      </footer>
    </>
  )
}

function Page() {
  const { status } = useSiteContent()

  if (status === 'loading') {
    return (
      <div className="content-loading" role="status">
        <span className="sr-only">Loading portfolio</span>
        <span className="content-loading__bar" aria-hidden="true" />
      </div>
    )
  }

  return <Site />
}

export default function App() {
  return (
    <ContentProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SceneLayer />
      <Page />
    </ContentProvider>
  )
}