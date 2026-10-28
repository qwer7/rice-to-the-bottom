import { COMPANY_IDS } from './constants'
import type { CompanyId, GameState } from './types'

type Prices = Record<CompanyId, number>
export interface MarketHistory {
  round: number
  prices: Prices
  deltas: Prices | null
  deltaRound: number | null
}
function validPrices(value: unknown): value is Prices {
  return !!value && COMPANY_IDS.every(id => Number.isFinite((value as Prices)[id]))
}
export function readMarketHistory(value: unknown): MarketHistory | null {
  const item = value as MarketHistory | null
  return item && Number.isInteger(item.round) && validPrices(item.prices) &&
    (item.deltas === null || validPrices(item.deltas)) &&
    (item.deltaRound === null || Number.isInteger(item.deltaRound)) ? item : null
}
function difference(after: Prices, before: Prices): Prices {
  return Object.fromEntries(COMPANY_IDS.map(id => [id, after[id] - before[id]])) as Prices
}
export function updateMarketHistory(state: GameState, previous: MarketHistory | null): MarketHistory {
  const prices = Object.fromEntries(state.companies.map(c => [c.id, c.price])) as Prices
  if (state.phase === 'lobby' || state.round < (previous?.round ?? 0)) {
    return { round: state.round, prices, deltas: null, deltaRound: null }
  }
  let deltas = previous?.deltas ?? null, deltaRound = previous?.deltaRound ?? null
  const reveal = state.lastReveal
  if (reveal && validPrices(reveal.pricesBefore) && validPrices(reveal.pricesAfter)) {
    deltas = difference(reveal.pricesAfter, reveal.pricesBefore)
    deltaRound = reveal.round
  } else if (reveal && validPrices(reveal.deltas)) {
    deltas = { ...reveal.deltas }; deltaRound = reveal.round
  } else if (previous) {
    // A snapshot may arrive after the reveal was already cleared on the server.
    const completedHere = state.round === previous.round && (state.phase === 'reveal' || state.phase === 'finished')
    const advancedOnce = state.round === previous.round + 1
    if (previous.round >= 1 && (completedHere || advancedOnce) && previous.deltaRound !== previous.round) {
      deltas = difference(prices, previous.prices); deltaRound = previous.round
    } else if (state.round > previous.round + 1) {
      deltas = null; deltaRound = null
    }
  }
  return { round: state.round, prices, deltas, deltaRound }
}
