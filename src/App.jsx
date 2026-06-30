import { useState, useEffect } from 'react'
import NameEntry from './NameEntry'
import Home from './Home'
import HomeDesktop from './HomeDesktop'
import { supabase } from './lib/supabase'

function useDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 640)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const handler = (e) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = loading
  const isDesktop = useDesktop()

  useEffect(() => {
    async function loadUser() {
      try {
        const saved = localStorage.getItem('fl_user')
        if (!saved) { setUser(null); return }
        const parsed = JSON.parse(saved)
        // verify the user still exists in the DB
        const { data } = await supabase
          .from('Users').select('*').eq('id', parsed.id).maybeSingle()
        if (data) {
          setUser(data) // refresh any changed fields
        } else {
          // User was deleted from DB — re-insert them so they don't need to re-enter their name
          const { data: newData } = await supabase
            .from('Users')
            .insert({ name: parsed.name, phone: parsed.phone || null, email: parsed.email || null })
            .select().single()
          if (newData) {
            localStorage.setItem('fl_user', JSON.stringify(newData))
            setUser(newData)
          } else {
            localStorage.removeItem('fl_user')
            setUser(null)
          }
        }
      } catch {
        setUser(null)
      }
    }
    loadUser()
  }, [])

  if (user === undefined) return null // initial load

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'stretch', justifyContent: 'center', background: '#EDEAE5', fontFamily: "'Source Sans 3', sans-serif" }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 430, minHeight: '100vh', background: '#F5F0E6', overflow: 'hidden' }}>
          <NameEntry onDone={setUser} />
        </div>
      </div>
    )
  }

  if (isDesktop) {
    return <HomeDesktop currentUser={user} />
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'stretch', justifyContent: 'center', background: '#EDEAE5', fontFamily: "'Source Sans 3', sans-serif" }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 430, minHeight: '100vh', background: '#F5F0E6', overflow: 'hidden' }}>
        <Home currentUser={user} onUserUpdate={setUser} />
      </div>
    </div>
  )
}
