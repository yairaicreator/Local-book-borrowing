import { useState } from 'react'
import { supabase } from './lib/supabase'

export default function NameEntry({ onDone }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const empty = name.trim().length === 0

  async function handleSubmit() {
    if (empty || loading) return
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('Users')
        .insert({
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
        })
        .select()
        .single()
      if (err) throw err
      localStorage.setItem('fl_user', JSON.stringify(data))
      onDone(data)
    } catch (e) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fl-scroll" style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', padding: '40px 34px',
      background: '#F7F5F1', overflowY: 'auto',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 15, background: '#C05A3E',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 30, boxShadow: '0 8px 20px -6px rgba(180,90,60,.55)',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: "'Lora',serif", fontWeight: 600, color: '#F7F5F1', fontSize: 27, lineHeight: 1 }}>F</span>
      </div>

      <div style={{ fontFamily: "'Lora',serif", fontSize: 14, letterSpacing: '.16em', textTransform: 'uppercase', color: '#A39B90', marginBottom: 14 }}>
        Family Library
      </div>
      <h1 style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 38, lineHeight: 1.1, color: '#2C2622', margin: '0 0 10px' }}>
        What's your name?
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.5, color: '#7C756C', margin: '0 0 28px', maxWidth: 280 }}>
        So your friends know whose shelf they're borrowing from.
      </p>

      <FieldInput
        label="Your name"
        value={name}
        onChange={setName}
        placeholder="Type your name"
        autoFocus
        onEnter={handleSubmit}
      />

      <div style={{ fontSize: 13, color: '#A39B90', margin: '4px 0 18px', fontStyle: 'italic' }}>
        Optional — so others can reach you when they want to borrow a book:
      </div>

      <FieldInput
        label="WhatsApp / phone"
        value={phone}
        onChange={setPhone}
        placeholder="+972 50 000 0000"
        type="tel"
        onEnter={handleSubmit}
      />
      <FieldInput
        label="Email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        type="email"
        onEnter={handleSubmit}
      />

      {error && <div style={{ color: '#B24A3A', fontSize: 14, marginBottom: 8 }}>{error}</div>}

      <button
        onClick={handleSubmit}
        disabled={empty || loading}
        style={{
          marginTop: 8, width: '100%', border: 'none', borderRadius: 16,
          padding: 17, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600,
          fontSize: 17, color: '#F7F5F1',
          background: empty ? '#E3B5A8' : '#C05A3E',
          cursor: empty || loading ? 'not-allowed' : 'pointer',
          opacity: empty ? 0.7 : 1, transition: 'background .2s, opacity .2s',
        }}
      >
        {loading ? 'Saving…' : 'Continue'}
      </button>
    </div>
  )
}

function FieldInput({ label, value, onChange, placeholder, type = 'text', autoFocus, onEnter }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#7C756C', marginBottom: 6 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          width: '100%', border: '1.5px solid #E7E1D6', background: '#FFFFFF',
          borderRadius: 14, padding: '14px 16px',
          fontFamily: "'Source Sans 3',sans-serif", fontSize: 16, color: '#2C2622',
          outline: 'none', boxShadow: '0 2px 8px -4px rgba(60,48,30,.10)',
        }}
        onFocus={e => e.target.style.borderColor = '#C05A3E'}
        onBlur={e => e.target.style.borderColor = '#E7E1D6'}
      />
    </div>
  )
}
