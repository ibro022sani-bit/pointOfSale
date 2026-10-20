import express from 'express'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'
import { requireAuth, requireRole } from '../lib/middleware.js'

const router = express.Router()
router.use(requireAuth)
router.use(requireRole('super_admin', 'admin'))

// Helper: weighted average cost per product, optionally scoped to one branch
async function getAverageCosts(branch_id) {
  let query = supabase.from('stock_receipt_items').select('product_id, quantity, cost_price, stock_receipts!inner(branch_id)')
  if (branch_id) query = query.eq('stock_receipts.branch_id', branch_id)

  const { data } = await query
  const totals = {}
  for (const row of data || []) {
    if (!totals[row.product_id]) totals[row.product_id] = { totalQty: 0, totalCost: 0 }
    totals[row.product_id].totalQty += Number(row.quantity)
    totals[row.product_id].totalCost += Number(row.quantity) * Number(row.cost_price)
  }
  const averages = {}
  for (const [productId, t] of Object.entries(totals)) {
    averages[productId] = t.totalQty > 0 ? t.totalCost / t.totalQty : 0
  }
  return averages
}

router.get('/sales', async (req, res) => {
  try {
    let { date_from, date_to, branch_id } = req.query
    if (req.user.role !== 'super_admin') branch_id = req.user.branch_id

    let query = supabase.from('sales').select('id, branch_id, total_amount, created_at, branches(name)').eq('status', 'completed')
    if (branch_id) query = query.eq('branch_id', branch_id)
    if (date_from) query = query.gte('created_at', date_from)
    if (date_to) query = query.lte('created_at', date_to)

    const { data, error: dbError } = await query
    if (dbError) return error(res, 'Could not generate sales report', 500)

    const total_revenue = data.reduce((sum, s) => sum + Number(s.total_amount), 0)
    const transaction_count = data.length

    const byDay = {}
    const byBranch = {}
    for (const sale of data) {
      const day = sale.created_at.slice(0, 10)
      byDay[day] = (byDay[day] || 0) + Number(sale.total_amount)
      const branchName = sale.branches?.name || 'Unknown'
      byBranch[branchName] = (byBranch[branchName] || 0) + Number(sale.total_amount)
    }

    return success(res, {
      total_revenue,
      transaction_count,
      by_day: Object.entries(byDay).map(([date, revenue]) => ({ date, revenue })).sort((a, b) => a.date.localeCompare(b.date)),
      by_branch: Object.entries(byBranch).map(([branch, revenue]) => ({ branch, revenue }))
    }, 'Sales report generated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})
router.get('/customers/top-spenders', async (req, res) => {
  try {
    let { date_from, date_to, branch_id } = req.query
    if (req.user.role !== 'super_admin') branch_id = req.user.branch_id

    let query = supabase
      .from('sales')
      .select('customer_id, total_amount, customers(name, phone)')
      .eq('status', 'completed')
      .not('customer_id', 'is', null)

    if (branch_id) query = query.eq('branch_id', branch_id)
    if (date_from) query = query.gte('created_at', date_from)
    if (date_to) query = query.lte('created_at', date_to)

    const { data, error: dbError } = await query
    if (dbError) return error(res, 'Could not generate top spenders report', 500)

    const byCustomer = {}
    for (const sale of data) {
      if (!byCustomer[sale.customer_id]) {
        byCustomer[sale.customer_id] = {
          customer_id: sale.customer_id,
          name: sale.customers?.name,
          phone: sale.customers?.phone,
          total_spent: 0,
          purchase_count: 0
        }
      }
      byCustomer[sale.customer_id].total_spent += Number(sale.total_amount)
      byCustomer[sale.customer_id].purchase_count += 1
    }

    const result = Object.values(byCustomer).sort((a, b) => b.total_spent - a.total_spent)

    return success(res, result, 'Top spenders report generated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})
router.get('/stock', async (req, res) => {
  try {
    let { branch_id } = req.query
    if (req.user.role !== 'super_admin') branch_id = req.user.branch_id

    let query = supabase.from('stock').select('*, products(name, category), branches(name)')
    if (branch_id) query = query.eq('branch_id', branch_id)

    const { data: stockRows, error: dbError } = await query
    if (dbError) return error(res, 'Could not generate stock report', 500)

    const averages = await getAverageCosts(branch_id)

    let total_value = 0
    const items = stockRows.map(row => {
      const avgCost = averages[row.product_id] || 0
      const value = Number(row.quantity) * avgCost
      total_value += value
      return {
        product_id: row.product_id,
        product_name: row.products?.name,
        category: row.products?.category,
        branch: row.branches?.name,
        quantity: row.quantity,
        average_cost: Math.round(avgCost * 100) / 100,
        estimated_value: Math.round(value * 100) / 100,
        is_low_stock: Number(row.quantity) <= Number(row.low_stock_threshold)
      }
    })

    const low_stock_items = items.filter(i => i.is_low_stock)

    return success(res, {
      total_estimated_value: Math.round(total_value * 100) / 100,
      total_products_tracked: items.length,
      low_stock_count: low_stock_items.length,
      items,
      low_stock_items
    }, 'Stock report generated (values are weighted-average cost estimates, not exact)')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/debt', async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from('credit_accounts')
      .select('*, customers(name, phone)')
      .gt('current_balance', 0)
      .order('current_balance', { ascending: false })

    if (dbError) return error(res, 'Could not generate debt report', 500)

    const total_outstanding = data.reduce((sum, a) => sum + Number(a.current_balance), 0)

    return success(res, {
      total_outstanding,
      customers_with_debt: data.length,
      accounts: data
    }, 'Debt report generated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/expenses', async (req, res) => {
  try {
    let { date_from, date_to, branch_id } = req.query
    if (req.user.role !== 'super_admin') branch_id = req.user.branch_id

    let query = supabase.from('expenses').select('*')
    if (branch_id) query = query.eq('branch_id', branch_id)
    if (date_from) query = query.gte('created_at', date_from)
    if (date_to) query = query.lte('created_at', date_to)

    const { data, error: dbError } = await query
    if (dbError) return error(res, 'Could not generate expense report', 500)

    const total_expenses = data.reduce((sum, e) => sum + Number(e.amount), 0)
    const byCategory = {}
    for (const exp of data) {
      byCategory[exp.category] = (byCategory[exp.category] || 0) + Number(exp.amount)
    }

    return success(res, {
      total_expenses,
      by_category: Object.entries(byCategory).map(([category, total]) => ({ category, total }))
    }, 'Expense report generated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/profit-loss', async (req, res) => {
  try {
    let { date_from, date_to, branch_id } = req.query
    if (req.user.role !== 'super_admin') branch_id = req.user.branch_id

    let saleQuery = supabase.from('sales').select('id, total_amount').eq('status', 'completed')
    if (branch_id) saleQuery = saleQuery.eq('branch_id', branch_id)
    if (date_from) saleQuery = saleQuery.gte('created_at', date_from)
    if (date_to) saleQuery = saleQuery.lte('created_at', date_to)

    const { data: sales, error: salesErr } = await saleQuery
    if (salesErr) return error(res, 'Could not generate P&L report', 500)

    const revenue = sales.reduce((sum, s) => sum + Number(s.total_amount), 0)
    const saleIds = sales.map(s => s.id)

    let cost_of_goods_sold = 0
    let by_product = []
    if (saleIds.length > 0) {
      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('product_id, quantity, subtotal, products(name)')
        .in('sale_id', saleIds)

      const averages = await getAverageCosts(branch_id)
      cost_of_goods_sold = (saleItems || []).reduce((sum, item) => sum + (Number(item.quantity) * (averages[item.product_id] || 0)), 0)

      const productTotals = {}
      for (const item of saleItems || []) {
        if (!productTotals[item.product_id]) {
          productTotals[item.product_id] = { product_name: item.products?.name, quantity_sold: 0, revenue: 0, cogs: 0 }
        }
        productTotals[item.product_id].quantity_sold += Number(item.quantity)
        productTotals[item.product_id].revenue += Number(item.subtotal)
        productTotals[item.product_id].cogs += Number(item.quantity) * (averages[item.product_id] || 0)
      }

      by_product = Object.entries(productTotals).map(([product_id, t]) => ({
        product_id,
        product_name: t.product_name,
        quantity_sold: t.quantity_sold,
        revenue: Math.round(t.revenue * 100) / 100,
        cogs: Math.round(t.cogs * 100) / 100,
        gross_profit: Math.round((t.revenue - t.cogs) * 100) / 100
      })).sort((a, b) => b.gross_profit - a.gross_profit)
    }

    let expenseQuery = supabase.from('expenses').select('amount')
    if (branch_id) expenseQuery = expenseQuery.eq('branch_id', branch_id)
    if (date_from) expenseQuery = expenseQuery.gte('created_at', date_from)
    if (date_to) expenseQuery = expenseQuery.lte('created_at', date_to)

    const { data: expenses } = await expenseQuery
    const total_expenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0)

    const gross_profit = revenue - cost_of_goods_sold
    const net_profit = gross_profit - total_expenses

    return success(res, {
      revenue,
      cost_of_goods_sold: Math.round(cost_of_goods_sold * 100) / 100,
      gross_profit: Math.round(gross_profit * 100) / 100,
      total_expenses,
      net_profit: Math.round(net_profit * 100) / 100,
      by_product
    }, 'P&L report generated (cost of goods sold is a weighted-average estimate; by_product shows gross_profit only — expenses cannot be allocated per-product)')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/supplier-debt', requireRole('super_admin'), async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from('stock_receipts')
      .select('supplier_id, total_cost, amount_paid, suppliers(name)')
      .in('payment_status', ['unpaid', 'partial'])
      .not('supplier_id', 'is', null)

    if (dbError) return error(res, 'Could not generate supplier debt report', 500)

    const bySupplier = {}
    let total_outstanding = 0

    for (const receipt of data) {
      const outstanding = Number(receipt.total_cost) - Number(receipt.amount_paid)
      total_outstanding += outstanding
      const name = receipt.suppliers?.name || 'Unknown Supplier'
      if (!bySupplier[receipt.supplier_id]) bySupplier[receipt.supplier_id] = { supplier_name: name, outstanding: 0, order_count: 0 }
      bySupplier[receipt.supplier_id].outstanding += outstanding
      bySupplier[receipt.supplier_id].order_count += 1
    }

    return success(res, {
      total_outstanding,
      suppliers: Object.values(bySupplier)
    }, 'Supplier debt summary generated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})
router.get('/due-payments', async (req, res) => {
  try {
    let { branch_id } = req.query
    if (req.user.role !== 'super_admin') branch_id = req.user.branch_id

    const now = new Date()

    let saleQuery = supabase
      .from('sales')
      .select('id, branch_id, customer_id, total_amount, days_to_settle, created_at, customers(name, credit_accounts(current_balance)), branches(name)')
      .eq('payment_method', 'credit')
    if (branch_id) saleQuery = saleQuery.eq('branch_id', branch_id)
    const { data: sales } = await saleQuery

    const overdueSales = (sales || [])
      .filter(s => {
        const balance = s.customers?.credit_accounts?.current_balance
        if (!balance || Number(balance) <= 0) return false
        const due = new Date(s.created_at)
        due.setDate(due.getDate() + (s.days_to_settle || 0))
        return due <= now
      })
      .map(s => {
        const due = new Date(s.created_at)
        due.setDate(due.getDate() + (s.days_to_settle || 0))
        return {
          type: 'sale',
          id: s.id,
          customer_name: s.customers?.name || null,
          branch_name: s.branches?.name || null,
          total_amount: s.total_amount,
          due_date: due.toISOString().slice(0, 10),
          current_balance: s.customers?.credit_accounts?.current_balance ?? null
        }
      })

    const combined = [...overdueSales].sort((a, b) => new Date(a.due_date) - new Date(b.due_date))

    return success(res, combined, 'Due payments fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/daily-collections', async (req, res) => {
  try {
    let { date, branch_id } = req.query
    if (req.user.role !== 'super_admin') branch_id = req.user.branch_id
    if (!date) date = new Date().toISOString().slice(0, 10)

    const startOfDay = `${date}T00:00:00`
    const nextDay = new Date(date)
    nextDay.setDate(nextDay.getDate() + 1)
    const endOfDay = nextDay.toISOString().slice(0, 10) + 'T00:00:00'

    let saleQuery = supabase
      .from('sales')
      .select('payment_method, total_amount, amount_paid')
      .eq('status', 'completed')
      .gte('created_at', startOfDay).lt('created_at', endOfDay)
    if (branch_id) saleQuery = saleQuery.eq('branch_id', branch_id)
    const { data: sales } = await saleQuery

    let cash_sales = 0, transfer_sales = 0, pos_sales = 0, split_upfront = 0
    for (const s of sales || []) {
      if (s.payment_method === 'cash') cash_sales += Number(s.total_amount)
      else if (s.payment_method === 'transfer') transfer_sales += Number(s.total_amount)
      else if (s.payment_method === 'pos') pos_sales += Number(s.total_amount)
      else if (s.payment_method === 'split') split_upfront += Number(s.amount_paid || 0)
    }

    let depositQuery = supabase
      .from('deposit_transactions')
      .select('amount')
      .eq('type', 'deposit_in')
      .gte('created_at', startOfDay).lt('created_at', endOfDay)
    if (branch_id) depositQuery = depositQuery.eq('branch_id', branch_id)
    const { data: deposits } = await depositQuery

    const deposits_received = (deposits || []).reduce((sum, d) => sum + Number(d.amount), 0)

    let repayQuery = supabase
      .from('payments')
      .select('amount')
      .not('credit_account_id', 'is', null)
      .is('sale_id', null)
      .neq('payment_method', 'deposit')
      .gte('created_at', startOfDay).lt('created_at', endOfDay)
    if (branch_id) repayQuery = repayQuery.eq('branch_id', branch_id)
    const { data: repayments } = await repayQuery

    const credit_repayments = (repayments || []).reduce((sum, p) => sum + Number(p.amount), 0)

    let creditSaleQuery = supabase
      .from('sales')
      .select('payment_method, total_amount, amount_paid')
      .eq('status', 'completed')
      .in('payment_method', ['credit', 'split'])
      .gte('created_at', startOfDay).lt('created_at', endOfDay)
    if (branch_id) creditSaleQuery = creditSaleQuery.eq('branch_id', branch_id)
    const { data: creditSales } = await creditSaleQuery

    let credit_given = 0
    for (const s of creditSales || []) {
      if (s.payment_method === 'credit') credit_given += Number(s.total_amount)
      else credit_given += Number(s.total_amount) - Number(s.amount_paid || 0)
    }

    const total = cash_sales + transfer_sales + pos_sales + split_upfront + deposits_received + credit_repayments

    return success(res, {
      date,
      total: Math.round(total * 100) / 100,
      breakdown: {
        cash_sales: Math.round(cash_sales * 100) / 100,
        transfer_sales: Math.round(transfer_sales * 100) / 100,
        pos_sales: Math.round(pos_sales * 100) / 100,
        split_upfront: Math.round(split_upfront * 100) / 100,
        deposits_received: Math.round(deposits_received * 100) / 100,
        credit_repayments: Math.round(credit_repayments * 100) / 100,
        credit_given: Math.round(credit_given * 100) / 100
      }
    }, 'Daily collections fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router