import { createClient } from 'npm:@supabase/supabase-js@2'
export const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
export function response(body: unknown, status = 200) { return Response.json(body, { status, headers: cors }) }
export async function context(request: Request) {
  if (request.method !== 'POST') throw new Error('Ожидается POST-запрос')
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new Error('Требуется игровая сессия')
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) throw new Error('Игровая сессия истекла. Войдите заново')
  return { admin, user: data.user }
}
export async function snapshot(admin: Awaited<ReturnType<typeof context>>['admin'], sessionId: string, userId: string) {
  const { data, error } = await admin.rpc('read_v3_game', { p_session: sessionId, p_user: userId })
  if (error) throw new Error('Не удалось загрузить игровую комнату')
  if (!data || data.session.state.schemaVersion !== 3) throw new Error('Эта комната создана в старой версии. Создайте новую')
  return data
}
export function message(error: unknown) { return error instanceof Error ? error.message : 'Не удалось выполнить действие' }
