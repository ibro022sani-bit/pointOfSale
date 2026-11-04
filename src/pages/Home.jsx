import { Link } from 'react-router-dom'
import {
  Receipt, WifiOff, GitBranch, Package, Truck, Wallet, MessageSquare, PieChart, Users, Lock, Phone, Mail,
} from 'lucide-react'
import {
  APP_NAME, COMPANY_NAME, CONTACT_EMAIL, CONTACT_PHONE, WHATSAPP_NUMBER, PRICING_NOTE,
} from '../config/brand'

const FEATURES = [
  { icon: Receipt, title: 'Fast checkout', text: 'Ring up sales in seconds. Accept cash, transfer, POS or split payments, and print receipts with your own business details.' },
  { icon: WifiOff, title: 'Works offline', text: 'Keep selling when the network drops. Sales are saved on the device and sync automatically when you are back online.' },
  { icon: GitBranch, title: 'Multiple branches', text: 'Run several shops from one account. Each branch has its own stock, staff and sales, and you see everything in one place.' },
  { icon: Package, title: 'Stock control', text: 'Track quantities, get low-stock warnings, and record every delivery from your suppliers with cost prices.' },
  { icon: Truck, title: 'Branch transfers', text: 'Move stock between branches with a request, approval and receipt trail so nothing goes missing.' },
  { icon: Wallet, title: 'Credit and deposits', text: 'Let trusted customers buy on credit or keep a deposit balance, with limits and a full history of every payment.' },
  { icon: MessageSquare, title: 'Customer reminders', text: 'Remind customers who owe you in one tap, with a ready-written message sent through your own SMS or WhatsApp.' },
  { icon: PieChart, title: 'Reports and expenses', text: 'See daily collections, profit, outstanding payments and expenses, by branch or across the whole business.' },
  { icon: Users, title: 'Staff roles', text: 'Give owners, managers and cashiers the right level of access, and switch off a staff account whenever you need to.' },
  { icon: Lock, title: 'Your data stays yours', text: 'Every business is kept completely separate. Nobody else can see your sales, customers or stock.' },
]

const STEPS = [
  { n: '1', title: 'Create your account', text: 'Tell us about your business. It takes about two minutes.' },
  { n: '2', title: 'We activate it', text: 'We review every new account and contact you once it is ready.' },
  { n: '3', title: 'Start selling', text: 'Add your products and branches, invite your staff, and ring up your first sale.' },
]

function Home() {
  const hasContact = CONTACT_EMAIL || CONTACT_PHONE || WHATSAPP_NUMBER

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-green-700">{APP_NAME}</span>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign in</Link>
            <Link to="/signup" className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
              Create account
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-br from-green-50 to-green-100">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
            Run your shop, stock and staff <span className="text-green-700">from one app</span>
          </h1>
          <p className="mt-5 text-lg text-gray-600 max-w-2xl mx-auto">
            {APP_NAME} is a point of sale and inventory system for shops, pharmacies, supermarkets and wholesalers.
            It works even when the network does not.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/signup" className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl">
              Create your account
            </Link>
            <Link to="/login" className="bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold px-6 py-3 rounded-xl">
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-500">New accounts are activated after a short review.</p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center">Everything a busy shop needs</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center">
                <Icon size={20} />
              </div>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center">How it works</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-green-600 text-white font-bold flex items-center justify-center">{s.n}</div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-gray-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold">Pricing</h2>
        <p className="mt-3 text-gray-600">{PRICING_NOTE}</p>
        {hasContact && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {WHATSAPP_NUMBER && (
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer"
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg">
                Chat on WhatsApp
              </a>
            )}
            {CONTACT_PHONE && (
              <a href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-2 border border-gray-200 text-sm font-medium px-5 py-2.5 rounded-lg hover:border-gray-300">
                <Phone size={16} /> {CONTACT_PHONE}
              </a>
            )}
            {CONTACT_EMAIL && (
              <a href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 border border-gray-200 text-sm font-medium px-5 py-2.5 rounded-lg hover:border-gray-300">
                <Mail size={16} /> {CONTACT_EMAIL}
              </a>
            )}
          </div>
        )}
      </section>

      <footer className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <span>© {new Date().getFullYear()} {COMPANY_NAME || APP_NAME}. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-gray-800">Terms</Link>
            <Link to="/privacy" className="hover:text-gray-800">Privacy</Link>
            <Link to="/login" className="hover:text-gray-800">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home