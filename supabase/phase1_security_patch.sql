-- Phase 1 security hardening for XeroLink.
-- Apply this after the base schema so delivery access is scoped to real delivery users.

begin;

drop policy if exists "Delivery boys can view ready orders" on orders;
drop policy if exists "Delivery boys can mark orders delivered" on orders;
drop policy if exists "Delivery users can view student contacts for delivery" on users;

create policy "Delivery users can view ready or delivered orders" on orders for
select
  using (
    coalesce(auth.jwt () -> 'user_metadata' ->> 'role', '') = 'delivery'
    and status in ('ready', 'delivered')
  );

create policy "Delivery users can mark ready orders delivered" on orders
for update
  using (
    coalesce(auth.jwt () -> 'user_metadata' ->> 'role', '') = 'delivery'
    and status = 'ready'
  )
with
  check (
    coalesce(auth.jwt () -> 'user_metadata' ->> 'role', '') = 'delivery'
    and status = 'delivered'
  );

create policy "Delivery users can view student contacts for delivery" on users for
select
  using (
    coalesce(auth.jwt () -> 'user_metadata' ->> 'role', '') = 'delivery'
    and exists (
      select
        1
      from
        orders
      where
        orders.user_id = users.id
        and orders.status in ('ready', 'delivered')
    )
  );

commit;
