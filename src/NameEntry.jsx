import { useState } from 'react'
import { supabase } from './lib/supabase'

export default function NameEntry({ onDone }) {
  const [mode, setMode] = useState('new') // 'new' | 'recover'
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [recoverValue, setRecoverValue] = useState('')
  const [recovering, setRecovering] = useState(false)
  const [recoverError, setRecoverError] = useState('')

  const missingContact = !phone.trim() && !email.trim()
  const empty = name.trim().length === 0 || missingContact

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

  async function handleRecover() {
    const val = recoverValue.trim()
    if (!val || recovering) return
    setRecovering(true)
    setRecoverError('')
    try {
      const [{ data: byPhone }, { data: byEmail }] = await Promise.all([
        supabase.from('Users').select('*').eq('phone', val).limit(1),
        supabase.from('Users').select('*').eq('email', val).limit(1),
      ])
      const found = byPhone?.[0] || byEmail?.[0]
      if (!found) {
        setRecoverError('No account found with that phone or email.')
        setRecovering(false)
        return
      }
      localStorage.setItem('fl_user', JSON.stringify(found))
      onDone(found)
    } catch (e) {
      setRecoverError('Something went wrong. Please try again.')
      setRecovering(false)
    }
  }

  if (mode === 'recover') {
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

        <h1 style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 34, lineHeight: 1.1, color: '#2C2622', margin: '0 0 10px' }}>
          Recover your account
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.5, color: '#7C756C', margin: '0 0 28px', maxWidth: 280 }}>
          Enter the phone number or email you signed up with.
        </p>

        <FieldInput
          label="Phone or email"
          value={recoverValue}
          onChange={setRecoverValue}
          placeholder="+972 50 000 0000 or you@example.com"
          autoFocus
          onEnter={handleRecover}
        />

        {recoverError && <div style={{ color: '#B24A3A', fontSize: 14, marginBottom: 8 }}>{recoverError}</div>}

        <button
          onClick={handleRecover}
          disabled={!recoverValue.trim() || recovering}
          style={{
            marginTop: 8, width: '100%', border: 'none', borderRadius: 16,
            padding: 17, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600,
            fontSize: 17, color: '#F7F5F1',
            background: !recoverValue.trim() ? '#E3B5A8' : '#C05A3E',
            cursor: !recoverValue.trim() || recovering ? 'not-allowed' : 'pointer',
            opacity: !recoverValue.trim() ? 0.7 : 1, transition: 'background .2s, opacity .2s',
          }}
        >
          {recovering ? 'Looking…' : 'Recover account'}
        </button>

        <button
          onClick={() => { setMode('new'); setRecoverError('') }}
          style={{ marginTop: 18, border: 'none', background: 'transparent', color: '#A39B90', fontSize: 14, cursor: 'pointer', textDecoration: 'underline' }}
        >
          Back to sign up
        </button>
      </div>
    )
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
        Add a phone number or email — so you can recover your account if you're logged out, and friends can reach you:
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

      {missingContact && name.trim() && (
        <div style={{ color: '#B24A3A', fontSize: 13, marginBottom: 8 }}>Please add a phone number or email.</div>
      )}
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

      <button
        onClick={() => { setMode('recover'); setError('') }}
        style={{ marginTop: 18, border: 'none', background: 'transparent', color: '#A39B90', fontSize: 14, cursor: 'pointer', textDecoration: 'underline' }}
      >
        Already have an account? Recover it
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
