import { describe,it,expect } from 'vitest'
import { newHubKey,normalizeHubKey,compactHubKey,hashHubKey } from '../../supabase/functions/_shared/hubKey'
describe('Compact hub keys',()=>{
 it('generates eight easy-to-type characters',()=>{for(let i=0;i<50;i++)expect(newHubKey()).toMatch(/^[A-HJ-NP-Z2-9]{8}$/)})
 it('accepts lowercase, spaces and a separator for short keys without changing legacy keys',()=>{expect(normalizeHubKey(' abcd-2345 ')).toBe('ABCD2345');expect(normalizeHubKey('uuid-legacy-key')).toBe('uuid-legacy-key')})
 it('migrates deterministically and hashes normalized short keys',async()=>{const old='12345678-1234-1234-1234-123456789012-ABC234';const key=await compactHubKey(old);expect(key).toHaveLength(8);expect(await compactHubKey(old)).toBe(key);expect(await hashHubKey(key.toLowerCase())).toBe(await hashHubKey(key));expect(await hashHubKey(old)).not.toBe(await hashHubKey(key))})
})
