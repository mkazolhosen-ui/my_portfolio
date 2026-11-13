export interface NavItem {
  id: string
  label: string
}

export interface Project {
  /** Database row id. Only used to keep a project's 3D look stable. Absent for the built-in fallback projects. */
  id?: string
  title: string
  kind: string
  description: string
  tags: string[]
  /** Live demo URL. Leave empty until you have one. */
  liveUrl: string
  /** Source code URL. Leave empty until you have one. */
  repoUrl: string
}

export interface SkillGroup {
  title: string
  description: string
  items: string[]
}

export interface ContactLink {
  label: string
  /** Visible text, e.g. a handle or address. */
  display: string
  /** Full URL (https://...) or mailto: link. Leave empty to hide the link. */
  href: string
}

export const site = {
  name: 'Md Kazol Hosen',
  heroName: ['MD', 'KAZOL', 'HOSEN'],
  eyebrow: 'CYBER // REALITY',
  tagline: 'Exploring the space between code and reality.',
  intro:
    'Computer science student exploring cybersecurity, software development, and immersive digital experiences.',

  nav: [
    { id: 'about', label: 'About' },
    { id: 'projects', label: 'Projects' },
    { id: 'skills', label: 'Skills' },
    { id: 'signal', label: 'Signal' },
    { id: 'contact', label: 'Contact' },
  ] as NavItem[],

  about: {
    paragraphs: [
      'I am a computer science student drawn to the point where security, software, and creative technology meet.',
      'I like understanding how systems work, how they break, and how they can be made more resilient, while also building things that feel alive in the browser.',
      // TODO: Replace or extend with your own story. Keep it truthful.
    ],
    focus: [
      'Cybersecurity fundamentals',
      'Software development',
      'Immersive web experiences',
    ],
  },

  projects: [
    {
      title: 'Drawn Reality',
      kind: 'Browser Game',
      description:
        'A browser-based game project exploring interactive play and creative design. Replace this text with a short, accurate description.',
      tags: ['Browser Game', 'Interactive'],
      liveUrl: '',
      repoUrl: '',
    },
    {
      title: 'Cybersecurity Learning Portfolio',
      kind: 'Learning Journey',
      description:
        'A record of what I am learning in cybersecurity: notes, exercises, and write-ups. Replace this text with the specifics you want to show.',
      tags: ['Cybersecurity', 'Learning'],
      liveUrl: '',
      repoUrl: '',
    },
    {
      title: 'Data Preprocessing Project',
      kind: 'Data Project',
      description:
        'A project focused on cleaning and preparing data for analysis. Replace this text with what you actually built and the tools you used.',
      tags: ['Data', 'Preprocessing'],
      liveUrl: '',
      repoUrl: '',
    },
  ] as Project[],

  skills: [
    {
      title: 'Cybersecurity',
      description: 'Areas I am studying and exploring.',
      items: ['Security fundamentals', 'Learning labs and exercises'],
    },
    {
      title: 'Software Development',
      description: 'How I build things.',
      items: ['TypeScript', 'React', 'Browser-based apps'],
    },
    {
      title: 'Creative Development',
      description: 'Where code meets visuals.',
      items: ['Three.js', 'Shaders (GLSL)', 'Interactive experiences'],
    },
    {
      title: 'Data',
      description: 'Working with information.',
      items: ['Data preprocessing'],
    },
  ] as SkillGroup[],

  contact: {
    heading: 'Let’s connect.',
    message:
      'Interested in collaborating, talking security, or sharing ideas? Reach out.',
    links: [
      // TODO: Fill these in. Entries with an empty href are hidden automatically.
      { label: 'Email', display: 'you@example.com', href: '' },
      { label: 'GitHub', display: '', href: '' },
      { label: 'LinkedIn', display: '', href: '' },
    ] as ContactLink[],
  },
}
