begin;

create index if not exists excloth_orders_user_created_id_idx
  on public.orders (user_id, created_at desc, id desc);

create index if not exists excloth_orders_created_id_idx
  on public.orders (created_at desc, id desc);

create index if not exists excloth_return_requests_user_order_requested_idx
  on public.return_requests (user_id, order_id, requested_at desc);

create index if not exists excloth_products_active_created_id_idx
  on public.products (created_at desc, id desc)
  where is_active is true;

create index if not exists excloth_products_featured_created_id_idx
  on public.products (created_at desc, id desc)
  where is_active is true and is_featured is true;

create index if not exists excloth_products_new_created_id_idx
  on public.products (created_at desc, id desc)
  where is_active is true and is_new is true;

create index if not exists excloth_products_popular_created_id_idx
  on public.products (created_at desc, id desc)
  where is_active is true and is_popular is true;

create index if not exists excloth_products_sale_created_id_idx
  on public.products (created_at desc, id desc)
  where is_active is true and old_price > 0;

create index if not exists excloth_product_categories_category_product_idx
  on public.product_categories (category_id, product_id);

create index if not exists excloth_product_images_product_sort_idx
  on public.product_images (product_id, sort_order);

create index if not exists excloth_product_variants_product_id_idx
  on public.product_variants (product_id, id);

create index if not exists excloth_product_reviews_approved_product_idx
  on public.product_reviews (product_id)
  include (rating)
  where is_approved is true;

create index if not exists excloth_categories_active_sort_idx
  on public.categories (sort_order, id)
  where is_active is true;

create index if not exists excloth_cart_items_user_created_idx
  on public.cart_items (user_id, created_at desc);

create index if not exists excloth_notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists excloth_wishlist_user_created_idx
  on public.wishlist (user_id, created_at desc);

create index if not exists excloth_order_items_order_created_idx
  on public.order_items (order_id, created_at);

create index if not exists excloth_order_items_product_order_idx
  on public.order_items (product_id, order_id);

commit;
