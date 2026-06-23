from tests.conftest import make_customer, make_product

def test_product_crud_and_status_codes(client):
    created = make_product(client, sku='P-1')
    pid = created['id']
    assert client.get('/products').status_code == 200
    assert client.get(f'/products/{pid}').status_code == 200
    r = client.put(f'/products/{pid}', json={'price': 9.5})
    assert r.status_code == 200 and r.json()['price'] == 9.5
    assert client.delete(f'/products/{pid}').status_code == 204
    assert client.get(f'/products/{pid}').status_code == 404

def test_duplicate_sku_conflicts(client):
    make_product(client, sku='DUP')
    r = client.post('/products', json={'name': 'Other', 'sku': 'DUP', 'price': 1.0, 'quantity_in_stock': 1})
    assert r.status_code == 409

def test_negative_quantity_and_price_rejected(client):
    assert client.post('/products', json={'name': 'X', 'sku': 'NEG-Q', 'price': 1.0, 'quantity_in_stock': -1}).status_code == 422
    assert client.post('/products', json={'name': 'X', 'sku': 'NEG-P', 'price': -1.0, 'quantity_in_stock': 1}).status_code == 422

def test_missing_fields_rejected(client):
    assert client.post('/products', json={'name': 'NoSku'}).status_code == 422

def test_customer_create_list_delete_and_unique_email(client):
    make_customer(client, email='dup@e.com')
    assert client.post('/customers', json={'full_name': 'B', 'email': 'dup@e.com'}).status_code == 409
    assert client.get('/customers').status_code == 200

def test_no_customer_update_route(client):
    c = make_customer(client, email='c@e.com')
    assert client.put(f"/customers/{c['id']}", json={'full_name': 'Z'}).status_code == 405

def test_no_order_update_route(client):
    p = make_product(client, sku='OU-1', qty=5)
    c = make_customer(client, email='ou@e.com')
    o = client.post('/orders', json={'customer_id': c['id'], 'items': [{'product_id': p['id'], 'quantity': 1}]}).json()
    assert client.put(f"/orders/{o['id']}", json={}).status_code == 405

def test_order_reduces_stock_and_computes_total(client):
    p = make_product(client, sku='O-1', qty=10, price=5.0)
    c = make_customer(client, email='o@e.com')
    r = client.post('/orders', json={'customer_id': c['id'], 'items': [{'product_id': p['id'], 'quantity': 3}], 'total_amount': 99999})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body['total_amount'] == 15.0
    assert client.get(f"/products/{p['id']}").json()['quantity_in_stock'] == 7

def test_order_insufficient_stock_blocked(client):
    p = make_product(client, sku='O-2', qty=2, price=5.0)
    c = make_customer(client, email='o2@e.com')
    r = client.post('/orders', json={'customer_id': c['id'], 'items': [{'product_id': p['id'], 'quantity': 5}]})
    assert r.status_code == 409
    assert client.get(f"/products/{p['id']}").json()['quantity_in_stock'] == 2

def test_order_multiple_items_total(client):
    p1 = make_product(client, sku='M-1', qty=10, price=2.5)
    p2 = make_product(client, sku='M-2', qty=10, price=4.0)
    c = make_customer(client, email='m@e.com')
    r = client.post('/orders', json={'customer_id': c['id'], 'items': [{'product_id': p1['id'], 'quantity': 2}, {'product_id': p2['id'], 'quantity': 3}]})
    assert r.status_code == 201
    assert r.json()['total_amount'] == 17.0

def test_order_bad_references(client):
    c = make_customer(client, email='b@e.com')
    assert client.post('/orders', json={'customer_id': 9999, 'items': [{'product_id': 1, 'quantity': 1}]}).status_code == 404
    p = make_product(client, sku='BR-1')
    assert client.post('/orders', json={'customer_id': c['id'], 'items': [{'product_id': 9999, 'quantity': 1}]}).status_code == 404

def test_delete_order_restores_stock(client):
    p = make_product(client, sku='D-1', qty=10, price=5.0)
    c = make_customer(client, email='d@e.com')
    o = client.post('/orders', json={'customer_id': c['id'], 'items': [{'product_id': p['id'], 'quantity': 4}]}).json()
    assert client.get(f"/products/{p['id']}").json()['quantity_in_stock'] == 6
    assert client.delete(f"/orders/{o['id']}").status_code == 204
    assert client.get(f"/products/{p['id']}").json()['quantity_in_stock'] == 10

def test_cannot_delete_referenced_product_or_customer(client):
    p = make_product(client, sku='R-1', qty=10, price=5.0)
    c = make_customer(client, email='r@e.com')
    client.post('/orders', json={'customer_id': c['id'], 'items': [{'product_id': p['id'], 'quantity': 1}]})
    assert client.delete(f"/products/{p['id']}").status_code == 409
    assert client.delete(f"/customers/{c['id']}").status_code == 409

def test_dashboard_summary_and_low_stock(client):
    make_product(client, sku='HI', qty=100, threshold=5)
    make_product(client, sku='LO', qty=2, threshold=5)
    make_customer(client, email='dash@e.com')
    r = client.get('/dashboard/summary')
    assert r.status_code == 200
    body = r.json()
    assert body['total_products'] == 2
    assert body['total_customers'] == 1
    assert body['low_stock_count'] == 1
    assert body['low_stock_products'][0]['sku'] == 'LO'

def test_health(client):
    assert client.get('/health').json() == {'status': 'ok'}

def test_404s(client):
    assert client.get('/products/123').status_code == 404
    assert client.get('/customers/123').status_code == 404
    assert client.get('/orders/123').status_code == 404
