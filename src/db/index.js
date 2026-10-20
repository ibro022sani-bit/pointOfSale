import Dexie from 'dexie'

const db = new Dexie('SadeeqAgrovetDB')

db.version(1).stores({
  products: 'id, name, category, barcode, branch_id',
  stock: 'id, product_id, branch_id',
  sales: 'id, offline_id, synced, created_at',
  sale_items: 'id, sale_id',
  payments: 'id, sale_id',
  carts: 'id, cashier_id, status',
  cart_items: 'id, cart_id',
  pending_sync: 'id, type, created_at'
})

db.version(2).stores({
  branch_product_cache: '[branch_id+product_id], branch_id, product_id, name, barcode',
  pending_sales: 'offline_id, status, created_at',
})

db.version(3).stores({
  customer_cache: 'id, name, phone',
})

// v4: caches + queues for everything else made offline-capable —
// today's sales view, customer edits, dashboard summary, loose cart
// items/close, and credit repayments.
db.version(4).stores({
  sales_cache: 'id, branch_id, created_at',
  pending_customer_edits: 'offline_id, customer_id, status, created_at',
  dashboard_cache: 'branch_id, updated_at',
  cart_cache: 'branch_id, updated_at',
  pending_cart_items: 'offline_id, cart_id, status, created_at',
  pending_cart_close: 'offline_id, cart_id, status, created_at',
  pending_repayments: 'offline_id, customer_id, status, created_at',
})

export default db