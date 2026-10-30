import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import InfluenceSlots from '../components/InfluenceSlots.vue'

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
