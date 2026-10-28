import { createLobby, submitTurn, exchangeCard, nextRound, startGame, resetGame, createPrivateState, type GameState, type PrivatePlayers, type Turn } from '../_shared/game.ts'
import { context, cors, response, snapshot, message } from '../_shared/api.ts'

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { admin, user } = await context(request)
    const { sessionId, action, cardId, selectedCardId, turn, targetPlayerId, round } = await request.json()
    if (typeof sessionId !== 'string') throw new Error('Не указана комната')
    if (action === 'sync') return response(await snapshot(admin, sessionId, user.id))
    for (let attempt = 0; attempt < 8; attempt++) {
      const { data: session, error: sessionError } = await admin.from('game_sessions').select().eq('id', sessionId).single()
      if (sessionError || !session || session.status !== 'active') throw new Error('Комната закрыта или недоступна')
      if (session.state.schemaVersion !== 3) throw new Error('Это комната старой версии. Создайте новую')
      const { data: seat, error: seatError } = await admin.from('game_seats').select('player_id').eq('session_id', sessionId).eq('user_id', user.id).maybeSingle()
      if (seatError) throw new Error('Не удалось проверить игрока')
      const isHost = session.host_user_id === user.id
      const playerId = seat?.player_id
      if (!isHost && !playerId) throw new Error('Доска не может управлять партией')
      if (action === 'new-lobby') {
        if (!isHost || !playerId || session.state.lobbyMode !== 'first-player') throw new Error('Новое лобби может создать только лидер этой комнаты')
        const oldPlayer = session.state.players.find((p: {id:string}) => p.id === playerId)
        if (!oldPlayer) throw new Error('Игрок не найден')
        const nextPlayer = crypto.randomUUID()
        const nextState = createLobby(nextPlayer,oldPlayer.name); nextState.lobbyMode = 'first-player'
        const nextCode = Array.from(crypto.getRandomValues(new Uint8Array(6)), n => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n % 32]).join('')
        const {data: nextId,error: nextError} = await admin.rpc('restart_display_lobby',{p_session:sessionId,p_actor:user.id,p_code:nextCode,p_player:nextPlayer,p_state:nextState,p_private:createPrivateState()})
        if (nextError || !nextId) throw new Error('Не удалось создать новое лобби. Обновите комнату')
        return response(await snapshot(admin,nextId,user.id))
      }
      let state = session.state as GameState
      const { data: privateRows, error: privateError } = await admin.from('game_player_private').select('player_id,payload').eq('session_id', sessionId)
      if (privateError || !privateRows) throw new Error('Не удалось загрузить карты')
      let privatePlayers = Object.fromEntries(privateRows.map(row => [row.player_id, row.payload])) as PrivatePlayers
      let status = 'active'
      let removePlayer: string | null = null
      const hostOnly = ['start', 'continue', 'reset', 'close', 'remove-player'].includes(action)
      if (hostOnly) {
        if (!isHost) throw new Error('Это действие доступно только главному игроку')
        if (action === 'start') state = startGame(state)
        else if (action === 'continue') ({ state, privatePlayers } = nextRound(state, privatePlayers))
        else if (action === 'reset') {
          state = resetGame(state)
          privatePlayers = Object.fromEntries(state.players.map(p => [p.id, createPrivateState()]))
        } else if (action === 'remove-player') {
          if (state.phase !== 'lobby' || typeof targetPlayerId !== 'string' || targetPlayerId === playerId) throw new Error('Удалять других игроков можно только из лобби')
          if (!state.players.some(p => p.id === targetPlayerId)) throw new Error('Игрок не найден')
          state.players = state.players.filter(p => p.id !== targetPlayerId); delete privatePlayers[targetPlayerId]; removePlayer = targetPlayerId
        } else status = 'closed'
      } else {
        if (!playerId || !privatePlayers[playerId]) throw new Error('Вы не участвуете в этой партии')
        if (action === 'exchange-card') {
          if (round !== state.round) throw new Error('Раунд уже завершён')
          const own = privatePlayers[playerId]
          own.selectedCardId = own.hand.some(c => c.id === selectedCardId) ? selectedCardId : null
          privatePlayers[playerId] = exchangeCard(state, playerId, own, cardId)
        } else if (action === 'submit-turn') ({ state, privatePlayers } = submitTurn(state, playerId, privatePlayers, turn as Turn))
        else throw new Error('Неизвестное игровое действие')
      }
      const { data: committed, error } = await admin.rpc('commit_v3_game', { p_session: sessionId, p_version: session.version, p_state: state, p_private: privatePlayers, p_status: status, p_remove_player: removePlayer, p_actor: user.id, p_host_only: hostOnly })
      if (error?.code === '40001' || (!error && !committed?.length)) continue
      if (error) throw new Error('Не удалось сохранить ход. Повторите действие')
      return response(await snapshot(admin, sessionId, user.id))
    }
    throw new Error('Слишком много одновременных действий. Повторите ход')
  } catch (error) { return response({ error: message(error) }, 400) }
})
