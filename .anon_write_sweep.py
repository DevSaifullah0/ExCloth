import requests, json, uuid
BASE='https://ryznvfagyywmalpvbfsp.supabase.co'
KEY='sb_publishable_qwofTv84BvSQYvT7qM7_OA_HtUR3KOk'
H={'apikey':KEY,'Authorization':f'Bearer {KEY}','Content-Type':'application/json','Prefer':'return=representation'}
checks=[
 ('profiles_insert',f'{BASE}/rest/v1/profiles',{'id':str(uuid.uuid4()),'first_name':'Anon','last_name':'Write'}),
 ('notifications_insert',f'{BASE}/rest/v1/notifications',{'user_id':str(uuid.uuid4()),'title':'x','message':'y'}),
 ('wishlist_insert',f'{BASE}/rest/v1/wishlist',{'user_id':str(uuid.uuid4()),'product_id':1}),
 ('cart_insert',f'{BASE}/rest/v1/cart_items',{'user_id':str(uuid.uuid4()),'product_id':1,'quantity':1}),
 ('review_insert',f'{BASE}/rest/v1/product_reviews',{'product_id':1,'rating':5,'title':'Anon','review_text':'test'}),
 ('address_insert',f'{BASE}/rest/v1/shipping_addresses',{'user_id':str(uuid.uuid4()),'full_name':'A','phone':'1','address_line_1':'x','city':'y','state':'z','country':'c','postal_code':'1'}),
]
res={}
for name,url,body in checks:
    r=requests.post(url,headers=H,json=body,timeout=20)
    res[name]={'status':r.status_code,'body':r.text[:1200]}
for bucket in ['profile-avatars','product-images','product_images']:
    r=requests.post(f'{BASE}/storage/v1/object/{bucket}/strix-test-{uuid.uuid4().hex[:6]}.txt',headers={'apikey':KEY,'Authorization':f'Bearer {KEY}','x-upsert':'false','Content-Type':'text/plain'},data=b'test',timeout=20)
    res[f'upload_{bucket}']={'status':r.status_code,'body':r.text[:1200]}
print(json.dumps(res,indent=2))
