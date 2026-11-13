import { useId } from 'react'
import type { Project } from '../config/site'

interface ProjectDetailProps {
  project: Project
  /** Zero-based position in the list, used only for the "02 / 05" counter. */
  index: number
  total: number
  onPrevious: () => void
  onNext: () => void
  onBack: () => void
}

/** Everything a visitor can learn about one project. Real HTML, so it works without the 3D stage. */
export default function ProjectDetail({
  project,
  index,
  total,
  onPrevious,
  onNext,
  onBack,
}: ProjectDetailProps) {
  const tagsId = useId()
  const position = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`
  const hasLinks = project.liveUrl !== '' || project.repoUrl !== ''

  return (
    <div className="universe__detail">
      <div className="universe__detail-body">
        <p className="universe__kicker">
          <span>{position}</span>
          {project.kind && <span>{project.kind}</span>}
        </p>

        <h3 className="universe__title">{project.title}</h3>

        {project.description && <p className="universe__desc">{project.description}</p>}

        {project.tags.length > 0 && (
          <div className="universe__tagblock">
            <p id={tagsId} className="universe__sublabel">
              Tags
            </p>
            <ul className="universe__tags" role="list" aria-labelledby={tagsId}>
              {project.tags.map((tag, i) => (
                <li key={`${i}-${tag}`}>{tag}</li>
              ))}
            </ul>
          </div>
        )}

        {hasLinks && (
          <ul className="universe__links" role="list">
            {project.liveUrl && (
              <li>
                <a
                  className="universe__link"
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Live for ${project.title} (opens in a new tab)`}
                >
                  Live ↗
                </a>
              </li>
            )}
            {project.repoUrl && (
              <li>
                <a
                  className="universe__link"
                  href={project.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Source for ${project.title} (opens in a new tab)`}
                >
                  Source ↗
                </a>
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="universe__nav">
        {total > 1 && (
          <>
            <button type="button" className="btn btn--ghost" onClick={onPrevious}>
              <span aria-hidden="true">←</span>&nbsp;Previous
            </button>
            <button type="button" className="btn btn--ghost" onClick={onNext}>
              Next&nbsp;<span aria-hidden="true">→</span>
            </button>
          </>
        )}
        <button type="button" className="btn btn--ghost universe__back" onClick={onBack}>
          Back to overview
        </button>
      </div>
    </div>
  )
}
