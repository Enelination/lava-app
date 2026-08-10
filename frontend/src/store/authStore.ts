import { create } from 'zustand'
import type { User } from '../types'
import { auth as authApi } from '../lib/api'

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  initialized: boolean
  showAuth: boolean
  authTab: number

  login: (email: string, password: string) => Promise<void>
  loginByLicence: (licence: string, password: string) => Promise<void>
  register: (data: { name: string; email: string; password: string; licence_number?: string; organisation?: string }) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
  init: () => Promise<void>
  openAuth: (tab: number) => void
  closeAuth: () => void
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: false,
  initialized: false,
  showAuth: false,
  authTab: 0,

  init: async () => {
    const token = localStorage.getItem('lava_token')
    if (!token) {
      set({ initialized: true })
      return
    }
    try {
      const { user } = await authApi.me()
      set({ user, token, initialized: true })
    } catch {
      localStorage.removeItem('lava_token')
      set({ initialized: true })
    }
  },

  login: async (email: string, password: string) => {
    set({ loading: true })
    try {
      const { token, user } = await authApi.login({ email, password })
      localStorage.setItem('lava_token', token)
      set({ user, token, loading: false })
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  loginByLicence: async (licence_number: string, password: string) => {
    set({ loading: true })
    try {
      const { token, user } = await authApi.login({ licence_number, password })
      localStorage.setItem('lava_token', token)
      set({ user, token, loading: false })
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  register: async (data) => {
    set({ loading: true })
    try {
      const { token, user } = await authApi.register(data)
      localStorage.setItem('lava_token', token)
      set({ user, token, loading: false })
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('lava_token')
    set({ user: null, token: null })
  },

  setUser: (user) => set({ user }),

  openAuth: (tab) => set({ showAuth: true, authTab: tab }),
  closeAuth: () => set({ showAuth: false }),
}))
