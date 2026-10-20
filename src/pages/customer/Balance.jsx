import { useState, useEffect } from 'react'
import { Wallet, CreditCard, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

function Balance() {
  const [account, setAccount] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAccount = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/customers/me')
      if (res.data.success) {
        const data = res.data.data
        setAccount(data)
        if (data.deposit_account) {
          const txRes = await api.get(`/api/customers/${data.id}/deposit/transactions`)
          if (txRes.data.success) setTransactions(txRes.data.data)
        }
      }
    } catch {
      toast.error('Failed to load balance')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAccount() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const deposit = account?.deposit_account
  const credit = account?.credit_account

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">My Balance</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your deposit and credit account with us</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-green-700 mb-2">
            <Wallet size={18} />
            <p className="text-sm font-semibold">Deposit Balance</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            ₦{Number(deposit?.current_balance || 0).toLocaleString()}
          </p>
          {!deposit && (
            <p className="text-xs text-gray-400 mt-2">You don't have a deposit account yet.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <CreditCard size={18} />
            <p className="text-sm font-semibold">Credit Balance</p>
          </div>
          {credit ? (
            <>
              <p className="text-2xl font-bold text-gray-800">
                ₦{Number(credit.current_balance || 0).toLocaleString()}
                <span className="text-sm font-normal text-gray-400"> owed</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Limit: ₦{Number(credit.credit_limit || 0).toLocaleString()}
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-400 mt-2">You don't have a credit account yet.</p>
          )}
        </div>
      </div>

      {deposit && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-800 mb-3">Deposit History</p>
          {transactions.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    {t.type === 'deposit_in' ? (
                      <ArrowDownCircle size={16} className="text-green-500" />
                    ) : (
                      <ArrowUpCircle size={16} className="text-red-400" />
                    )}
                    <div>
                      <p className="text-sm text-gray-700">
                        {t.type === 'deposit_in' ? 'Deposit added' : 'Used for purchase'}
                      </p>
                      {t.note && <p className="text-xs text-gray-400">{t.note}</p>}
                    </div>
                  </div>
                  <p className={`text-sm font-semibold ${t.type === 'deposit_in' ? 'text-green-600' : 'text-red-500'}`}>
                    {t.type === 'deposit_in' ? '+' : '-'}₦{Number(t.amount).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Balance