import type { ReactNode } from 'react'

interface SectionProps {
  id: string
  eyebrow: string
  title: string
  children: ReactNode
}

export default function Section({ id, eyebrow, title, children }: SectionProps) {
  return (
    <section id={id} className="section" aria-labelledby={`${id}-title`}>
      <div className="container">
        <header className="section__header">
          <p className="eyebrow">{eyebrow}</p>
          <h2 id={`${id}-title`} className="section__title">
            {title}
          </h2>
        </header>
        {children}
      </div>
    </section>
  )
}