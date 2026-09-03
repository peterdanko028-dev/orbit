import type React from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient, setupPersistence } from '@/lib/query'
import { AuthProvider, useAuth } from '@/lib/auth'
import { ToastProvider } from '@/components/Toast'
import { supabaseConfigured } from '@/lib/supabase'
import { SetupScreen } from './SetupScreen'
import { LoginScreen } from './LoginScreen'
import { Shell } from './Shell'
import { TodayPage } from '@/features/today/TodayPage'
import { TasksPage } from '@/features/tasks/TasksPage'

setupPersistence()

function Gate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (!session) return <LoginScreen />
  return <>{children}</>
}

export function App() {
  if (!supabaseConfigured) return <SetupScreen />

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Gate>
              <Shell>
                <Routes>
                  <Route path="/" element={<TodayPage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                </Routes>
              </Shell>
            </Gate>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
