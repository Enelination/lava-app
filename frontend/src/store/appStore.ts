import { create } from 'zustand'
import type { Submission, DashboardStats, ChatMessage, PendingAttachment } from '../types'

interface AppState {
  activePage: string
  submissions: Submission[]
  stats: DashboardStats | null
  chatMessages: ChatMessage[]
  pendingImage: PendingAttachment | null
  pendingDoc: PendingAttachment | null
  freeQuestions: number
  showUpgradeBanner: boolean

  setActivePage: (page: string) => void
  setSubmissions: (subs: Submission[]) => void
  setStats: (stats: DashboardStats) => void
  addChatMessage: (msg: ChatMessage) => void
  clearChat: () => void
  setPendingImage: (att: PendingAttachment | null) => void
  setPendingDoc: (att: PendingAttachment | null) => void
  incrementFreeQuestions: () => void
  setShowUpgradeBanner: (show: boolean) => void
}

export const useApp = create<AppState>((set) => ({
  activePage: 'home',
  submissions: [],
  stats: null,
  chatMessages: [
    {
      role: 'assistant',
      content: 'Hello! I am LAVA, Ghana\'s AI-powered land valuation assistant. I am trained on GhIS valuation standards, Ghana Land Act 2020, Stamp Duty Act, and Market Comparison Analysis methodology - with direct access to the verified LAVA land transaction database.\n\nAsk me about land values, comparable sales, stamp duty, or valuation methodology.',
    },
  ],
  pendingImage: null,
  pendingDoc: null,
  freeQuestions: 0,
  showUpgradeBanner: false,

  setActivePage: (page) => set({ activePage: page }),
  setSubmissions: (subs) => set({ submissions: subs }),
  setStats: (stats) => set({ stats }),
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  clearChat: () => set({
    chatMessages: [
      {
        role: 'assistant',
        content: 'Hello! I am LAVA, Ghana\'s AI-powered land valuation assistant. I am trained on GhIS valuation standards, Ghana Land Act 2020, Stamp Duty Act, and Market Comparison Analysis methodology - with direct access to the verified LAVA land transaction database.\n\nAsk me about land values, comparable sales, stamp duty, or valuation methodology.',
      },
    ],
  }),
  setPendingImage: (att) => set({ pendingImage: att }),
  setPendingDoc: (att) => set({ pendingDoc: att }),
  incrementFreeQuestions: () => set((s) => {
    const next = s.freeQuestions + 1
    return { freeQuestions: next, showUpgradeBanner: next >= 2 }
  }),
  setShowUpgradeBanner: (show) => set({ showUpgradeBanner: show }),
}))
