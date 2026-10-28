const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function newHubKey(): string { return Array.from(crypto.getRandomValues(new Uint8Array(8)), n => ALPHABET[n % 32]).join('') }
export function normalizeHubKey(value: string): string {
  const compact = value.replace(/[\s-]/g, '').toUpperCase()
  return /^[A-Z2-9]{8}$/.test(compact) ? compact : value.trim()
}
export async function hashHubKey(value: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizeHubKey(value)))), n => n.toString(16).padStart(2,'0')).join('')
}
export async function compactHubKey(legacy: string): Promise<string> {
  const digest = await hashHubKey(`compact-hub-key:${legacy.trim()}`)
  return Array.from({length:8}, (_, i) => ALPHABET[parseInt(digest.slice(i*2,i*2+2),16) % 32]).join('')
}
