import { useState } from 'react'
import { supabase } from './lib/supabase'
import { avatarPalette, initial } from './lib/utils'

export default function Profile({ currentUser, onClose, onUserUpdate, onLogout }) {
  const [editingProfile, setEditingProfile] = useState(false)
  const [editName, setEditName] = useState(currentUser.name || '')
  const [editPhone, setEditPhone] = useState(currentUser.phone || '')
  const [editEmail, setEditEmail] = useState(currentUser.email || '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')

  async function saveProfile() {
    if (!editName.trim()) { setProfileError('שם לא יכול להיות ריק.'); return }
    setSavingProfile(true)
    setProfileError('')
    const { data, error } = await supabase.from('Users').update({
      name: editName.trim(),
      phone: editPhone.trim() || null,
      email: editEmail.trim() || null,
    }).eq('id', currentUser.id).select().single()
    setSavingProfile(false)
    if (error) { setProfileError('שגיאה בשמירה — נסה שנית.'); return }
    localStorage.setItem('fl_user', JSON.stringify(data))
    onUserUpdate?.(data)
    setEditingProfile(false)
  }

  const pal = avatarPalette(currentUser.id)

  const inputStyle = {
    width: '100%', border: '1.5px solid #E7E1D6', borderRadius: 12, padding: '12px 14px',
    fontFamily: "'Source Sans 3',sans-serif", fontSize: 15, color: '#2C2622', background: '#FFFFFF',
    outline: 'none', boxSizing: 'border-box', marginBottom: 12,
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#F7F5F1', zIndex: 30, display: 'flex', flexDirection: 'column', animation: 'flFade .22s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '58px 18px 14px', borderBottom: '1px solid #ECE7DE' }}>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: '#F0ECE4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6E675C" strokeWidth="2.4" strokeLinecap="round"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 21, color: '#2C2622' }}>הפרופיל שלי</div>
      </div>

      <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 48px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: editingProfile ? 20 : 32 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: pal.bg, color: pal.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 24, flex: 'none' }}>
            {initial(editName || currentUser.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 22, color: '#2C2622' }}>{currentUser.name}</div>
            {currentUser.phone && <div style={{ fontSize: 13, color: '#A39B90', marginTop: 2 }}>{currentUser.phone}</div>}
            {currentUser.email && <div style={{ fontSize: 13, color: '#A39B90' }}>{currentUser.email}</div>}
          </div>
          <button onClick={() => { setEditName(currentUser.name || ''); setEditPhone(currentUser.phone || ''); setEditEmail(currentUser.email || ''); setEditingProfile(v => !v) }} style={{ flexShrink: 0, border: '1.5px solid #E7E1D6', background: '#FFFFFF', borderRadius: 10, padding: '7px 13px', fontSize: 13, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, color: '#6E675C', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            ערוך
          </button>
        </div>

        {editingProfile && (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #ECE7DE', borderRadius: 16, padding: '20px 18px', marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#A39B90', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>שם</div>
            <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="שם מלא" dir="rtl" style={inputStyle} />
            <div style={{ fontSize: 11, fontWeight: 600, color: '#A39B90', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>טלפון</div>
            <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="05X-XXXXXXX" type="tel" style={inputStyle} />
            <div style={{ fontSize: 11, fontWeight: 600, color: '#A39B90', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>אימייל</div>
            <input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="name@example.com" type="email" style={{ ...inputStyle, marginBottom: 16 }} />
            {profileError && <div style={{ color: '#B24A3A', fontSize: 13, marginBottom: 10 }}>{profileError}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveProfile} disabled={savingProfile} style={{ flex: 1, border: 'none', borderRadius: 12, padding: 13, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 15, color: '#F7F5F1', background: '#C05A3E', cursor: 'pointer' }}>
                {savingProfile ? 'שומר…' : 'שמור'}
              </button>
              <button onClick={() => setEditingProfile(false)} style={{ flex: 1, border: '1.5px solid #E7E1D6', background: 'transparent', borderRadius: 12, padding: 13, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 15, color: '#6E675C', cursor: 'pointer' }}>
                ביטול
              </button>
            </div>
          </div>
        )}

        {onLogout && (
          <button onClick={onLogout} style={{ width: '100%', border: '1.5px solid #E7E1D6', background: 'transparent', borderRadius: 14, padding: 14, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 15, color: '#B24A3A', cursor: 'pointer', marginTop: 8 }}>
            התנתק
          </button>
        )}
      </div>
    </div>
  )
}
