import { addPlayer, createPrivateState, cleanName, type GameState } from '../_shared/game.ts'
import { context, cors, response, snapshot, message } from '../_shared/api.ts'

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { admin, user } = await context(request)
    const { code, name, role } = await request.json()
    const normalized = String(code).trim().toUpperCase()
    if (!/^[A-Z0-9]{6}$/.test(normalized)) throw new Error('Введите шестисимвольный код комнаты')
    const playerId = crypto.randomUUID()
    for (let attempt = 0; attempt < 8; attempt++) {
      const { data: session, error } = await admin.from('game_sessions').select().eq('code', normalized).eq('status', 'active').single()
      if (error || !session) throw new Error('Комната не найдена или уже закрыта')
      if (session.state.schemaVersion !== 3) throw new Error('Это комната старой версии. Создайте новую')
      if (role === 'board') {
        const { error: viewerError } = await admin.from('game_viewers').upsert({ session_id: session.id, user_id: user.id })
        if (viewerError) throw new Error('Не удалось подключить доску')
        return response(await snapshot(admin, session.id, user.id))
      }
      const { data: existing, error: seatError } = await admin.from('game_seats').select('player_id').eq('session_id', session.id).eq('user_id', user.id).maybeSingle()
      if (seatError) throw new Error('Не удалось проверить место игрока')
      if (existing) return response(await snapshot(admin, session.id, user.id))
      const state = addPlayer(session.state as GameState, playerId, cleanName(name))
      const { data: committed, error: commitError } = await admin.rpc('commit_v3_game', { p_session: session.id, p_version: session.version, p_state: state,
        p_private: { [playerId]: createPrivateState() }, p_join_user: user.id, p_join_player: playerId })
      if (commitError?.code === '40001' || commitError?.code === '23505' || (!commitError && !committed?.length)) continue
      if (commitError) { console.error('join commit', commitError); throw new Error('Не удалось присоединиться к комнате') }
      return response(await snapshot(admin, session.id, user.id))
    }
    throw new Error('Комната занята обработкой подключений. Повторите вход')
  } catch (error) { return response({ error: message(error) }, 400) }
})
