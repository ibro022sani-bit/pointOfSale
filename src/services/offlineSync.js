import db from '../db'
import api from './api'
import { createSale, confirmCashPayment, confirmTransferPayment, confirmPOSPayment } from './salesService'

export function isOnline() {
  return navigator.onLine
}

export function generateOfflineId() {
  return `offline_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

// Pulls the branch's full product+stock list from the server and saves
// it locally. Call this whenever POS loads while online, so there's
// always a reasonably fresh cache ready if the connection drops later.
export async function refreshBranchCache(branchId) {
  if (!branchId || !isOnline()) return
  try {
    const res = await api.get('/api/products/branch/' + branchId)
    if (!res.data.success) return
    const products = res.data.data // shape: { product_id, products: {...}, ...stock fields per earlier confirmed pattern }

    await db.branch_product_cache.where('branch_id').equals(branchId).delete()
    const rows = products.map((p) => ({
      branch_id: branchId,
      product_id: p.product_id || p.id,
      name: p.products?.name || p.name,
      barcode: p.products?.barcode || p.barcode || null,
      category: p.products?.category || p.category,
      price: p.products?.price ?? p.price,
      wholesale_price: p.products?.wholesale_price ?? p.wholesale_price,
      unit_of_measurement: p.products?.unit_of_measurement || p.unit_of_measurement,
      quantity: p.stock?.quantity ?? p.quantity ?? 0,
      low_stock_threshold: p.stock?.low_stock_threshold ?? p.low_stock_threshold ?? 0,
    }))
    await db.branch_product_cache.bulkPut(rows)
  } catch {
    // silent — caching is best-effort, doesn't block anything
  }
}

// Used when offline: searches the local cache instead of hitting the API.
export async function searchLocalProducts(query, branchId) {
  if (!branchId || !query) return []
  const q = query.toLowerCase()
  const all = await db.branch_product_cache.where('branch_id').equals(branchId).toArray()
  return all
    .filter((p) => p.name?.toLowerCase().includes(q) || p.barcode === query)
    .map((p) => ({
      id: p.product_id,
      name: p.name,
      barcode: p.barcode,
      category: p.category,
      price: p.price,
      wholesale_price: p.wholesale_price,
      unit_of_measurement: p.unit_of_measurement,
      stock: { quantity: p.quantity, low_stock_threshold: p.low_stock_threshold },
    }))
}
export async function refreshCustomerCache() {
  if (!isOnline()) return
  try {
    const res = await api.get('/api/customers')
    if (!res.data.success) return
    const rows = res.data.data.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email || null,
      credit_account: c.credit_account || null,
    }))
    await db.customer_cache.clear()
    await db.customer_cache.bulkPut(rows)
  } catch {
    // silent — caching is best-effort, doesn't block anything
  }
}

export async function searchLocalCustomers(query) {
  if (!query) return []
  const q = query.toLowerCase()
  const all = await db.customer_cache.toArray()
  return all.filter((c) => c.name?.toLowerCase().includes(q) || c.phone?.includes(query))
}

// Queues a sale for later sync. Stores the exact payload we would have
// sent to the API, plus what's needed to confirm payment afterward.
export async function queueOfflineSale({ salePayload, upfrontAmount, upfrontMethod }) {
  const offlineId = generateOfflineId()
  await db.pending_sales.put({
    offline_id: offlineId,
    payload: { ...salePayload, offline_id: offlineId },
    upfront_amount: upfrontAmount,
    upfront_method: upfrontMethod,
    status: 'pending',
    error_message: null,
    created_at: new Date().toISOString(),
  })
  return offlineId
}

export async function getPendingSales() {
  const rows = await db.pending_sales.toArray()
  return rows.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
}

export async function getPendingCount() {
  return db.pending_sales.count()
}

export async function removePendingSale(offlineId) {
  await db.pending_sales.delete(offlineId)
}

export async function updatePendingSaleItems(offlineId, newItems, newTotal) {
  const row = await db.pending_sales.get(offlineId)
  if (!row) return
  row.payload.items = newItems
  row.payload.total_amount = newTotal
  row.status = 'pending'
  row.error_message = null
  await db.pending_sales.put(row)
}

// The sync engine. Call this whenever connectivity returns.
// Processes the queue oldest-first, one at a time, per the confirmed
// backend design (avoids the stock race condition).
export async function syncPendingSales(onProgress) {
  if (!isOnline()) return { synced: 0, failed: 0 }

  const pending = await getPendingSales()
  let synced = 0
  let failed = 0

  for (const item of pending) {
    if (item.status === 'cancelled') continue

    try {
      const saleRes = await createSale(item.payload)

      if (!saleRes.success) {
        await db.pending_sales.update(item.offline_id, {
          status: 'failed',
          error_message: saleRes.message || 'Failed to sync sale',
        })
        failed++
        onProgress?.({ synced, failed, total: pending.length })
        continue
      }

      const saleId = saleRes.data.id
      let paymentRes

      if (item.upfront_method === 'cash') {
        paymentRes = await confirmCashPayment(saleId, item.upfront_amount)
      } else if (item.upfront_method === 'transfer') {
        paymentRes = await confirmTransferPayment(saleId)
      } else if (item.upfront_method === 'pos') {
        paymentRes = await confirmPOSPayment(saleId)
      }

      if (paymentRes?.success) {
        await db.pending_sales.delete(item.offline_id)
        synced++
      } else {
        // Sale exists on the server now but payment confirm failed —
        // safe to retry just the confirm step next time since the
        // sale itself is already idempotent via offline_id.
        await db.pending_sales.update(item.offline_id, {
          status: 'failed',
          error_message: 'Sale synced but payment confirmation failed — will retry',
        })
        failed++
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Sync failed — will retry'
      await db.pending_sales.update(item.offline_id, {
        status: 'failed',
        error_message: message,
      })
      failed++
    }

    onProgress?.({ synced, failed, total: pending.length })
  }

  return { synced, failed }
}
// ============ SALES HISTORY (view-only cache) ============

export async function refreshTodaySalesCache(branchId) {
  if (!branchId || !isOnline()) return
  try {
    const res = await api.get('/api/sales/today', { params: { branch_id: branchId } })
    if (!res.data.success) return
    await db.sales_cache.where('branch_id').equals(branchId).delete()
    const rows = res.data.data.map((s) => ({ ...s, branch_id: branchId }))
    await db.sales_cache.bulkPut(rows)
  } catch {
    // silent
  }
}

export async function getTodaySalesOffline(branchId) {
  const cached = await db.sales_cache.where('branch_id').equals(branchId).toArray()
  // Merge in this device's own not-yet-synced sales so today's total stays accurate
  const pending = await db.pending_sales.toArray()
  const pendingAsSales = pending
    .filter((p) => p.payload.branch_id === branchId)
    .map((p) => ({
      id: p.offline_id,
      total_amount: p.payload.total_amount,
      payment_method: p.payload.payment_method,
      payment_status: 'pending_sync',
      created_at: p.created_at,
      users: null,
      branches: null,
      customers: null,
      sale_items: p.payload.items.map((i) => ({ ...i, products: null })),
      _isPending: true,
    }))
  return [...pendingAsSales, ...cached].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

// ============ CUSTOMER EDITS ============

export async function queueCustomerEdit(customerId, payload) {
  const offlineId = generateOfflineId()
  await db.pending_customer_edits.put({
    offline_id: offlineId,
    customer_id: customerId,
    payload,
    status: 'pending',
    error_message: null,
    created_at: new Date().toISOString(),
  })
  // Also update the local cache copy so the UI reflects the edit immediately
  const cached = await db.customer_cache.get(customerId)
  if (cached) {
    await db.customer_cache.put({ ...cached, ...payload })
  }
  return offlineId
}

export async function syncPendingCustomerEdits() {
  if (!isOnline()) return { synced: 0, failed: 0 }
  const pending = await db.pending_customer_edits.where('status').equals('pending').toArray()
  let synced = 0, failed = 0
  for (const edit of pending) {
    try {
      const res = await api.put(`/api/customers/${edit.customer_id}`, edit.payload)
      if (res.data.success) {
        await db.pending_customer_edits.delete(edit.offline_id)
        synced++
      } else {
        await db.pending_customer_edits.update(edit.offline_id, { status: 'failed', error_message: res.data.message })
        failed++
      }
    } catch (err) {
      await db.pending_customer_edits.update(edit.offline_id, {
        status: 'failed',
        error_message: err.response?.data?.message || 'Sync failed',
      })
      failed++
    }
  }
  return { synced, failed }
}

export async function getPendingCustomerEditsCount() {
  return db.pending_customer_edits.where('status').equals('pending').count()
}

// ============ DASHBOARD CACHE ============

export async function refreshDashboardCache(branchId, data) {
  await db.dashboard_cache.put({ branch_id: branchId, ...data, updated_at: new Date().toISOString() })
}

export async function getDashboardCache(branchId) {
  return db.dashboard_cache.get(branchId)
}

// ============ LOOSE CART OFFLINE ============

export async function cacheOpenCart(branchId, cart) {
  await db.cart_cache.put({ branch_id: branchId, cart, updated_at: new Date().toISOString() })
}

export async function getCachedCart(branchId) {
  const row = await db.cart_cache.get(branchId)
  return row?.cart || null
}

export async function queueCartItem(cartId, itemPayload) {
  const offlineId = generateOfflineId()
  await db.pending_cart_items.put({
    offline_id: offlineId,
    cart_id: cartId,
    payload: { ...itemPayload, offline_id: offlineId },
    status: 'pending',
    error_message: null,
    created_at: new Date().toISOString(),
  })
  return offlineId
}

export async function queueCartClose(cartId, closePayload) {
  const offlineId = generateOfflineId()
  await db.pending_cart_close.put({
    offline_id: offlineId,
    cart_id: cartId,
    payload: { ...closePayload, offline_id: offlineId },
    status: 'pending',
    error_message: null,
    created_at: new Date().toISOString(),
  })
  return offlineId
}

export async function getPendingCartActionsCount() {
  const items = await db.pending_cart_items.where('status').equals('pending').count()
  const closes = await db.pending_cart_close.where('status').equals('pending').count()
  return items + closes
}

export async function syncPendingCartActions() {
  if (!isOnline()) return { synced: 0, failed: 0 }
  let synced = 0, failed = 0

  // Items first (oldest first), then closes — a cart can't be closed
  // meaningfully before its queued items are synced.
  const items = await db.pending_cart_items.where('status').equals('pending').toArray()
  const sortedItems = items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  for (const item of sortedItems) {
    try {
      const res = await api.post(`/api/carts/${item.cart_id}/items`, item.payload)
      if (res.data.success) {
        await db.pending_cart_items.delete(item.offline_id)
        synced++
      } else {
        await db.pending_cart_items.update(item.offline_id, { status: 'failed', error_message: res.data.message })
        failed++
      }
    } catch (err) {
      await db.pending_cart_items.update(item.offline_id, {
        status: 'failed',
        error_message: err.response?.data?.message || 'Sync failed',
      })
      failed++
    }
  }

  const closes = await db.pending_cart_close.where('status').equals('pending').toArray()
  const sortedCloses = closes.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  for (const close of sortedCloses) {
    try {
      const res = await api.put(`/api/carts/${close.cart_id}/close`, close.payload)
      if (res.data.success) {
        await db.pending_cart_close.delete(close.offline_id)
        synced++
      } else {
        await db.pending_cart_close.update(close.offline_id, { status: 'failed', error_message: res.data.message })
        failed++
      }
    } catch (err) {
      await db.pending_cart_close.update(close.offline_id, {
        status: 'failed',
        error_message: err.response?.data?.message || 'Sync failed',
      })
      failed++
    }
  }

  return { synced, failed }
}

// ============ CREDIT REPAYMENT OFFLINE ============

export async function queueRepayment(customerId, payload) {
  const offlineId = generateOfflineId()
  await db.pending_repayments.put({
    offline_id: offlineId,
    customer_id: customerId,
    payload: { ...payload, offline_id: offlineId },
    status: 'pending',
    error_message: null,
    created_at: new Date().toISOString(),
  })
  return offlineId
}

export async function getPendingRepaymentsCount() {
  return db.pending_repayments.where('status').equals('pending').count()
}

export async function syncPendingRepayments() {
  if (!isOnline()) return { synced: 0, failed: 0 }
  const pending = await db.pending_repayments.where('status').equals('pending').toArray()
  const sorted = pending.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  let synced = 0, failed = 0
  for (const r of sorted) {
    try {
      const res = await api.post(`/api/customers/${r.customer_id}/credit/repay`, r.payload)
      if (res.data.success) {
        await db.pending_repayments.delete(r.offline_id)
        synced++
      } else {
        await db.pending_repayments.update(r.offline_id, { status: 'failed', error_message: res.data.message })
        failed++
      }
    } catch (err) {
      await db.pending_repayments.update(r.offline_id, {
        status: 'failed',
        error_message: err.response?.data?.message || 'Sync failed',
      })
      failed++
    }
  }
  return { synced, failed }
}