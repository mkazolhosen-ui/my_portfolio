import { useState } from 'react'
import { useSiteContent } from '../content/contentContext'
import Section from './Section'
import SkillMap from './SkillMap'

export default function Skills() {
  const { content } = useSiteContent()
  const [active, setActive] = useState<number | null>(null)
  const groups = content.skills

  return (
    <Section id="skills" eyebrow="03 / Skills" title="What I work with.">
      {groups.length === 0 ? (
        <p className="empty-note">Skills will be listed here soon.</p>
      ) : (
        <div className="skills-layout">
          <div className="skills__map">
            <SkillMap groups={groups} active={active} onActive={setActive} />
          </div>

          <div className="skills">
            {groups.map((group, i) => (
              <div
                key={`${i}-${group.title}`}
                className={`skill${active === i ? ' skill--active' : ''}`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
              >
                <h3 className="skill__title">{group.title}</h3>
                <p className="skill__desc">{group.description}</p>
                <ul className="skill__items" role="list">
                  {group.items.map((item, j) => (
                    <li key={`${j}-${item}`}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </Section>
  )
}