import { create } from 'zustand'

const storedToken = localStorage.getItem('token')
const storedUser = (() => {
  try {
    return JSON.parse(localStorage.getItem('user'))
  } catch {
    return null
  }
})()
const storedDefaultBranchId = localStorage.getItem('defaultBranchId')

const useAuthStore = create((set) => ({
  user: storedUser,
  token: storedToken,
  isAuthenticated: !!(storedToken && storedUser),
  defaultBranchId: storedDefaultBranchId || null,

  login: (user, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('defaultBranchId')
    set({ user: null, token: null, isAuthenticated: false, defaultBranchId: null })
  },

  // Kept for compatibility — no longer needed for the initial page load
  // (that now happens synchronously above), but harmless to keep calling.
  loadFromStorage: () => {
    const token = localStorage.getItem('token')
    const user = JSON.parse(localStorage.getItem('user'))
    const defaultBranchId = localStorage.getItem('defaultBranchId')
    if (token && user) {
      set({ user, token, isAuthenticated: true, defaultBranchId })
    }
  },

  setDefaultBranch: (branchId) => {
    localStorage.setItem('defaultBranchId', branchId)
    set({ defaultBranchId: branchId })
  },

  updateUser: (updates) => {
    set((state) => {
      const merged = { ...state.user, ...updates }
      localStorage.setItem('user', JSON.stringify(merged))
      return { user: merged }
    })
  },
}))

export default useAuthStore