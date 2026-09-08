import requests, json
BASE='https://ryznvfagyywmalpvbfsp.supabase.co'
KEY='sb_publishable_qwofTv84BvSQYvT7qM7_OA_HtUR3KOk'
COMMON={'apikey':KEY,'Authorization':f'Bearer {KEY}','Accept':'application/json'}
TABLES=['profiles','shipping_addresses','payment_methods','payments','orders','order_items','cart_items','wishlist','notifications','user_notification_preferences','return_requests','return_request_items','product_reviews','product_variants','products','categories','product_images']
RPCS=['is_admin_secure','get_admin_users_secure','get_admin_user_details_secure','get_admin_orders_secure','get_admin_order_details_secure','get_admin_returns_secure','get_admin_return_details_secure','get_admin_products_secure','get_admin_product_details_secure','get_admin_categories_secure','get_admin_category_details_secure','get_admin_coupons_secure','get_admin_coupon_details_secure','get_admin_reviews_secure','get_admin_review_details_secure','get_admin_broadcasts_secure','update_order_status_secure','update_return_status_secure','validate_coupon','mark_notification_read_secure','mark_all_notifications_read_secure','register_push_token_secure','unregister_push_token_secure']
FUNCS=['create-order','cancel-order','request-return','submit-review','delete-account','send-push-notification']
result={'tables':{},'rpcs':{},'funcs':{},'storage':{}}
s=requests.Session()
for t in TABLES:
    url=f'{BASE}/rest/v1/{t}?select=*&limit=1'
    r=s.get(url,headers={**COMMON,'Prefer':'count=exact'},timeout=20)
    result['tables'][t]={'status':r.status_code,'content_range':r.headers.get('Content-Range'),'body':r.text[:1000]}
for fn in RPCS:
    r=s.post(f'{BASE}/rest/v1/rpc/{fn}',headers={**COMMON,'Content-Type':'application/json'},json={},timeout=20)
    result['rpcs'][fn]={'status':r.status_code,'body':r.text[:1000]}
for fn in FUNCS:
    r=s.post(f'{BASE}/functions/v1/{fn}',headers={**COMMON,'Content-Type':'application/json'},json={},timeout=20)
    result['funcs'][fn]={'status':r.status_code,'body':r.text[:1000]}
for bucket in ['profile-avatars','product-images','product_images']:
    r=s.post(f'{BASE}/storage/v1/object/list/{bucket}',headers={**COMMON,'Content-Type':'application/json'},json={'prefix':'','limit':5,'offset':0},timeout=20)
    result['storage'][bucket]={'status':r.status_code,'body':r.text[:1000]}
print(json.dumps(result,indent=2))
