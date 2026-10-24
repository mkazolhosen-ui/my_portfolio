import { useSiteContent } from '../content/contentContext'
import Section from './Section'

export default function About() {
  const { content } = useSiteContent()
  const { paragraphs, focus } = content.about

  return (
    <Section id="about" eyebrow="01 / About" title="Code, security, and curiosity.">
      <div className="about">
        <div className="about__text">
          {paragraphs.map((p, i) => (
            <p key={`${i}-${p.slice(0, 24)}`}>{p}</p>
          ))}
        </div>

        {focus.length > 0 && (
          <ul className="about__focus" role="list" aria-label="Areas of focus">
            {focus.map((item, i) => (
              <li key={`${i}-${item}`} className="chip">
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  )
}