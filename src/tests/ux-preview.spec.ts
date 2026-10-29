import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'
import { usePreviewStore } from '../ux/mockStore'
import { boardScenarios, playerScenarios } from '../ux/scenarios'

afterEach(() => vi.unstubAllGlobals())

describe('UX preview', () => {
  it('builds each listed scenario for all four players without a server', () => {
    for (const device of ['iphone', 'android', 'ipad', 'tv', 'desktop']) {
      const scenarios = ['tv', 'desktop'].includes(device) ? boardScenarios : playerScenarios
      for (const [scenario] of scenarios) for (let player = 0; player < 4; player++) {
        vi.stubGlobal('location', { search: `?device=${device}&state=${scenario}&player=${player}` })
        const store = usePreviewStore(createPinia())
        expect(store.game.phase).toBeTruthy()
        expect(store.players.length).toBe(scenario === 'empty-lobby' ? 0 : 4)
        if (!['tv', 'desktop'].includes(device)) expect(store.me?.id).toBe(`player-${player + 1}`)
      }
    }
  })
  it('keeps trading and card selection in the preview store', async () => {
    vi.stubGlobal('location', { search: '?device=iphone&state=trading&player=0' })
    const store = usePreviewStore(createPinia())
    const balance = store.me!.balance
    store.buyShare('REDSTONE')
    expect(store.me!.balance).toBeLessThan(balance)
    store.undoTrade()
    expect(store.me!.balance).toBe(balance)
    await store.action('end-trading')
    await store.action('select-card', { cardId: store.ownCards.hand[0].id })
    expect(store.selectedCardId).toBe(store.ownCards.hand[0].id)
  })
})
