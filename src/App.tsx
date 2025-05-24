import React, { useState, useEffect } from 'react'
import { ClipboardList, FileCheck, FileSpreadsheet, PieChart, LogOut } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import { EntryForm } from './components/EntryForm'
import { TakenEntries } from './components/TakenEntries'
import { SettledEntries } from './components/SettledEntries'
import { Report } from './components/Report'
import { AuthForm } from './components/AuthForm'
import { supabase } from './lib/supabase'
import type { User } from '@supabase/supabase-js'

function App() {
  const [activeTab, setActiveTab] = useState('entry')
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check active session and handle refresh token
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }

        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Session check error:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Clear any local state if needed
      setUser(null)
      setActiveTab('entry')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const navItems = [
    { id: 'entry', label: 'Entry', icon: ClipboardList },
    { id: 'taken', label: 'Taken Entry', icon: FileCheck },
    { id: 'settled', label: 'Settled Entry', icon: FileSpreadsheet },
    { id: 'report', label: 'Report', icon: PieChart },
  ]

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (!user) {
      return <AuthForm />
    }

    switch (activeTab) {
      case 'entry':
        return <EntryForm />
      case 'taken':
        return <TakenEntries />
      case 'settled':
        return <SettledEntries />
      case 'report':
        return <Report />
      default:
        return (
          <p className="text-gray-600">
            Content for {navItems.find(item => item.id === activeTab)?.label} will be displayed here.
          </p>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Navigation Bar */}
      {user && (
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex flex-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium transition-colors duration-200 ease-in-out
                        ${
                          activeTab === item.id
                            ? 'border-blue-500 text-blue-600 bg-blue-50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5 mr-2" />
                      {item.label}
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center">
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {user && (
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              {navItems.find(item => item.id === activeTab)?.label}
            </h2>
          )}
          {renderContent()}
        </div>
      </main>
    </div>
  )
}

export default App