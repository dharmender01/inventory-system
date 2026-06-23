#!/usr/bin/env python3
from __future__ import annotations
import json
import os
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any
BASE_URL = os.environ.get('API_URL', 'http://localhost:8000').rstrip('/')
RUN_ID = str(int(time.time()))

@dataclass
class Result:
    section: str
    name: str
    passed: bool
    detail: str = ''

@dataclass
class Suite:
    results: list[Result] = field(default_factory=list)

    def check(self, section: str, name: str, condition: bool, detail: str='') -> None:
        self.results.append(Result(section, name, condition, detail))

    def report(self) -> int:
        passed = sum((1 for r in self.results if r.passed))
        failed = len(self.results) - passed
        width = max((len(r.name) for r in self.results)) if self.results else 20
        print(f"\n{'=' * 72}")
        print(f'  Requirements test — {BASE_URL}')
        print(f"{'=' * 72}\n")
        current = ''
        for r in self.results:
            if r.section != current:
                current = r.section
                print(f'\n[{current}]')
            mark = 'PASS' if r.passed else 'FAIL'
            line = f'  {mark}  {r.name.ljust(width)}'
            if r.detail:
                line += f'  —  {r.detail}'
            print(line)
        print(f"\n{'-' * 72}")
        print(f'  Total: {len(self.results)}   Passed: {passed}   Failed: {failed}')
        print(f"{'=' * 72}\n")
        return 0 if failed == 0 else 1

class ApiClient:

    def __init__(self, base_url: str) -> None:
        self.base = base_url

    def request(self, method: str, path: str, body: dict | None=None, expect: int | None=None) -> tuple[int, Any]:
        url = f'{self.base}{path}'
        data = None
        headers = {'Accept': 'application/json'}
        if body is not None:
            data = json.dumps(body).encode()
            headers['Content-Type'] = 'application/json'
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                status = resp.status
                raw = resp.read().decode()
        except urllib.error.HTTPError as exc:
            status = exc.code
            raw = exc.read().decode()
        except urllib.error.URLError as exc:
            raise RuntimeError(f'Cannot reach {url}: {exc.reason}') from exc
        parsed: Any = None
        if raw:
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                parsed = raw
        if expect is not None and status != expect:
            raise AssertionError(f'{method} {path} expected {expect}, got {status}: {parsed}')
        return (status, parsed)

def run_tests() -> int:
    api = ApiClient(BASE_URL)
    suite = Suite()
    created_product_ids: list[int] = []
    created_customer_ids: list[int] = []
    created_order_ids: list[int] = []
    sku = f'REQ-{RUN_ID}'
    sku_dup = f'DUP-{RUN_ID}'
    email = f'req-{RUN_ID}@example.com'
    email_dup = f'dup-{RUN_ID}@example.com'
    try:
        status, body = api.request('GET', '/health')
        suite.check('Meta', 'GET /health', status == 200 and body == {'status': 'ok'})
    except RuntimeError as exc:
        print(f'\nERROR: {exc}\n')
        print('Start the stack first:  docker compose up --build -d\n')
        return 1
    status, product = api.request('POST', '/products', {'name': f'Test Product {RUN_ID}', 'sku': sku, 'price': 12.5, 'quantity_in_stock': 20, 'low_stock_threshold': 5}, expect=201)
    pid = product['id']
    created_product_ids.append(pid)
    suite.check('§3.1 Products', 'POST /products creates product', status == 201)
    suite.check('§3.1 Products', 'Product has required fields', all((k in product for k in ('name', 'sku', 'price', 'quantity_in_stock'))))
    status, products = api.request('GET', '/products', expect=200)
    suite.check('§3.1 Products', 'GET /products lists products', any((p['id'] == pid for p in products)))
    status, one = api.request('GET', f'/products/{pid}', expect=200)
    suite.check('§3.1 Products', 'GET /products/{id} returns product', one['sku'] == sku)
    status, updated = api.request('PUT', f'/products/{pid}', {'price': 15.0}, expect=200)
    suite.check('§3.1 Products', 'PUT /products/{id} updates product', updated['price'] == 15.0)
    status, _ = api.request('GET', '/products/999999', expect=404)
    suite.check('§3.1 Products', 'GET /products/{id} 404 when missing', status == 404)
    api.request('POST', '/products', {'name': 'First', 'sku': sku_dup, 'price': 1.0, 'quantity_in_stock': 1}, expect=201)
    status, _ = api.request('POST', '/products', {'name': 'Second', 'sku': sku_dup, 'price': 2.0, 'quantity_in_stock': 1})
    suite.check('§4 Business rules', 'Product SKU must be unique (409)', status == 409)
    status, _ = api.request('POST', '/products', {'name': 'Bad Qty', 'sku': f'NEG-Q-{RUN_ID}', 'price': 1.0, 'quantity_in_stock': -1})
    suite.check('§4 Business rules', 'Product quantity cannot be negative (422)', status == 422)
    status, _ = api.request('POST', '/products', {'name': 'Bad Price', 'sku': f'NEG-P-{RUN_ID}', 'price': -1.0, 'quantity_in_stock': 1})
    suite.check('§4 Business rules', 'Product price cannot be negative (422)', status == 422)
    status, _ = api.request('POST', '/products', {'name': 'No SKU'})
    suite.check('§4 Business rules', 'Missing required fields rejected (422)', status == 422)
    status, customer = api.request('POST', '/customers', {'full_name': 'Jane Doe', 'email': email, 'phone': '555-0100'}, expect=201)
    cid = customer['id']
    created_customer_ids.append(cid)
    suite.check('§3.2 Customers', 'POST /customers creates customer', status == 201)
    suite.check('§3.2 Customers', 'Customer has required fields', all((k in customer for k in ('full_name', 'email', 'phone'))))
    status, customers = api.request('GET', '/customers', expect=200)
    suite.check('§3.2 Customers', 'GET /customers lists customers', any((c['id'] == cid for c in customers)))
    status, cust_one = api.request('GET', f'/customers/{cid}', expect=200)
    suite.check('§3.2 Customers', 'GET /customers/{id} returns customer', cust_one['email'] == email)
    status, _ = api.request('GET', '/customers/999999', expect=404)
    suite.check('§3.2 Customers', 'GET /customers/{id} 404 when missing', status == 404)
    api.request('POST', '/customers', {'full_name': 'First', 'email': email_dup}, expect=201)
    status, _ = api.request('POST', '/customers', {'full_name': 'Second', 'email': email_dup})
    suite.check('§4 Business rules', 'Customer email must be unique (409)', status == 409)
    status, order_product = api.request('POST', '/products', {'name': 'Order Widget', 'sku': f'ORD-{RUN_ID}', 'price': 5.0, 'quantity_in_stock': 10}, expect=201)
    opid = order_product['id']
    created_product_ids.append(opid)
    status, order = api.request('POST', '/orders', {'customer_id': cid, 'items': [{'product_id': opid, 'quantity': 3}]}, expect=201)
    oid = order['id']
    created_order_ids.append(oid)
    suite.check('§3.3 Orders', 'POST /orders creates order', status == 201)
    suite.check('§3.3 Orders', 'Order has customer, items, total_amount', order['customer_id'] == cid and len(order['items']) == 1 and ('total_amount' in order))
    suite.check('§4 Business rules', 'Total amount calculated by backend (3 × 5.0 = 15.0)', order['total_amount'] == 15.0)
    _, stock_after = api.request('GET', f'/products/{opid}', expect=200)
    suite.check('§4 Business rules', 'Creating order reduces available stock (10 → 7)', stock_after['quantity_in_stock'] == 7)
    status, orders = api.request('GET', '/orders', expect=200)
    suite.check('§3.3 Orders', 'GET /orders lists orders', any((o['id'] == oid for o in orders)))
    status, order_detail = api.request('GET', f'/orders/{oid}', expect=200)
    suite.check('§3.3 Orders', 'GET /orders/{id} returns order details', order_detail['id'] == oid and len(order_detail['items']) == 1)
    status, _ = api.request('POST', '/orders', {'customer_id': cid, 'items': [{'product_id': opid, 'quantity': 100}]})
    suite.check('§4 Business rules', 'Order blocked when inventory insufficient (409)', status == 409)
    _, stock_unchanged = api.request('GET', f'/products/{opid}', expect=200)
    suite.check('§4 Business rules', 'Stock unchanged after rejected order', stock_unchanged['quantity_in_stock'] == 7)
    status, p2 = api.request('POST', '/products', {'name': 'Second Item', 'sku': f'ORD2-{RUN_ID}', 'price': 4.0, 'quantity_in_stock': 10}, expect=201)
    created_product_ids.append(p2['id'])
    status, multi = api.request('POST', '/orders', {'customer_id': cid, 'items': [{'product_id': opid, 'quantity': 1}, {'product_id': p2['id'], 'quantity': 2}]}, expect=201)
    created_order_ids.append(multi['id'])
    suite.check('§4 Business rules', 'Multi-item total computed (1×5 + 2×4 = 13.0)', multi['total_amount'] == 13.0)
    _, before_cancel = api.request('GET', f'/products/{opid}', expect=200)
    status, _ = api.request('DELETE', f'/orders/{oid}', expect=204)
    _, after_cancel = api.request('GET', f'/products/{opid}', expect=200)
    suite.check('§3.3 Orders', 'DELETE /orders/{id} cancels order (204)', status == 204)
    suite.check('§4 Business rules', 'Deleting order restores stock', after_cancel['quantity_in_stock'] == before_cancel['quantity_in_stock'] + 3)
    created_order_ids.remove(oid)
    status, _ = api.request('GET', '/orders/999999', expect=404)
    suite.check('§3.3 Orders', 'GET /orders/{id} 404 when missing', status == 404)
    status, summary = api.request('GET', '/dashboard/summary', expect=200)
    suite.check('§5 Dashboard', 'GET /dashboard/summary returns totals', all((k in summary for k in ('total_products', 'total_customers', 'total_orders'))))
    suite.check('§5 Dashboard', 'Dashboard includes low stock products', 'low_stock_count' in summary and 'low_stock_products' in summary)
    status, low = api.request('POST', '/products', {'name': 'Low Stock Item', 'sku': f'LOW-{RUN_ID}', 'price': 1.0, 'quantity_in_stock': 2, 'low_stock_threshold': 5}, expect=201)
    created_product_ids.append(low['id'])
    _, summary2 = api.request('GET', '/dashboard/summary', expect=200)
    low_skus = [p['sku'] for p in summary2['low_stock_products']]
    suite.check('§5 Dashboard', 'Low stock products appear in summary', f'LOW-{RUN_ID}' in low_skus)
    status, disposable = api.request('POST', '/products', {'name': 'Disposable', 'sku': f'DEL-{RUN_ID}', 'price': 1.0, 'quantity_in_stock': 1}, expect=201)
    del_pid = disposable['id']
    status, _ = api.request('DELETE', f'/products/{del_pid}', expect=204)
    suite.check('§3.1 Products', 'DELETE /products/{id} removes product (204)', status == 204)
    status, _ = api.request('GET', f'/products/{del_pid}', expect=404)
    suite.check('§3.1 Products', 'Deleted product returns 404', status == 404)
    status, disposable_c = api.request('POST', '/customers', {'full_name': 'To Delete', 'email': f'del-{RUN_ID}@example.com'}, expect=201)
    del_cid = disposable_c['id']
    status, _ = api.request('DELETE', f'/customers/{del_cid}', expect=204)
    suite.check('§3.2 Customers', 'DELETE /customers/{id} removes customer (204)', status == 204)
    status, _ = api.request('GET', f'/customers/{del_cid}', expect=404)
    suite.check('§3.2 Customers', 'Deleted customer returns 404', status == 404)
    for oid in list(created_order_ids):
        try:
            api.request('DELETE', f'/orders/{oid}', expect=204)
        except AssertionError:
            pass
    try:
        api.request('DELETE', f"/orders/{multi['id']}", expect=204)
    except AssertionError:
        pass
    for pid in created_product_ids:
        try:
            api.request('DELETE', f'/products/{pid}', expect=204)
        except AssertionError:
            pass
    for cid in created_customer_ids:
        try:
            api.request('DELETE', f'/customers/{cid}', expect=204)
        except AssertionError:
            pass
    return suite.report()
if __name__ == '__main__':
    sys.exit(run_tests())
