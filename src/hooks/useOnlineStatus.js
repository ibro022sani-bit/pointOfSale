import { useState, useEffect } from 'react'
import {
  syncPendingSales, getPendingCount,
  syncPendingCustomerEdits, getPendingCustomerEditsCount,
  syncPendingCartActions, getPendingCartActionsCount,
  syncPendingRepayments, getPendingRepaymentsCount,
} from '../services/offlineSync'
import toast from 'react-hot-toast'

export default function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)

  const refreshPendingCount = async () => {
    const [sales, edits, cart, repay] = await Promise.all([
      getPendingCount(),
      getPendingCustomerEditsCount(),
      getPendingCartActionsCount(),
      getPendingRepaymentsCount(),
    ])
    setPendingCount(sales + edits + cart + repay)
  }

  useEffect(() => {
    refreshPendingCount()

    const handleOnline = async () => {
      setOnline(true)
      await refreshPendingCount()
      const total = await (async () => {
        const [sales, edits, cart, repay] = await Promise.all([
          getPendingCount(), getPendingCustomerEditsCount(),
          getPendingCartActionsCount(), getPendingRepaymentsCount(),
        ])
        return sales + edits + cart + repay
      })()

      if (total > 0) {
        toast.loading(`Back online — syncing ${total} pending item${total > 1 ? 's' : ''}...`, { id: 'sync' })
        const [salesResult, editsResult, cartResult, repayResult] = await Promise.all([
          syncPendingSales(),
          syncPendingCustomerEdits(),
          syncPendingCartActions(),
          syncPendingRepayments(),
        ])
        toast.dismiss('sync')
        const totalSynced = salesResult.synced + editsResult.synced + cartResult.synced + repayResult.synced
        const totalFailed = salesResult.failed + editsResult.failed + cartResult.failed + repayResult.failed
        if (totalSynced > 0) toast.success(`Synced ${totalSynced} item${totalSynced > 1 ? 's' : ''}`)
        if (totalFailed > 0) toast.error(`${totalFailed} item${totalFailed > 1 ? 's' : ''} need attention`)
        await refreshPendingCount()
      }
    }

    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { online, pendingCount, refreshPendingCount }
}