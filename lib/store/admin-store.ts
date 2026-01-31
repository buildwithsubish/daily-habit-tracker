import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AdminState {
  isSidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  activeTab: string
  setActiveTab: (tab: string) => void
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (collapsed: boolean) => set({ isSidebarCollapsed: collapsed }),
      activeTab: 'dashboard',
      setActiveTab: (tab: string) => set({ activeTab: tab }),
    }),
    {
      name: 'admin-storage',
    }
  )
)
