import { useState, useEffect } from 'react'
import NameEntry from './NameEntry'
import Home from './Home'

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = loading

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fl_user')
      setUser(saved ? JSON.parse(saved) : null)
    } catch {
      setUser(null)
    }
  }, [])

  if (user === undefined) return null // initial load

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#e7e1d4', padding: '24px 0',
      fontFamily: "'Source Sans 3', sans-serif",
    }}>
      <div style={{
        position: 'relative', width: 390, height: 844,
        background: '#F5F0E6', borderRadius: 44, overflow: 'hidden',
        boxShadow: '0 30px 70px -20px rgba(60,48,30,.45), 0 0 0 11px #1f1b15, 0 0 0 13px #34302a',
      }}>
        {user
          ? <Home currentUser={user} />
          : <NameEntry onDone={setUser} />
        }
      </div>
    </div>
  )
}
