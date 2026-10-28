import { afterEach,describe,it,expect,vi } from 'vitest'
import { timedFetch } from '../lib/timedFetch'
afterEach(()=>vi.useRealTimers())
describe('Bounded server requests',()=>{
 it('aborts a stalled connection instead of leaving startup pending forever',async()=>{
  vi.useFakeTimers()
  const base=vi.fn((_input,init)=>new Promise<Response>((_resolve,reject)=>init.signal.addEventListener('abort',()=>reject(init.signal.reason))))
  const pending=timedFetch(base as typeof fetch,100)('https://example.test/')
  const assertion=expect(pending).rejects.toMatchObject({name:'TimeoutError'})
  await vi.advanceTimersByTimeAsync(100);await assertion
  expect(vi.getTimerCount()).toBe(0)
 })
 it('returns successful responses and clears its timeout',async()=>{
  vi.useFakeTimers(); const response=new Response('ok')
  const base=vi.fn().mockResolvedValue(response)
  expect(await timedFetch(base,100)('https://example.test/')).toBe(response)
  expect(vi.getTimerCount()).toBe(0)
 })
 it('preserves caller cancellation',async()=>{
  const external=new AbortController()
  const base=vi.fn((_input,init)=>new Promise<Response>((_resolve,reject)=>init.signal.addEventListener('abort',()=>reject(init.signal.reason))))
  const pending=timedFetch(base as typeof fetch)('https://example.test/',{signal:external.signal})
  external.abort();await expect(pending).rejects.toMatchObject({name:'AbortError'})
 })
})
