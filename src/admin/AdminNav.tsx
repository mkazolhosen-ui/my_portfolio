interface AdminNavProps {
  path: string
  onNavigate: (to: string) => void
}

const ITEMS = [
  { label: 'Dashboard', path: '/admin' },
  { label: 'Hero', path: '/admin/hero' },
  { label: 'About', path: '/admin/about' },
  { label: 'Projects', path: '/admin/projects' },
  { label: 'Skills', path: '/admin/skills' },
  { label: 'Contact', path: '/admin/contact' },
  { label: 'Links', path: '/admin/links' },
]

export default function AdminNav({ path, onNavigate }: AdminNavProps) {
  return (
    <nav className="admin-nav" aria-label="Admin sections">
      <ul role="list">
        {ITEMS.map((item) => (
          <li key={item.path}>
            <a
              href={item.path}
              aria-current={path === item.path ? 'page' : undefined}
              onClick={(e) => {
                // Let the browser handle new-tab clicks and modified clicks.
                if (e.defaultPrevented || e.button !== 0) return
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                e.preventDefault()
                onNavigate(item.path)
              }}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}