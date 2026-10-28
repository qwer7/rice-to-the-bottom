export function timedFetch(base: typeof fetch, timeoutMs = 15000): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController()
    const source = init?.signal ?? (input instanceof Request ? input.signal : undefined)
    const abort = () => controller.abort(source?.reason)
    if (source?.aborted) abort()
    else source?.addEventListener('abort',abort,{once:true})
    const timer = setTimeout(() => controller.abort(new DOMException('Время подключения к серверу истекло','TimeoutError')),timeoutMs)
    const diagnostic = typeof location !== 'undefined' && new URLSearchParams(location.search).get('screen') === 'tv'
    let path = ''
    if (diagnostic) {
      try { path = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url).pathname } catch { path = '/request' }
      console.info(`RaceTV: request ${path}`)
    }
    try {
      const response = await base(input,{...init,signal:controller.signal})
      if (diagnostic) console.info(`RaceTV: response ${response.status} ${path}`)
      return response
    } catch (e) {
      if (diagnostic) console.error(`RaceTV: connection failed ${path}: ${e instanceof Error ? e.name : 'network'}`)
      throw e
    } finally {
      clearTimeout(timer); source?.removeEventListener('abort',abort)
    }
  }
}
