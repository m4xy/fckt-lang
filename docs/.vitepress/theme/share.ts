import { withBase } from 'vitepress'

// A playground link carries its program in the address, after #code=, as URL-safe base64 of UTF-8.
export const encode = (text: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export const decode = (text: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)))

export const playgroundLink = (program: string) => `${withBase('/playground')}#code=${encode(program)}`
