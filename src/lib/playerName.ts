const KEY = 'race-to-the-bottom:display-name'
const COOKIE = 'race_player_name'
export function readPlayerName(): string {
  try {
    const value = document.cookie.split('; ').find(row => row.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
    if (value) return decodeURIComponent(value).slice(0,24)
  } catch { /* A blocked or malformed cookie must not prevent joining. */ }
  try { return (localStorage.getItem(KEY) ?? '').slice(0,24) } catch { return '' }
}
export function rememberPlayerName(name: string): void {
  const value = name.trim().slice(0,24)
  try { document.cookie = `${COOKIE}=${encodeURIComponent(value)}; Max-Age=31536000; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}` } catch { /* Storage is optional. */ }
  try { localStorage.setItem(KEY,value) } catch { /* Storage is optional. */ }
}
