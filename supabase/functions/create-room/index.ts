import { createLobby, createDisplayLobby, createPrivateState, cleanName } from '../_shared/game.ts'
import { context, cors, response, snapshot, message } from '../_shared/api.ts'
const code = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), n => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n % 32]).join('')
import { newHubKey, normalizeHubKey, hashHubKey, compactHubKey } from '../_shared/hubKey.ts'
// Preserve the original hash as a login alias while giving old hubs a short key.
async function upgradeKey(admin: Awaited<ReturnType<typeof context>>['admin'], hubId: string, supplied: unknown): Promise<string | undefined> {
  if (typeof supplied !== 'string' || supplied.length <= 8 || supplied.length > 100) return
  const oldHash = await hashHubKey(supplied)
  const {data: row,error: readError} = await admin.from('game_hubs').select('key_hash,legacy_key_hash').eq('id',hubId).single()
  if (readError || !row || (row.key_hash !== oldHash && row.legacy_key_hash !== oldHash)) return
  const short = await compactHubKey(supplied)
  const shortHash = await hashHubKey(short)
  if (row.legacy_key_hash === oldHash && row.key_hash === shortHash) return short
  const {data: updated,error} = await admin.from('game_hubs').update({key_hash:shortHash,legacy_key_hash:oldHash}).eq('id',hubId).eq('key_hash',oldHash).select('id')
  if (error) throw new Error('Не удалось сократить ключ хаба. Повторите попытку')
  if (!updated?.length) {
    const {data: current} = await admin.from('game_hubs').select('key_hash,legacy_key_hash').eq('id',hubId).single()
    if (current?.key_hash !== shortHash || current?.legacy_key_hash !== oldHash) throw new Error('Ключ хаба изменился. Войдите заново')
  }
  return short
}
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { admin, user } = await context(request)
    const { action, hubId, hubCode, key, name } = await request.json()
    if (action === 'open-display') {
      const {data: display,error} = await admin.rpc('open_display_lobby',{p_user:user.id,p_code:code(),p_hub_code:code(),p_state:createDisplayLobby()})
      if (error || !display) throw new Error('Не удалось открыть лобби на доске. Повторите подключение')
      return response({hub:display,...await snapshot(admin,display.sessionId,user.id)})
    }
    if (action === 'create-hub') {
      const mainKey = newHubKey()
      const { data: hub, error } = await admin.from('game_hubs').insert({ code: code(), key_hash: await hashHubKey(mainKey), owner_user_id: user.id }).select('id,code').single()
      if (error) throw new Error('Не удалось создать хаб')
      return response({ hub: { ...hub, sessionId: null, isManager: false, key: mainKey } })
    }
    if (action === 'connect-main') {
      if (typeof key !== 'string' || key.length > 100) throw new Error('Введите ключ главного игрока')
      const normalized = normalizeHubKey(key)
      const keyHash = await hashHubKey(normalized)
      const {data: target,error: findError} = await admin.from('game_hubs').select('id,key_hash').or(`key_hash.eq.${keyHash},legacy_key_hash.eq.${keyHash}`).maybeSingle()
      if (findError || !target) throw new Error('Ключ главного игрока не найден')
      const compact = await upgradeKey(admin,target.id,normalized)
      const { data: hub, error } = await admin.rpc('connect_game_hub', { p_hash: compact ? await hashHubKey(compact) : target.key_hash, p_user: user.id })
      if (error || !hub) throw new Error('Ключ главного игрока не найден')
      return response({ hub: { ...hub,key:compact ?? normalized } })
    }
    const query = admin.from('game_hubs').select('id,code,mode,owner_user_id,main_user_id,active_session_id')
    const { data: hub, error: hubError } = hubId ? await query.eq('id',hubId).single() : await query.eq('code',String(hubCode).trim().toUpperCase()).single()
    if (hubError || !hub) throw new Error('Хаб не найден')
    if (action === 'hub-sync') {
      const compact = await upgradeKey(admin,hub.id,key)
      const { data: active } = hub.active_session_id ? await admin.from('game_sessions').select('status,code').eq('id',hub.active_session_id).maybeSingle() : { data:null }
      return response({ hub: { id:hub.id,code:hub.code,mode:hub.mode,isDisplayOwner:hub.owner_user_id===user.id,...(compact ? {key:compact} : {}),isManager:hub.main_user_id===user.id,sessionId:active?.status==='active'?hub.active_session_id:null,roomCode:active?.status==='active'?active.code:null } })
    }
    if (hub.main_user_id !== user.id) throw new Error('Введите ключ главного игрока')
    const playerId = crypto.randomUUID()
    const state = createLobby(playerId,cleanName(name))
    const { data: sessionId, error } = await admin.rpc('create_hub_room', { p_hub:hub.id,p_user:user.id,p_code:code(),p_player:playerId,p_state:state,p_private:createPrivateState() })
    if (error || !sessionId) throw new Error('Закройте текущее лобби перед созданием нового')
    return response(await snapshot(admin,sessionId,user.id))
  } catch(error) { return response({ error:message(error) },400) }
})
