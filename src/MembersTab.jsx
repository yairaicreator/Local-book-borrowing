import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { STATUS, avatarPalette, initial } from './lib/utils'
import BookCover from './BookCover'

export default function MembersTab({ currentUser, books, onOpenBook }) {
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
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '54px 22px 16px' }}>
          <button onClick={() => setFocusedId(null)} style={{ border: 'none', cursor: 'pointer', background: '#F0ECE4', borderRadius: 999, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 13, color: '#6E675C', marginBottom: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6E675C" strokeWidth="2.4" strokeLinecap="round"><path d="M9 5l7 7-7 7" /></svg>
            כל החברים
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: focused.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, color: focused.color, flex: 'none' }}>{initial(focused.name)}</div>
            <div>
              <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 20, color: '#2C2622' }}>המדף של {focused.name}</div>
              <div style={{ fontSize: 13, color: '#8A8278' }}>{focusedBooks.length} ספרים</div>
            </div>
          </div>
        </div>
        <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '6px 22px 116px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {focusedBooks.map(book => {
              const s = STATUS[book.status] || STATUS.available
              return (
                <div key={book.id} onClick={() => onOpenBook(book)} style={{ cursor: 'pointer' }}>
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1.05', borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 16px -8px rgba(60,48,30,.3)' }}>
                    <BookCover book={book} width="100%" height="100%" fontSize={17} authorSize={10} />
                    <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#FFFFFF', background: s.color, padding: '4px 8px', borderRadius: 999 }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2622', marginTop: 9, lineHeight: 1.25 }}>{book.title}</div>
                  <div style={{ fontSize: 12.5, color: '#8A8278', marginTop: 1 }}>{book.author}</div>
                </div>
              )
            })}
          </div>
          {focusedBooks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#A39B90', fontSize: 15 }}>המדף ריק כרגע.</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '54px 22px 16px' }}>
        <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 26, color: '#2C2622' }}>חברים</div>
        <div style={{ fontSize: 14, color: '#8A8278', marginTop: 3 }}>הקש על שם כדי לעיין במדף שלו</div>
      </div>
      <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '6px 22px 116px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '60px 30px', color: '#A39B90', fontSize: 15 }}>טוען…</div>}
        {!loading && memberList.map(m => (
          <button key={m.id} onClick={() => setFocusedId(m.id)} style={{ width: '100%', border: '1.5px solid #ECE7DE', background: '#FFFFFF', borderRadius: 14, padding: '12px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 13, cursor: 'pointer', textAlign: 'right' }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: m.color, flex: 'none' }}>{initial(m.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15.5, color: '#2C2622' }}>{m.name}</div>
              <div style={{ fontSize: 13, color: '#A39B90', marginTop: 1 }}>{m.count} {m.count === 1 ? 'ספר' : 'ספרים'}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CFC8BB" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        ))}
        {!loading && memberList.length === 0 && (
          <div style={{ textAlign: 'center', color: '#A39B90', fontSize: 15, padding: '60px 10px' }}>אין עדיין חברים נוספים — שתף את קישור האפליקציה כדי להזמין את המשפחה.</div>
        )}
      </div>
    </div>
  )
}
