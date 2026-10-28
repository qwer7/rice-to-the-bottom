export const PUBLIC_GAME_URL = 'https://race-to-the-bottom-36n.pages.dev/'
export function roomFromSearch(search: string): string {
  const code = new URLSearchParams(search).get('room')?.trim().toUpperCase() ?? ''
  return /^[A-Z0-9]{6}$/.test(code) ? code : ''
}
export function roomJoinUrl(code: string): string {
  const url = new URL(PUBLIC_GAME_URL)
  url.searchParams.set('room', code)
  return url.toString()
}
