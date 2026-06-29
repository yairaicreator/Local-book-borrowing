import { useState, useEffect } from 'react'
import NameEntry from './NameEntry'
import Home from './Home'
import { supabase } from './lib/supabase'

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = loading

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
          setUser(data) // also refresh any changed fields
        } else {
          localStorage.removeItem('fl_user')
          setUser(null)
        }
      } catch {
        setUser(null)
      }
    }
    loadUser()
  }, [])

  if (user === undefined) return null // initial load

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'stretch', justifyContent: 'center',
      background: '#EDEAE5', fontFamily: "'Source Sans 3', sans-serif",
    }}>
      <div style={{
        position: 'relative', width: '100%', maxWidth: 430, minHeight: '100vh',
        background: '#F5F0E6', overflow: 'hidden',
      }}>
        {user
          ? <Home currentUser={user} />
          : <NameEntry onDone={setUser} />
        }
      </div>
    </div>
  )
}
