import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia } from 'pinia'
import InfluenceSlots from '../components/InfluenceSlots.vue'
import CapitalBoard from '../components/CapitalBoard.vue'
import { usePreviewStore } from '../ux/mockStore'

afterEach(() => vi.unstubAllGlobals())

describe('influence slots', () => {
  it('shows static slots on the board and interactive slots for the player', async () => {
    const render = (board: boolean) => renderToString(createSSRApp({ render: () => h(InfluenceSlots, { cards: ['dividends'], board }) }))
    const board = await render(true)
    const player = await render(false)
    expect(board).toContain('Карты: Дивиденды')
    expect(board).not.toContain('<button')
    expect(player).toContain('<button')
    expect(player).toContain('aria-expanded="false"')
    expect(player).not.toContain('tv-card-slots')
  })
})

it('marks every player tied for the highest capital', async () => {
  vi.stubGlobal('location', { search: '?device=tv&state=playing' })
  const pinia = createPinia()
  const store = usePreviewStore(pinia)
  store.players.forEach(player => { player.balance = 0; player.portfolio = { REDSTONE: 0, BLUEWELL: 0, GOLDSPARK: 0 } })
  store.players[0].balance = 100
  store.players[1].balance = 100
  const app = createSSRApp({ render: () => h(CapitalBoard) }).use(pinia)
  const html = await renderToString(app)
  expect(html.match(/class="capital-leader"/g)).toHaveLength(2)
  expect(html.match(/лидер по капиталу/g)).toHaveLength(2)
})
