import api from './api'

export const staffLogin = async (email, password) => {
  const response = await api.post('/api/auth/staff/login', { email, password })
  return response.data
}
