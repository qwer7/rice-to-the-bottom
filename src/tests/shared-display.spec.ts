import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia } from 'pinia'
import InfluenceSlots from '../components/InfluenceSlots.vue'
import CapitalBoard from '../components/CapitalBoard.vue'
import InfluenceCard from '../components/InfluenceCard.vue'
import MarketBoard from '../components/MarketBoard.vue'
import { usePreviewStore } from '../ux/mockStore'

afterEach(() => vi.unstubAllGlobals())

it.each([3, -3] as const)('shows the correct arrow for a compact %i market card', async delta => {
  const html = await renderToString(createSSRApp({ render: () => h(InfluenceCard, { card: { id: 'single', kind: 'single', company: 'REDSTONE', delta }, compact: true }) }))
  expect(html).toContain(`class="card-mini__icon" aria-hidden="true">${delta > 0 ? '↑' : '↓'}</span>`)
  expect(html).toContain(`aria-label="REDSTONE ${delta > 0 ? '+' : ''}${delta}"`)
})

it('shows the 2–7 price range and matching levels on the main board', async () => {
  vi.stubGlobal('location', { search: '?device=tv&state=playing' })
  const pinia = createPinia()
  usePreviewStore(pinia)
  const html = await renderToString(createSSRApp({ render: () => h(MarketBoard) }).use(pinia))
  expect(html.match(/aria-valuemin="2" aria-valuemax="7" aria-valuenow="4"/g)).toHaveLength(3)
  expect(html.match(/--price-level:40%/g)).toHaveLength(3)
  expect(html.match(/company-thermometer__limit" aria-hidden="true">7<\/span>/g)).toHaveLength(3)
  expect(html.match(/company-thermometer__limit" aria-hidden="true">2<\/span>/g)).toHaveLength(3)
})

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
