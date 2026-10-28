begin;
alter table public.game_hubs add column display_secret_hash text;
create table public.game_display_redirects (old_id uuid primary key, new_id uuid not null, secret_hash text not null);
alter table public.game_display_redirects enable row level security;
update public.game_sessions set state=jsonb_set(state,'{matchId}',to_jsonb(gen_random_uuid()::text)) where not state ? 'matchId';

create function public.open_display_v2(p_user uuid,p_hub uuid,p_secret_hash text,p_code text,p_hub_code text,p_state jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare h public.game_hubs; sid uuid; room_code text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  if p_hub is not null then
    select * into h from public.game_hubs where id=p_hub and mode='display' for update;
    if h.id is null then
      select gh.* into h from public.game_display_redirects r join public.game_hubs gh on gh.id=r.new_id where r.old_id=p_hub and r.secret_hash=p_secret_hash and gh.mode='display' for update of gh;
    end if;
    if h.id is null then raise exception 'DISPLAY_NOT_FOUND'; end if;
    if h.display_secret_hash is null and h.owner_user_id=p_user then
      update public.game_hubs set display_secret_hash=p_secret_hash where id=h.id returning * into h;
    elsif h.display_secret_hash is distinct from p_secret_hash then raise exception 'DISPLAY_INVALID_SECRET'; end if;
    if h.owner_user_id is distinct from p_user then
      if exists(select 1 from public.game_hubs where owner_user_id=p_user and mode='display' and id<>h.id) then raise exception 'DISPLAY_OWNER_CONFLICT'; end if;
      update public.game_hubs set owner_user_id=p_user where id=h.id returning * into h;
    end if;
  else
    select * into h from public.game_hubs where owner_user_id=p_user and mode='display' for update;
    if h.id is not null then
      if h.display_secret_hash is not null and h.display_secret_hash<>p_secret_hash then raise exception 'DISPLAY_INVALID_SECRET'; end if;
      update public.game_hubs set display_secret_hash=p_secret_hash where id=h.id returning * into h;
    else
      insert into public.game_hubs(code,key_hash,owner_user_id,mode,display_secret_hash) values(p_hub_code,gen_random_uuid()::text,p_user,'display',p_secret_hash) returning * into h;
    end if;
  end if;
  select id,code into sid,room_code from public.game_sessions where id=h.active_session_id and status='active';
  if sid is null then
    insert into public.game_sessions(code,host_user_id,state) values(p_code,null,p_state) returning id,code into sid,room_code;
    update public.game_hubs set active_session_id=sid,main_user_id=null where id=h.id;
  end if;
  insert into public.game_viewers(session_id,user_id) values(sid,p_user) on conflict do nothing;
  return jsonb_build_object('id',h.id,'code',h.code,'mode','display','isDisplayOwner',true,'sessionId',sid,'roomCode',room_code,'isManager',false);
end; $$;
revoke all on function public.open_display_v2(uuid,uuid,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.open_display_v2(uuid,uuid,text,text,text,jsonb) to service_role;

create function public.change_display_v2(p_user uuid,p_hub uuid,p_secret_hash text,p_action text,p_code text,p_hub_code text,p_state jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare h public.game_hubs; s public.game_sessions; sid uuid; nh public.game_hubs;
begin
  select * into h from public.game_hubs where id=p_hub and mode='display';
  if h.id is null or h.owner_user_id<>p_user or h.display_secret_hash is distinct from p_secret_hash then raise exception 'DISPLAY_FORBIDDEN'; end if;
  select * into s from public.game_sessions where id=h.active_session_id for update;
  select * into h from public.game_hubs where id=p_hub for update;
  if h.id is null or h.owner_user_id<>p_user or h.display_secret_hash is distinct from p_secret_hash or h.active_session_id is distinct from s.id or s.status<>'active' then raise exception 'DISPLAY_CHANGED'; end if;
  if p_action='rotate' then
    update public.game_sessions set code=p_code,version=version+1,updated_at=now() where id=s.id;
    sid:=s.id;
  elsif p_action='reset' then
    update public.game_sessions set status='closed',version=version+1,updated_at=now() where id=s.id;
    delete from public.game_hubs where id=h.id;
    insert into public.game_hubs(code,key_hash,owner_user_id,mode,display_secret_hash) values(p_hub_code,gen_random_uuid()::text,p_user,'display',p_secret_hash) returning * into nh;
    update public.game_display_redirects set new_id=nh.id where new_id=h.id and secret_hash=p_secret_hash;
    insert into public.game_display_redirects(old_id,new_id,secret_hash) values(h.id,nh.id,p_secret_hash);
    insert into public.game_sessions(code,host_user_id,state) values(p_code,null,p_state) returning id into sid;
    update public.game_hubs set active_session_id=sid where id=nh.id;
    insert into public.game_viewers(session_id,user_id) values(sid,p_user) on conflict do nothing;
    h:=nh;
  else raise exception 'UNKNOWN_ACTION'; end if;
  return jsonb_build_object('id',h.id,'code',h.code,'mode','display','isDisplayOwner',true,'sessionId',sid,'roomCode',p_code,'isManager',false);
end; $$;
revoke all on function public.change_display_v2(uuid,uuid,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.change_display_v2(uuid,uuid,text,text,text,text,jsonb) to service_role;
commit;
