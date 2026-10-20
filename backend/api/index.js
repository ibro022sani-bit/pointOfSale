import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from '../routes/auth.js'
import staffRoutes from '../routes/staff.js'
import customerRoutes from '../routes/customers.js'
import branchRoutes from '../routes/branches.js'
import productRoutes from '../routes/products.js'
import stockRoutes from '../routes/stock.js'
import supplierRoutes from '../routes/suppliers.js'
import salesRoutes from '../routes/sales.js'
import paymentRoutes from '../routes/payments.js'
import cartRoutes from '../routes/carts.js'
import settingsRoutes from '../routes/settings.js'
import creditRoutes from '../routes/credit.js'
import expenseRoutes from '../routes/expenses.js'
import reportRoutes from '../routes/reports.js'
import notificationRoutes from '../routes/notifications.js'
import depositRoutes from '../routes/deposits.js'
import publicRoutes from '../routes/public.js'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/public', publicRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/staff', staffRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/customers', creditRoutes)
app.use('/api/branches', branchRoutes)
app.use('/api/products', productRoutes)
app.use('/api/stock', stockRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/sales', salesRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/carts', cartRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/customers', creditRoutes)
app.use('/api/customers', depositRoutes)

export default app