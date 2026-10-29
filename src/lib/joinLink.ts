export const PUBLIC_GAME_URL = 'https://race-to-the-bottom.vercel.app/'
export function roomFromSearch(search: string): string {
  const code = new URLSearchParams(search).get('room')?.trim().toUpperCase() ?? ''
  return /^[A-Z0-9]{6}$/.test(code) ? code : ''
}
export function roomJoinUrl(code: string): string {
  // Local previews still need a public address that phones can reach.
  const origin = typeof window !== 'undefined' && !import.meta.env.DEV && !['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? window.location.origin
    : PUBLIC_GAME_URL
  const url = new URL('/', origin)
  url.searchParams.set('room', code)
  return url.toString()
}
