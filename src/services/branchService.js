import api from './api'

export const getBranches = async () => {
  const response = await api.get('/api/branches')
  return response.data
}