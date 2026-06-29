import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { STATUS, avatarPalette, initial } from './lib/utils'
import BookCover from './BookCover'
import BookDetail from './BookDetail'
import AddBook from './AddBook'
import Profile from './Profile'
import Toast from './Toast'

export default function Home({ currentUser }) {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('user')
  const [activeBook, setActiveBook] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [toast, setToast] = useState('')
  const toastRef = { current: null }

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(''), 1900)
  }, [])

  const fetchBooks = useCallback(async () => {
    const { data, error } = await supabase
      .from('Books')
      .select('*, Users(id, name, phone, email)')
      .order('created_at', { ascending: true })
    if (!error) setBooks(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  // filter + search
  const q = search.trim().toLowerCase()
  const filtered = books.filter(b =>
    !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
  )

  // build groups
  let groups = []
  if (filter === 'user') {
    const byUser = {}
    filtered.forEach(b => {
      const uid = b.add_by
      if (!byUser[uid]) byUser[uid] = { name: b.Users?.name || 'Unknown', books: [] }
      byUser[uid].books.push(b)
    })
    groups = Object.entries(byUser).map(([uid, g]) => {
      const pal = avatarPalette(uid)
      return {
        key: uid,
        title: g.name,
        count: g.books.length,
        avatarLabel: initial(g.name),
        avatarBg: pal.bg,
        avatarColor: pal.color,
        avatarRadius: '50%',
        books: g.books,
      }
    })
  } else {
    const byTopic = {}
    filtered.forEach(b => {
      const t = b.topic || 'Other'
      if (!byTopic[t]) byTopic[t] = []
      byTopic[t].push(b)
    })
    groups = Object.keys(byTopic).sort().map(t => ({
      key: t,
      title: t,
      count: byTopic[t].length,
      avatarLabel: t[0],
      avatarBg: '#EFE6D3',
      avatarColor: '#8A6A3A',
      avatarRadius: 9,
      books: byTopic[t],
    }))
  }

  const noResults = filtered.length === 0 && !loading

  const pill = (on) => on
    ? { bg: '#33291C', color: '#F5F0E6', border: '#33291C' }
    : { bg: '#FFFCF5', color: '#7A6F58', border: '#E2D9C6' }
  const pu = pill(filter === 'user')
  const pt = pill(filter === 'topic')

  function handleBorrow(book) {
    const ownerName = book.Users?.name || 'the owner'
    showToast(`Request sent to ${ownerName}`)
    setActiveBook(null)
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#F5F0E6' }}>
      {/* header */}
      <div style={{ padding: '58px 20px 12px', background: '#F5F0E6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 11, background: '#B45A3C',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
          }}>
            <span style={{ fontFamily: "'Lora',serif", fontWeight: 600, color: '#F5F0E6', fontSize: 19, lineHeight: 1 }}>F</span>
          </div>
          <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 21, color: '#33291C', letterSpacing: '-.01em' }}>
            Family Library
          </div>
          <button onClick={() => setShowProfile(true)} style={{
            marginLeft: 'auto', width: 36, height: 36, borderRadius: '50%',
            background: '#E7C8A0', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 600, fontSize: 15, color: '#7A4A28', flex: 'none',
            border: 'none', cursor: 'pointer',
          }}>
            {initial(currentUser.name)}
          </button>
        </div>

        {/* search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#FFFCF5', border: '1.5px solid #E2D9C6',
          borderRadius: 14, padding: '11px 14px',
          boxShadow: '0 2px 8px -5px rgba(60,48,30,.12)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A8997E" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" />
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search titles or authors"
            style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: "'Source Sans 3',sans-serif", fontSize: 15, color: '#33291C', width: '100%' }}
          />
        </div>

        {/* filter pills */}
        <div style={{ display: 'flex', gap: 9, marginTop: 13 }}>
          <PillBtn onClick={() => setFilter('user')} pal={pu}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={pu.color} strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
            </svg>
            By User
          </PillBtn>
          <PillBtn onClick={() => setFilter('topic')} pal={pt}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={pt.color} strokeWidth="2.2" strokeLinecap="round">
              <path d="M4 5h16M4 12h16M4 19h10" />
            </svg>
            By Topic
          </PillBtn>
        </div>
      </div>

      {/* feed */}
      <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '8px 0 110px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 30px', color: '#A8997E', fontSize: 15 }}>Loading…</div>
        )}
        {!loading && groups.map(group => (
          <div key={group.key} style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px 12px' }}>
              <div style={{
                width: 30, height: 30, borderRadius: group.avatarRadius,
                background: group.avatarBg, color: group.avatarColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13, flex: 'none',
              }}>
                {group.avatarLabel}
              </div>
              <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 17, color: '#33291C' }}>{group.title}</div>
              <div style={{ fontSize: 13, color: '#A8997E', fontWeight: 500 }}>
                {group.count} {group.count === 1 ? 'book' : 'books'}
              </div>
            </div>
            <div className="fl-scroll" style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '2px 20px 6px' }}>
              {group.books.map(book => {
                const s = STATUS[book.status] || STATUS.available
                return (
                  <div key={book.id} onClick={() => setActiveBook(book)}
                    style={{ width: 128, flex: 'none', cursor: 'pointer' }}>
                    <BookCover book={book} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 9 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flex: 'none' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.label}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#8A7F6B', marginTop: 1, lineHeight: 1.3 }}>{book.author}</div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {noResults && (
          <div style={{ textAlign: 'center', padding: '60px 30px', color: '#A8997E', fontSize: 15 }}>
            {q ? `No books match “${search}”.` : 'No books yet. Tap + to add the first one!'}
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={() => setShowAdd(true)} style={{
        position: 'absolute', right: 20, bottom: 28,
        width: 60, height: 60, border: 'none', borderRadius: 20,
        background: '#B45A3C', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 12px 26px -8px rgba(180,90,60,.7)',
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F5F0E6" strokeWidth="2.6" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {/* overlays */}
      {activeBook && (
        <BookDetail
          book={activeBook}
          currentUser={currentUser}
          onClose={() => setActiveBook(null)}
          onBorrow={handleBorrow}
        />
      )}

      {showAdd && (
        <AddBook
          currentUser={currentUser}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false)
            showToast('Book saved to your shelf')
            fetchBooks()
          }}
        />
      )}

      {showProfile && (
        <Profile currentUser={currentUser} onClose={() => setShowProfile(false)} />
      )}

      <Toast message={toast} />
    </div>
  )
}

function PillBtn({ onClick, pal, children }) {
  return (
    <button onClick={onClick} style={{
      border: 'none', cursor: 'pointer',
      fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 14,
      padding: '8px 16px', borderRadius: 999,
      background: pal.bg, color: pal.color,
      borderStyle: 'solid', borderWidth: 1.5, borderColor: pal.border,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {children}
    </button>
  )
}
