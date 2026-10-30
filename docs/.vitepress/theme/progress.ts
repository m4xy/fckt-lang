import { withBase } from 'vitepress'

// Which lessons this browser has finished, kept in local storage, and ticked in the sidebar.
const KEY = 'fckt-lessons-done'

function finished(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

export const isDone = (path: string) => finished().includes(path)

export function markDone(path: string) {
  try { localStorage.setItem(KEY, JSON.stringify([...new Set([...finished(), path])])) } catch { /* storage may be blocked */ }
  tickSidebar()
}

export function tickSidebar() {
  const done = new Set(finished().map(path => withBase(path)))
  document.querySelectorAll<HTMLAnchorElement>('.VPSidebar a.link').forEach(link => {
    link.classList.toggle('fckt-done', done.has(new URL(link.href).pathname))
  })
}
