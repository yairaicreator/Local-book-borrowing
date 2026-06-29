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
      minHeight: '100vh', display: 'flex', alignItems: 'stretch', justifyContent: 'center',
      background: '#e7e1d4', fontFamily: "'Source Sans 3', sans-serif",
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
