import json, os, uuid, requests
BASE='https://ryznvfagyywmalpvbfsp.supabase.co'
KEY='sb_publishable_qwofTv84BvSQYvT7qM7_OA_HtUR3KOk'
S=requests.Session()
common={'apikey':KEY,'Authorization':f'Bearer {KEY}'}
results={}
# basic endpoints
for name, method, url, headers, data in [
    ('auth_settings','GET',f'{BASE}/auth/v1/settings',common,None),
    ('rest_products_head','GET',f'{BASE}/rest/v1/products?select=id&limit=1', {**common,'Accept':'application/json'}, None),
    ('rpc_is_admin_anon','POST',f'{BASE}/rest/v1/rpc/is_admin_secure', {**common,'Content-Type':'application/json'}, {}),
    ('rpc_admin_orders_anon','POST',f'{BASE}/rest/v1/rpc/get_admin_orders_secure', {**common,'Content-Type':'application/json'}, {}),
    ('storage_list_profile_anon','POST',f'{BASE}/storage/v1/object/list/profile-avatars', {**common,'Content-Type':'application/json'}, {'limit':10,'offset':0,'sortBy':{'column':'name','order':'asc'}}),
    ('storage_list_product_anon','POST',f'{BASE}/storage/v1/object/list/product-images', {**common,'Content-Type':'application/json'}, {'limit':10,'offset':0,'sortBy':{'column':'name','order':'asc'}}),
    ('storage_list_product2_anon','POST',f'{BASE}/storage/v1/object/list/product_images', {**common,'Content-Type':'application/json'}, {'limit':10,'offset':0,'sortBy':{'column':'name','order':'asc'}}),
]:
    try:
        resp=S.request(method,url,headers=headers,json=data,timeout=20)
        results[name]={'status':resp.status_code,'headers':dict(resp.headers),'body':resp.text[:1200]}
    except Exception as e:
        results[name]={'error':repr(e)}
# signup attempts for 2 users
for idx in [1,2]:
    email=f'strix-excloth-{uuid.uuid4().hex[:10]}-{idx}@example.com'
    password='Strix!23456'
    payload={'email':email,'password':password,'data':{'first_name':f'Test{idx}','last_name':'User','phone':f'555000{idx}'}}
    try:
        resp=S.post(f'{BASE}/auth/v1/signup',headers={**common,'Content-Type':'application/json'},json=payload,timeout=20)
        results[f'signup_{idx}']={'email':email,'password':password,'status':resp.status_code,'body':resp.text[:2000]}
    except Exception as e:
        results[f'signup_{idx}']={'email':email,'password':password,'error':repr(e)}
print(json.dumps(results,indent=2))
