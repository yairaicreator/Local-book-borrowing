import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import HomeTab from './HomeTab'
import ShelfTab from './ShelfTab'
import MembersTab from './MembersTab'
import ActivityTab from './ActivityTab'
import BookDetail from './BookDetail'
import AddBook from './AddBook'
import Profile from './Profile'
import Toast from './Toast'

const SHARE_URL = 'https://local-book-borrowing.vercel.app/'

export default function Home({ currentUser: initialUser, onUserUpdate }) {
  const [currentUser, setCurrentUser] = useState(initialUser)
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('home')
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

  function handleLogout() {
    localStorage.removeItem('fl_user')
    onUserUpdate?.(null)
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: 'Family Library', text: 'הצטרפו לספרייה המשפחתית שלנו!', url: SHARE_URL }).catch(() => {})
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(SHARE_URL).then(() => showToast('הקישור הועתק')).catch(() => showToast(SHARE_URL))
    } else {
      showToast(SHARE_URL)
    }
  }

  const fetchBooks = useCallback(async () => {
    const { data, error } = await supabase
      .from('Books')
      .select('*, Users(id, name, phone, email)')
      .order('created_at', { ascending: true })
    if (!error) setBooks(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  function handleBorrow(book) {
    showToast(`הבקשה נשלחה ל${book.Users?.name || 'הבעלים'}`)
    setActiveBook(null)
  }

  function openBook(book) {
    // book objects coming from tabs may lack the Users join (e.g. from ShelfTab's lent-out list) —
    // always resolve against the freshest fetched copy so BookDetail has full owner info.
    const full = books.find(b => b.id === book.id) || book
    setActiveBook(full)
  }

  const tabBtn = (key) => tab === key ? { bg: '#DCE9D3', color: '#3F6B41' } : { bg: 'transparent', color: '#8A8278' }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#F7F5F1' }}>

      {tab === 'home' && (
        <HomeTab books={books} loading={loading} currentUser={currentUser}
          onOpenBook={openBook} onOpenAdd={() => setShowAdd(true)}
          onOpenProfile={() => setShowProfile(true)} onShare={handleShare}
          onGoToActivity={() => setTab('activity')} />
      )}
      {tab === 'shelf' && (
        <ShelfTab currentUser={currentUser} books={books} loading={loading}
          onOpenBook={openBook} onOpenAdd={() => setShowAdd(true)} showToast={showToast} />
      )}
      {tab === 'members' && (
        <MembersTab currentUser={currentUser} books={books} onOpenBook={openBook} />
      )}
      {tab === 'activity' && (
        <ActivityTab currentUser={currentUser} onOpenBook={openBook} />
      )}

      {/* bottom tab bar */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: '#FFFFFF', borderTop: '1px solid #ECE7DE', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '10px 8px 22px' }}>
        <TabBtn onClick={() => setTab('home')} pal={tabBtn('home')} label="בית">
          <path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" />
        </TabBtn>
        <TabBtn onClick={() => setTab('shelf')} pal={tabBtn('shelf')} label="המדף שלי">
          <path d="M2 5.5C2 4.7 2.7 4 3.5 4H10a2 2 0 0 1 2 2v14.5C12 19.3 10.8 18 9 18H2z" />
          <path d="M22 5.5c0-.8-.7-1.5-1.5-1.5H14a2 2 0 0 0-2 2v14.5c0-1.2 1.2-2.5 3-2.5h7z" />
        </TabBtn>
        <TabBtn onClick={() => setTab('members')} pal={tabBtn('members')} label="חברים">
          <circle cx="9" cy="7" r="3" /><path d="M2 20c0-2.8 2.7-5 6-5" />
          <circle cx="17" cy="7" r="3" /><path d="M13 20c0-3 2.7-5 6-5s6 2 6 5" />
        </TabBtn>
        <TabBtn onClick={() => setTab('activity')} pal={tabBtn('activity')} label="פעילות">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </TabBtn>
      </div>

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
          onUserUpdate={u => { setCurrentUser(u); onUserUpdate?.(u) }}
          onLogout={handleLogout} />
      )}
      <Toast message={toast} />
    </div>
  )
}

function TabBtn({ onClick, pal, label, children }) {
  return (
    <button onClick={onClick} style={{
      border: 'none', background: pal.bg, cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      padding: '6px 10px', borderRadius: 14,
    }}>
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={pal.color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: pal.color }}>{label}</span>
    </button>
  )
}
