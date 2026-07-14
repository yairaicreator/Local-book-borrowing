import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { STATUS, avatarPalette, initial } from './lib/utils'
import BookCover from './BookCover'

export default function MembersTabDesktop({ currentUser, books, onOpenBook }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [focusedId, setFocusedId] = useState(null)

  useEffect(() => {
    supabase.from('Users').select('id, name').neq('id', currentUser.id).order('name')
      .then(({ data }) => { setUsers(data || []); setLoading(false) })
  }, [currentUser.id])

  const memberList = users.map(u => {
    const count = books.filter(b => b.add_by === u.id).length
    const pal = avatarPalette(u.id)
    return { ...u, count, bg: pal.bg, color: pal.color }
  })

  const focused = memberList.find(m => m.id === focusedId)
  const focusedBooks = focusedId ? books.filter(b => b.add_by === focusedId) : []

  if (focused) {
    return (
      <>
        <button onClick={() => setFocusedId(null)} style={{ border: 'none', cursor: 'pointer', background: '#F0ECE4', borderRadius: 999, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 13, color: '#6E675C', marginBottom: 18 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6E675C" strokeWidth="2.4" strokeLinecap="round"><path d="M15 5l-7 7 7 7" /></svg>
          כל החברים
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: focused.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 19, color: focused.color, flex: 'none' }}>{initial(focused.name)}</div>
          <div>
            <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 22, color: '#2C2622' }}>המדף של {focused.name}</div>
            <div style={{ fontSize: 14, color: '#8A8278' }}>{focusedBooks.length} ספרים</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(168px,1fr))', gap: '26px 22px' }}>
          {focusedBooks.map(book => {
            const s = STATUS[book.status] || STATUS.available
            return (
              <div key={book.id} onClick={() => onOpenBook(book)} style={{ cursor: 'pointer' }}>
                <div style={{ position: 'relative', width: '100%', aspectRatio: '128/182', borderRadius: 11, overflow: 'hidden', boxShadow: '0 10px 22px -10px rgba(60,48,30,.42)' }}>
                  <BookCover book={book} width="100%" height="100%" fontSize={18} authorSize={10} />
                  <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#FFFFFF', background: s.color, padding: '4px 8px', borderRadius: 999 }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2622', marginTop: 11, lineHeight: 1.25 }}>{book.title}</div>
                <div style={{ fontSize: 13, color: '#7C756C', lineHeight: 1.3 }}>{book.author}</div>
              </div>
            )
          })}
        </div>
        {focusedBooks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#A39B90', fontSize: 16 }}>המדף ריק כרגע.</div>
        )}
      </>
    )
  }

  return (
    <>
      {loading && <div style={{ textAlign: 'center', padding: '80px 0', color: '#A39B90' }}>טוען…</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
        {!loading && memberList.map(m => (
          <button key={m.id} onClick={() => setFocusedId(m.id)} style={{ border: '1.5px solid #ECE7DE', background: '#FFFFFF', borderRadius: 16, padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', transition: 'box-shadow .15s, transform .15s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 10px 22px -10px rgba(60,48,30,.35)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, color: m.color, flex: 'none' }}>{initial(m.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 16, color: '#2C2622' }}>{m.name}</div>
              <div style={{ fontSize: 13, color: '#A39B90', marginTop: 1 }}>{m.count} {m.count === 1 ? 'ספר' : 'ספרים'}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CFC8BB" strokeWidth="2.2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        ))}
      </div>
      {!loading && memberList.length === 0 && (
        <div style={{ textAlign: 'center', color: '#A39B90', fontSize: 16, padding: '80px 10px' }}>אין עדיין חברים נוספים.</div>
      )}
    </>
  )
}
