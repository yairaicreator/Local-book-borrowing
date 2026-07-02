import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { initial } from './lib/utils'
import BookBoard from './BookBoard'
import BookDetail from './BookDetail'
import AddBook from './AddBook'
import Profile from './Profile'
import Toast from './Toast'
import NotificationBell from './NotificationBell'

export default function Home({ currentUser: initialUser, onUserUpdate }) {
  const [currentUser, setCurrentUser] = useState(initialUser)
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeBook, setActiveBook] = useState(null)
  const [editBook, setEditBook] = useState(null)
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

  useEffect(() => { fetchBooks() }, [fetchBooks])

  const q = search.trim().toLowerCase()
  const filtered = books.filter(b =>
    !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
  )

  const emptyShelf = books.length === 0 && !q && !loading
  const noMatch = filtered.length === 0 && !!q

  function handleBorrow(book) {
    showToast(`Request sent to ${book.Users?.name || 'the owner'}`)
    setActiveBook(null)
  }

  const firstName = currentUser.name ? currentUser.name.split(' ')[0] : 'there'

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#F7F5F1' }}>
      {/* header */}
      <div style={{ padding: '56px 22px 14px', background: '#F7F5F1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, background: '#C05A3E',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
            boxShadow: '0 6px 14px -5px rgba(180,90,60,.5)',
          }}>
            <span style={{ fontFamily: "'Lora',serif", fontWeight: 600, color: '#F7F5F1', fontSize: 20, lineHeight: 1 }}>F</span>
          </div>
          <div>
            <div style={{ fontSize: 12, letterSpacing: '.13em', textTransform: 'uppercase', color: '#A39B90', fontWeight: 600, lineHeight: 1, marginBottom: 3 }}>Family Library</div>
            <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 21, color: '#2C2622', letterSpacing: '-.01em', lineHeight: 1 }}>שלום, {firstName}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <NotificationBell currentUser={currentUser} small />
            <button onClick={() => setShowProfile(true)} style={{
              width: 40, height: 40, borderRadius: '50%',
              background: '#E7C8A0', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 600, fontSize: 16, color: '#7A4A28', flex: 'none',
              border: 'none', cursor: 'pointer',
            }}>
              {initial(currentUser.name)}
            </button>
          </div>
        </div>

        {/* search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#FFFFFF', border: '1.5px solid #E7E1D6',
          borderRadius: 14, padding: '11px 14px',
          boxShadow: '0 2px 8px -5px rgba(60,48,30,.12)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A39B90" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" />
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש ספרים ומחברים" dir="rtl"
            style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: "'Source Sans 3',sans-serif", fontSize: 15, color: '#2C2622', width: '100%' }}
          />
        </div>
      </div>

      {/* board */}
      <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '8px 0 110px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 30px', color: '#A39B90', fontSize: 15 }}>טוען…</div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ padding: '2px 20px 6px' }}>
            <BookBoard books={filtered} onBookClick={setActiveBook} />
          </div>
        )}

        {/* rich empty state */}
        {emptyShelf && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '70px 40px 0' }}>
            <div style={{
              width: 96, height: 96, borderRadius: 28, background: '#F1ECE3',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 24, boxShadow: 'inset 0 2px 6px rgba(120,95,60,.08)',
            }}>
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#C05A3E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <h2 style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 23, color: '#2C2622', margin: '0 0 8px' }}>המדף שלך ריק</h2>
            <p style={{ fontSize: 15, lineHeight: 1.55, color: '#7C756C', margin: '0 0 26px', maxWidth: 260 }}>
              הוסף את הספר הראשון והתחל לשתף קריאה עם המשפחה והחברים.
            </p>
            <button onClick={() => setShowAdd(true)} style={{
              border: 'none', borderRadius: 14, padding: '14px 26px',
              fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 16,
              color: '#F7F5F1', background: '#C05A3E', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 9,
              boxShadow: '0 10px 22px -8px rgba(180,90,60,.6)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F7F5F1" strokeWidth="2.6" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              הוסף ספר
            </button>
          </div>
        )}

        {noMatch && (
          <div style={{ textAlign: 'center', padding: '60px 30px', color: '#A39B90', fontSize: 15 }}>
            לא נמצאו ספרים התואמים ל"{search}".
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={() => setShowAdd(true)} style={{
        position: 'absolute', right: 20, bottom: 28,
        width: 60, height: 60, border: 'none', borderRadius: 20,
        background: '#C05A3E', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 12px 26px -8px rgba(180,90,60,.7)',
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F7F5F1" strokeWidth="2.6" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {activeBook && (
        <BookDetail book={activeBook} currentUser={currentUser} onClose={() => setActiveBook(null)} onBorrow={handleBorrow} onEdit={b => { setActiveBook(null); setEditBook(b) }} />
      )}
      {showAdd && (
        <AddBook currentUser={currentUser} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); showToast('הספר נוסף למדף'); fetchBooks() }} />
      )}
      {editBook && (
        <AddBook currentUser={currentUser} bookToEdit={editBook} onClose={() => setEditBook(null)} onSaved={() => { setEditBook(null); showToast('הספר עודכן בהצלחה'); fetchBooks() }} />
      )}
      {showProfile && (
        <Profile currentUser={currentUser} onClose={() => setShowProfile(false)}
          onEdit={b => { setShowProfile(false); setEditBook(b) }}
          onUserUpdate={u => { setCurrentUser(u); onUserUpdate?.(u) }} />
      )}
      <Toast message={toast} />
    </div>
  )
}
