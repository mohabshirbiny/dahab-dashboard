import axios, { type AxiosInstance } from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const http: AxiosInstance = axios.create({
  baseURL,
  timeout: 20000,
  headers: {
    Accept: 'application/json',
  },
})

http.interceptors.request.use(config => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('vp_admin_token') : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const locale = typeof localStorage !== 'undefined' ? localStorage.getItem('vp_admin_locale') : null
  if (locale) {
    config.headers['Accept-Language'] = locale
  }

  return config
})

http.interceptors.response.use(
  response => response,
  error => {
    return Promise.reject(error)
  },
)
