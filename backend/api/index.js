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
import catalogRoutes from '../routes/catalog.js'
import creditRoutes from '../routes/credit.js'
import expenseRoutes from '../routes/expenses.js'
import reportRoutes from '../routes/reports.js'
import notificationRoutes from '../routes/notifications.js'
import depositRoutes from '../routes/deposits.js'
import platformRoutes from '../routes/platform.js'

const app = express()
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)
app.use(cors({
  origin: (origin, cb) => {
    // allow requests with no Origin header (server-to-server) and listed sites only
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    return cb(new Error('Not allowed by CORS'))
  },
}))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/platform', platformRoutes)
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
app.use('/api/catalog', catalogRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/customers', creditRoutes)
app.use('/api/customers', depositRoutes)

export default app