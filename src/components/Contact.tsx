import { useEffect, useRef, useState } from 'react'
import { useSiteContent } from '../content/contentContext'
import Section from './Section'

export default function Contact() {
  const { content } = useSiteContent()
  const [status, setStatus] = useState('')
  const timer = useRef<number | undefined>(undefined)

  const links = content.contact.links.filter((link) => link.href)
  const emailLink = links.find((link) => link.href.toLowerCase().startsWith('mailto:'))
  const others = links.filter((link) => link !== emailLink)
  const email = emailLink
    ? emailLink.href.replace(/^mailto:/i, '').split('?')[0]
    : ''

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email)
      setStatus('Email address copied.')
    } catch {
      setStatus('Could not copy. Please copy the address manually.')
    }
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setStatus(''), 3500)
  }

  return (
    <Section id="contact" eyebrow="05 / Contact" title={content.contact.heading}>
      <div className="contact">
        <p className="contact__message">{content.contact.message}</p>

        {emailLink && (
          <div className="contact__cta">
            <a className="contact__email" href={emailLink.href}>
              {email}
            </a>
            <div className="contact__tools">
              <button type="button" className="btn btn--ghost" onClick={copyEmail}>
                Copy address
              </button>
              <p className="contact__status" role="status">
                {status}
              </p>
            </div>
          </div>
        )}

        {others.length > 0 && (
          <ul className="contact__links" role="list">
            {others.map((link, i) => (
              <li key={`${i}-${link.label}`}>
                <a
                  href={link.href}
                  {...(link.href.startsWith('http')
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  <span className="contact__label">{link.label}</span>
                  <span className="contact__display">{link.display || link.href}</span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {links.length === 0 && (
          <p className="contact__empty">Contact details will be added soon.</p>
        )}
      </div>
    </Section>
  )
}