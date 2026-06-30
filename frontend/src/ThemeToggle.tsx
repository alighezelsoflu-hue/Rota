import { useEffect, useState } from 'react'

type ThemeMode = 'light' | 'dark'

function getInitialTheme(): ThemeMode {
  const saved = localStorage.getItem('rota-theme')
  if (saved === 'dark' || saved === 'light') return saved

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('rota-theme', theme)
  }, [theme])

  return (
    <button
      className="themeToggle"
      type="button"
      onClick={() => setTheme(current => (current === 'dark' ? 'light' : 'dark'))}
      aria-label="Toggle dark mode"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span>{theme === 'dark' ? '☀' : '☾'}</span>
      <strong>{theme === 'dark' ? 'Light' : 'Dark'}</strong>
    </button>
  )
}