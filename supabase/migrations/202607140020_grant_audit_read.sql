grant select on public.activity_logs to authenticated;

revoke insert, update, delete on public.activity_logs from anon, authenticated;
