import { lazy, Suspense } from 'react'
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

// Today is the landing screen and ships in the main bundle; the other sections
// are split out so a cold open on a phone doesn't parse code for tabs the user
// hasn't visited yet.
const TasksPage = lazy(() => import('@/features/tasks/TasksPage').then((m) => ({ default: m.TasksPage })))
const HabitsPage = lazy(() => import('@/features/habits/HabitsPage').then((m) => ({ default: m.HabitsPage })))
const SchedulePage = lazy(() => import('@/features/schedule/SchedulePage').then((m) => ({ default: m.SchedulePage })))

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
                <Suspense fallback={null}>
                  <Routes>
                    <Route path="/" element={<TodayPage />} />
                    <Route path="/tasks" element={<TasksPage />} />
                    <Route path="/habits" element={<HabitsPage />} />
                    <Route path="/schedule" element={<SchedulePage />} />
                  </Routes>
                </Suspense>
              </Shell>
            </Gate>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
