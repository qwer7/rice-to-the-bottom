import type { InfluenceType, Purchase } from '../../supabase/functions/_shared/game'

export const influenceIcons: Record<InfluenceType, string> = {
  dividends: '◈', broker: '↔', analyst: '⌕', tax: '%', theft: '↯', lucky: '★',
}
export const purchaseIcon = (purchase: Purchase) => purchase === 'victory' ? '♛' : influenceIcons[purchase]
