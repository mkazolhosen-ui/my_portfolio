select au.user_id, u.email
from public.admin_users au
join auth.users u on u.id = au.user_id;