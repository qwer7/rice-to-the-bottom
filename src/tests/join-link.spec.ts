import { describe, expect, it } from 'vitest'
import { roomFromSearch, roomJoinUrl } from '../lib/joinLink'
describe('room links', () => {
  it('opens the public phone entry with a room and without TV mode', () => {
    const url = new URL(roomJoinUrl('ABC234'))
    expect(url.origin).toBe('https://race-to-the-bottom-36n.pages.dev')
    expect(roomFromSearch(url.search)).toBe('ABC234')
    expect(url.searchParams.has('screen')).toBe(false)
  })
  it('normalizes valid codes and ignores malformed links', () => {
    expect(roomFromSearch('?room=abc234')).toBe('ABC234')
    for (const search of ['','?room=ABC','?room=%3Cscript%3E','?room=ABC2347']) expect(roomFromSearch(search)).toBe('')
  })
})
