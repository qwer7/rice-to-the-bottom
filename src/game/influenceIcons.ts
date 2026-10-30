import type { InfluenceType } from '../../supabase/functions/_shared/game'
import dividends from '@/assets/influence-icons-48x48/dividends.png'
import broker from '@/assets/influence-icons-48x48/broker.png'
import analyst from '@/assets/influence-icons-48x48/analyst.png'
import tax from '@/assets/influence-icons-48x48/tax.png'
import theft from '@/assets/influence-icons-48x48/theft.png'
import lucky from '@/assets/influence-icons-48x48/lucky.png'

export const influenceIcons: Record<InfluenceType, string> = { dividends, broker, analyst, tax, theft, lucky }
