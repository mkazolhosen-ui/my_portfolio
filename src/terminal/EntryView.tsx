import { memo } from 'react'
import { safeHref } from './safeHref'
import type { Entry, OutputBlock } from './types'

interface BlockProps {
  block: OutputBlock
  onRun: (command: string) => void
}

/** Draws one output block as plain lines. Everything is text, so nothing typed can become HTML. */
function Block({ block, onRun }: BlockProps) {
  switch (block.kind) {
    case 'text': {
      const classes = ['signal__text']
      if (block.tone && block.tone !== 'default') classes.push(`signal__text--${block.tone}`)
      if (block.spaced) classes.push('signal__text--spaced')
      return <p className={classes.join(' ')}>{block.text}</p>
    }

    case 'error':
      return <p className="signal__error">{block.text}</p>

    case 'list':
      return (
        <ul className="signal__list" role="list">
          {block.items.map((text, index) => (
            <li key={`${index}-${text}`} role="listitem">
              {text}
            </li>
          ))}
        </ul>
      )

    case 'links':
      return (
        <ul className="signal__links" role="list">
          {block.items.map((item, index) => {
            // Checked again here, so an unsafe link can never be drawn.
            const href = safeHref(item.href)
            if (!href) return null
            const external = /^https?:/i.test(href)
            return (
              <li key={`${index}-${href}`} role="listitem">
                <span className="signal__link-label">{item.label}:</span>{' '}
                <a
                  className="signal__link"
                  href={href}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {item.display ?? href}
                </a>
              </li>
            )
          })}
        </ul>
      )

    case 'commands':
      return (
        <p className="signal__cmdrow">
          {block.lead && <span className="signal__cmdlead">{block.lead}</span>}
          {block.names.map((name, index) => (
            <span key={name} className="signal__cmditem">
              <button
                type="button"
                className="signal__cmd"
                aria-label={`Run ${name}`}
                onClick={() => onRun(name)}
              >
                {name}
              </button>
              {index < block.names.length - 1 && (
                <span className="signal__sep" aria-hidden="true">
                  ,
                </span>
              )}
            </span>
          ))}
        </p>
      )

    case 'choices':
      return (
        <ul className="signal__choices" role="list">
          {block.items.map((item) => (
            <li key={item.command} role="listitem">
              <span className="signal__choice-prefix">{item.prefix}</span>
              <button
                type="button"
                className="signal__cmd"
                aria-label={`Run ${item.command}`}
                onClick={() => onRun(item.command)}
              >
                {item.label}
              </button>
              <span className="signal__choice-note">{item.note}</span>
            </li>
          ))}
        </ul>
      )
  }
}

interface EntryViewProps {
  entry: Entry
  onRun: (command: string) => void
}

/** One command from the session: the prompt line that was typed, then its output underneath. */
const EntryView = memo(function EntryView({ entry, onRun }: EntryViewProps) {
  return (
    <div className="signal__entry">
      {entry.input !== null && (
        <p className="signal__echo">
          <span className="signal__prompt" aria-hidden="true">
            <span className="signal__host">visitor@cyber-reality:~</span>$
          </span>{' '}
          <span>{entry.input}</span>
        </p>
      )}
      {entry.blocks.map((block, index) => (
        <Block key={index} block={block} onRun={onRun} />
      ))}
    </div>
  )
})

export default EntryView