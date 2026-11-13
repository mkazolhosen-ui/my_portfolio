import type { Project } from '../config/site'
import { useSiteContent } from '../content/contentContext'
import useCardTilt from '../hooks/useCardTilt'
import ProjectUniverse from '../universe/ProjectUniverse'
import Section from './Section'

/** The card list's id. The explorer's "skip" link points here. */
const LIST_ID = 'project-list'

function ProjectLink({ href, label, title }: { href: string; label: string; title: string }) {
  if (!href) {
    return (
      <span className="project__link project__link--disabled">
        {label} · coming soon
      </span>
    )
  }
  return (
    <a
      className="project__link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} for ${title} (opens in a new tab)`}
    >
      {label} ↗
    </a>
  )
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const tilt = useCardTilt()

  return (
    <article className="project" {...tilt}>
      <p className="project__index">{String(index + 1).padStart(2, '0')}</p>
      <p className="project__kind">{project.kind}</p>
      <h3 className="project__title">{project.title}</h3>
      <p className="project__desc">{project.description}</p>

      {project.tags.length > 0 && (
        <ul className="project__tags" role="list" aria-label="Tags">
          {project.tags.map((tag, i) => (
            <li key={`${i}-${tag}`}>{tag}</li>
          ))}
        </ul>
      )}

      <div className="project__links">
        <ProjectLink href={project.liveUrl} label="Live" title={project.title} />
        <ProjectLink href={project.repoUrl} label="Source" title={project.title} />
      </div>
    </article>
  )
}

export default function Projects() {
  const { content } = useSiteContent()

  return (
    <Section id="projects" eyebrow="02 / Projects" title="Selected work.">
      {content.projects.length === 0 ? (
        <p className="empty-note">No projects are published yet. Check back soon.</p>
      ) : (
        <>
          <ProjectUniverse projects={content.projects} listId={LIST_ID} />
          <ul id={LIST_ID} className="projects" role="list">
            {content.projects.map((project, i) => (
              <li key={`${i}-${project.title}`}>
                <ProjectCard project={project} index={i} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  )
}
