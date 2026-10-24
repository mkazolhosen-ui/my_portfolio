import { useRef } from 'react'
import { useSiteContent } from '../content/contentContext'
import useHeroIntro from '../hooks/useHeroIntro'

export default function Hero() {
  const { content } = useSiteContent()
  const ref = useRef<HTMLElement>(null)
  useHeroIntro(ref)

  return (
    <section ref={ref} id="top" className="hero" aria-labelledby="hero-title">
      <div className="container hero__content">
        <p className="eyebrow">{content.eyebrow}</p>

        <h1 id="hero-title" className="hero__title">
          {content.heroName.map((word, i) => (
            <span key={`${i}-${word}`} className="hero__word">
              {word}
            </span>
          ))}
        </h1>

        <p className="hero__tagline">“{content.tagline}”</p>
        <p className="hero__intro">{content.intro}</p>

        <div className="hero__actions">
          <a className="btn btn--primary" href="#projects">
            View Projects
          </a>
          <a className="btn btn--ghost" href="#contact">
            Get in Touch
          </a>
        </div>
      </div>

      <a className="hero__scroll" href="#about">
        <span className="sr-only">Scroll to About section</span>
        <span className="hero__scroll-line" aria-hidden="true" />
      </a>
    </section>
  )
}