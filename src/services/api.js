import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthAttempt = error.config?.url?.includes('/api/auth/')

    // A request that started under an old session (e.g. a stale call fired
    // right before a new login/register completed) may resolve after a
    // newer token is already in place. If the token has since changed,
    // this failure is stale and irrelevant — acting on it would wrongly
    // log out the NEW session. Only react if the failing request's token
    // is still the one currently active.
    const requestToken = error.config?.headers?.Authorization?.replace('Bearer ', '')
    const currentToken = localStorage.getItem('token')
    const isStaleRequest = requestToken && requestToken !== currentToken

    const inactive = error.response?.status === 403 && error.response?.data?.code === 'ACCOUNT_INACTIVE'
    if ((error.response?.status === 401 || inactive) && !isAuthAttempt && !isStaleRequest) {
      if (inactive) sessionStorage.setItem('loginNotice', error.response.data.message)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api