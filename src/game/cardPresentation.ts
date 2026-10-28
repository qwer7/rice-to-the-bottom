import type { Card } from './types'
import { companyMeta } from './constants'
export function cardTheme(card: Card) {
  const a = companyMeta(card.kind === 'pair' ? card.up : card.kind === 'single' ? card.company : card.a).color
  const b = companyMeta(card.kind === 'pair' ? card.down : card.kind === 'single' ? card.company : card.b).color
  return { '--card-color-a':a, '--card-color-b':b, '--card-glow-a':a+'2b', '--card-glow-b':b+'18' }
}
