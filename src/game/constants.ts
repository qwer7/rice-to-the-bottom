import type { CompanyId, CompanyMeta } from './types'
export { COMPANY_IDS, DEFAULT_CONFIG } from '../../supabase/functions/_shared/game'
export const COMPANIES: CompanyMeta[] = [
  { id: 'REDSTONE', name: 'REDSTONE', color: '#ff8178', industry: 'Добыча и сырьё' },
  { id: 'BLUEWELL', name: 'BLUEWELL', color: '#7aaeff', industry: 'Медицина и технологии' },
  { id: 'GOLDSPARK', name: 'GOLDSPARK', color: '#eac85b', industry: 'Энергетика' },
]
export function companyMeta(id: CompanyId): CompanyMeta { return COMPANIES.find(c => c.id === id)! }
