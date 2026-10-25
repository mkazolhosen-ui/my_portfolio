insert into public.admin_users (user_id)
select id from auth.users where email = 'mkazolhosen@gmail.com';
