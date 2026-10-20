import { create } from 'zustand'
import api from '../services/api'

const cachedBranches = (() => {
  try {
    return JSON.parse(localStorage.getItem('branches_cache')) || []
  } catch {
    return []
  }
})()

const useBranchStore = create((set, get) => ({
  branches: cachedBranches,
  loaded: cachedBranches.length > 0,

  fetchBranches: async () => {
    try {
      const res = await api.get('/api/branches')
      if (res.data.success) {
        localStorage.setItem('branches_cache', JSON.stringify(res.data.data))
        set({ branches: res.data.data, loaded: true })
      }
    } catch {
      // Couldn't refresh — keep whatever's cached, but still mark loaded
      // so a guard waiting on this doesn't spin forever.
      set({ loaded: true })
    }
  },

  
  // Resolves which branch a user is "operating from" and checks if it's
  // the main branch. Cashier/admin use their fixed branch_id. Super admin
  // uses their chosen defaultBranchId, falling back to whichever branch
  // is flagged is_main.
    // Resolves which branch a super admin is "currently operating from" for
  // actions that need an explicit branch_id (deposits, credit repayments).
  // Cashier/admin never need this — their own branch_id is used server-side
  // automatically. Falls back to the main branch if no default is set.
  resolveBranchId: (user, defaultBranchId) => {
    const { branches } = get()
    if (!user) return null
    if (user.role === 'super_admin') {
      return defaultBranchId || branches.find((b) => b.is_main)?.id || null
    }
    return user.branch_id || null
  },

  
  isMainBranchUser: (user, defaultBranchId) => {
    const { branches } = get()
    if (!user || branches.length === 0) return false

    const resolvedBranchId =
      user.role === 'super_admin'
        ? defaultBranchId || branches.find((b) => b.is_main)?.id
        : user.branch_id

    const branch = branches.find((b) => b.id === resolvedBranchId)
    return !!branch?.is_main
  },
}))

export default useBranchStore