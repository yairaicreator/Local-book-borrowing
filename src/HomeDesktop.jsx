import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { STATUS, TOPIC_LABELS, avatarPalette, initial, isHebrewText } from './lib/utils'
import { translateToHebrew } from './lib/scanner'
import BookCover from './BookCover'
import HomeTabDesktop from './HomeTabDesktop'
import ShelfTabDesktop from './ShelfTabDesktop'
import MembersTabDesktop from './MembersTabDesktop'
import ActivityTabDesktop from './ActivityTabDesktop'
import AddBook from './AddBook'
import Profile from './Profile'
import Toast from './Toast'
import NotificationBell from './NotificationBell'

const SHARE_URL = 'https://local-book-borrowing.vercel.app/'

const TABS = [
  { key: 'home', label: 'בית', icon: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /></> },
  { key: 'shelf', label: 'המדף שלי', icon: <><path d="M2 5.5C2 4.7 2.7 4 3.5 4H10a2 2 0 0 1 2 2v14.5C12 19.3 10.8 18 9 18H2z" /><path d="M22 5.5c0-.8-.7-1.5-1.5-1.5H14a2 2 0 0 0-2 2v14.5c0-1.2 1.2-2.5 3-2.5h7z" /></> },
  { key: 'members', label: 'חברים', icon: <><circle cx="9" cy="7" r="3" /><path d="M2 20c0-2.8 2.7-5 6-5" /><circle cx="17" cy="7" r="3" /><path d="M13 20c0-3 2.7-5 6-5s6 2 6 5" /></> },
  { key: 'activity', label: 'פעילות', icon: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></> },
]

const TAB_TITLES = { home: 'הספרייה שלך', shelf: 'המדף שלי', members: 'חברים', activity: 'פעילות' }

export default function HomeDesktop({ currentUser: initialUser, onUserUpdate }) {
  const [currentUser, setCurrentUser] = useState(initialUser)
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('home')
  const [search, setSearch] = useState('')
  const [activeBook, setActiveBook] = useState(null)
  const [showBack, setShowBack] = useState(false)
  const [editBook, setEditBook] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showRecommend, setShowRecommend] = useState(false)
  const [recommendTarget, setRecommendTarget] = useState(null)
  const [recommendSent, setRecommendSent] = useState(false)
  const [friends, setFriends] = useState([])
  const [inReadingList, setInReadingList] = useState(false)
  const [queue, setQueue] = useState([])
  const [joining, setJoining] = useState(false)
  const [translated, setTranslated] = useState(null)
  const [translating, setTranslating] = useState(false)
  const [translateError, setTranslateError] = useState('')
  const [showTranslated, setShowTranslated] = useState(false)
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
    const { data } = await supabase.from('Books').select('*, Users(id, name, phone, email)').order('created_at')
    setBooks(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  useEffect(() => {
    supabase.from('Users').select('id, name, phone, email').neq('id', currentUser.id).order('name')
      .then(({ data }) => setFriends(data || []))
  }, [currentUser.id])

  useEffect(() => {
    if (!activeBook) return
    supabase.from('reading_list').select('id').eq('user_id', currentUser.id).eq('book_id', activeBook.id).maybeSingle()
      .then(({ data }) => setInReadingList(!!data))
  }, [activeBook, currentUser.id])

  const fetchQueue = useCallback(async () => {
    if (!activeBook) return
    const { data } = await supabase.from('borrows')
      .select('id, borrower_id, status, created_at, Users!borrower_id(name)')
      .eq('book_id', activeBook.id).order('created_at')
    setQueue(data || [])
  }, [activeBook])

  useEffect(() => { fetchQueue() }, [fetchQueue])

  function openBook(book) {
    const full = books.find(b => b.id === book.id) || book
    setActiveBook(full)
    setShowBack(false)
    setTranslated(null)
    setShowTranslated(false)
    setTranslateError('')
  }

  function closeBook() {
    setActiveBook(null)
    setShowContact(false)
    setShowRecommend(false)
    setRecommendTarget(null)
    setRecommendSent(false)
  }

  async function handleTranslate() {
    if (!activeBook) return
    if (translated) { setShowTranslated(v => !v); return }
    setTranslating(true)
    setTranslateError('')
    try {
      const result = await translateToHebrew(activeBook.description)
      setTranslated(result)
      setShowTranslated(true)
    } catch (err) {
      setTranslateError('לא הצלחנו לתרגם — נסה שנית.')
    } finally {
      setTranslating(false)
    }
  }

  async function handleBorrow(book) {
    await supabase.from('borrows').upsert(
      { book_id: book.id, borrower_id: currentUser.id, status: 'requested' },
      { onConflict: 'book_id,borrower_id' }
    )
    await supabase.from('Books').update({ status: 'borrowed' }).eq('id', book.id)
    await supabase.from('Notifications').insert({
      recipient_id: book.add_by,
      sender_id: currentUser.id,
      book_id: book.id,
      message: `${currentUser.name || 'מישהו'} ביקש לשאול את "${book.title}"`,
    })
    setBooks(prev => prev.map(b => b.id === book.id ? { ...b, status: 'borrowed' } : b))
    showToast(`הבקשה נשלחה לבעלים`)
    setActiveBook(null)
  }

  async function joinWaitlist(book) {
    setJoining(true)
    await supabase.from('borrows').upsert(
      { book_id: book.id, borrower_id: currentUser.id, status: 'waitlisted' },
      { onConflict: 'book_id,borrower_id' }
    )
    await supabase.from('Notifications').insert({
      recipient_id: book.add_by,
      sender_id: currentUser.id,
      book_id: book.id,
      message: `${currentUser.name || 'מישהו'} הצטרף/ה לרשימת ההמתנה עבור "${book.title}"`,
    })
    await fetchQueue()
    setJoining(false)
  }

  async function toggleReadingList() {
    if (!activeBook) return
    if (inReadingList) {
      await supabase.from('reading_list').delete().eq('user_id', currentUser.id).eq('book_id', activeBook.id)
      setInReadingList(false)
    } else {
      await supabase.from('reading_list').upsert(
        { user_id: currentUser.id, book_id: activeBook.id, is_read: false },
        { onConflict: 'user_id,book_id' }
      )
      setInReadingList(true)
    }
  }

  function formatWaPhone(raw) {
    const digits = (raw || '').replace(/\D/g, '')
    if (digits.startsWith('0') && digits.length === 10) return '972' + digits.slice(1)
    return digits
  }

  async function sendRecommend(friend, via) {
    if (!activeBook) return
    const msg = `היי ${friend.name}! חשבתי שתאהב/י את "${activeBook.title}" מאת ${activeBook.author} — תבדוק/י בספריית המשפחה שלנו! 📚`
    await supabase.from('Notifications').insert({
      recipient_id: friend.id,
      sender_id: currentUser.id,
      book_id: activeBook.id,
      message: `${currentUser.name || 'מישהו'} המליץ/ה לך על "${activeBook.title}"`,
    })
    if (via === 'whatsapp' && friend.phone) window.open(`https://wa.me/${formatWaPhone(friend.phone)}?text=${encodeURIComponent(msg)}`, '_blank')
    else if (via === 'sms' && friend.phone) window.open(`sms:${friend.phone}?body=${encodeURIComponent(msg)}`, '_blank')
    else if (via === 'email' && friend.email) window.open(`mailto:${friend.email}?subject=${encodeURIComponent('ספר שכדאי לך להכיר')}&body=${encodeURIComponent(msg)}`, '_blank')
    setRecommendSent(true)
    setTimeout(() => { setShowRecommend(false); setRecommendTarget(null); setRecommendSent(false) }, 1400)
  }

  // Build contact options + queue state for active book
  const ab = activeBook
  let contactOptions = []
  const isOwnActiveBook = ab && ab.add_by === currentUser.id
  const waitlistOnly = queue.filter(q => q.status === 'waitlisted')
  const activeRow = queue.find(q => q.status === 'requested' || q.status === 'borrowed')
  const myRow = ab ? queue.find(q => q.borrower_id === currentUser.id) : null
  const myWaitlistPos = myRow?.status === 'waitlisted' ? waitlistOnly.findIndex(q => q.id === myRow.id) + 1 : null
  const canRequest = ab && !isOwnActiveBook && ab.status === 'available' && !myRow
  const canJoinWaitlist = ab && !isOwnActiveBook && ab.status === 'borrowed' && !myRow
  const myStatusLabel = ab && !isOwnActiveBook && myRow
    ? (myRow.status === 'requested' ? 'הבקשה שלך ממתינה לאישור הבעלים'
      : myRow.status === 'borrowed' ? 'הספר אצלך כרגע'
      : `במקום ${myWaitlistPos} בתור`)
    : null

  if (ab && canRequest) {
    const ownerName = ab.Users?.name || 'the owner'
    const msg = `שלום ${ownerName}! אשמח לשאול את הספר "${ab.title}" ממדף הספרייה המשפחתית שלך. האם הספר זמין? 📚`
    const phone = ab.Users?.phone?.replace(/\D/g, '')
    const email = ab.Users?.email
    contactOptions.push({ key: 'inapp', icon: '🔔', label: 'הודעה בתוך האפליקציה', sub: 'הבעלים יקבל התראה ישירות', tint: 'rgba(192,90,62,.12)', go: () => handleBorrow(ab) })
    if (phone) {
      contactOptions.push({ key: 'wa', icon: '💬', label: 'WhatsApp', sub: ab.Users?.phone, tint: 'rgba(37,211,102,.12)', go: () => { window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank'); handleBorrow(ab) } })
      contactOptions.push({ key: 'sms', icon: '📱', label: 'SMS', sub: ab.Users?.phone, tint: 'rgba(90,127,224,.12)', go: () => { window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`, '_blank'); handleBorrow(ab) } })
    }
    if (email) contactOptions.push({ key: 'email', icon: '✉️', label: 'Email', sub: email, tint: 'rgba(180,90,60,.12)', go: () => { window.open(`mailto:${email}?subject=${encodeURIComponent(`Book borrow request: ${ab.title}`)}&body=${encodeURIComponent(msg)}`, '_blank'); handleBorrow(ab) } })
  }

  const s = ab ? (STATUS[ab.status] || STATUS.available) : null
  const ownerPal = ab ? avatarPalette(ab.add_by) : null
  let holderLabel = '', holderName = ''
  if (ab) {
    if (ab.status === 'unavailable') {
      holderLabel = 'נמצא אצל'; holderName = (ab.Users?.name || 'בעלים') + ' · לא להשאלה'
    } else if (activeRow) {
      holderLabel = activeRow.status === 'borrowed' ? 'מושאל כרגע על ידי' : 'מבוקש כרגע על ידי'
      holderName = activeRow.Users?.name || '—'
    } else {
      holderLabel = 'על המדף של'; holderName = ab.Users?.name || 'לא ידוע'
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#EDEAE5', fontFamily: "'Source Sans 3',sans-serif", color: '#2C2622', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 240, flexShrink: 0, background: '#F7F5F1', borderRight: '1px solid #E4DED3', display: 'flex', flexDirection: 'column', padding: '26px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30, padding: '0 4px' }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: '#C05A3E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 16px -6px rgba(180,90,60,.55)' }}>
            <span style={{ fontFamily: "'Lora',serif", fontWeight: 600, color: '#F7F5F1', fontSize: 23, lineHeight: 1 }}>F</span>
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#A39B90', fontWeight: 600, lineHeight: 1, marginBottom: 4 }}>Family</div>
            <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 19, color: '#2C2622', lineHeight: 1 }}>Library</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TABS.map(t => {
            const on = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                border: 'none', cursor: 'pointer', fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 15,
                textAlign: 'right', padding: '12px 14px', borderRadius: 12,
                background: on ? '#DCE9D3' : 'transparent', color: on ? '#3F6B41' : '#6E675C',
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={on ? '#3F6B41' : '#8A8278'} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
                {t.label}
              </button>
            )
          })}
        </div>

        <div style={{ flex: 1 }} />

        <button onClick={handleShare} style={{
          border: '1.5px solid #E7E1D6', cursor: 'pointer', fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 13.5,
          textAlign: 'right', padding: '10px 14px', borderRadius: 12, background: '#FFFFFF', color: '#6E675C',
          display: 'flex', alignItems: 'center', gap: 10, width: '100%', marginBottom: 12,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6E675C" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
          שתף קישור לאפליקציה
        </button>

        <div style={{ borderTop: '1px solid #E4DED3', paddingTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => setShowProfile(true)} style={{
            display: 'flex', alignItems: 'center', gap: 11, flex: 1, minWidth: 0,
            padding: '4px 8px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#E7C8A0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: '#7A4A28', flexShrink: 0 }}>{initial(currentUser.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2622', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.name}</div>
              <div style={{ fontSize: 12, color: '#A39B90' }}>הפרופיל שלך</div>
            </div>
          </button>
          <NotificationBell currentUser={currentUser} small />
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#FBFAF7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '24px 40px', borderBottom: '1px solid #ECE7DE', background: '#FBFAF7' }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 26, color: '#2C2622', lineHeight: 1.1 }}>{TAB_TITLES[tab]}</div>
            <div style={{ fontSize: 14, color: '#8A8278', marginTop: 3 }}>{books.length} {books.length === 1 ? 'ספר' : 'ספרים'} משותפים במעגל שלך</div>
          </div>
          {tab === 'home' && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, width: 380, maxWidth: '42%', background: '#FFFFFF', border: '1.5px solid #E7E1D6', borderRadius: 13, padding: '11px 16px', boxShadow: '0 2px 8px -5px rgba(60,48,30,.12)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A39B90" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש כותרות או מחברים" dir="rtl" style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: "'Source Sans 3',sans-serif", fontSize: 15, color: '#2C2622', width: '100%' }} />
            </div>
          )}
          <button onClick={() => setShowAdd(true)} style={{ flexShrink: 0, marginLeft: tab === 'home' ? 0 : 'auto', border: 'none', borderRadius: 13, padding: '13px 22px', fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 15, color: '#F7F5F1', background: '#C05A3E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, boxShadow: '0 10px 22px -10px rgba(180,90,60,.7)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F7F5F1" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>הוסף ספר
          </button>
        </div>

        <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 40px 60px' }}>
          {tab === 'home' && <HomeTabDesktop books={books} loading={loading} currentUser={currentUser} search={search} onOpenBook={openBook} />}
          {tab === 'shelf' && <ShelfTabDesktop currentUser={currentUser} books={books} loading={loading} onOpenBook={openBook} showToast={showToast} />}
          {tab === 'members' && <MembersTabDesktop currentUser={currentUser} books={books} onOpenBook={openBook} />}
          {tab === 'activity' && <ActivityTabDesktop currentUser={currentUser} onOpenBook={openBook} />}
        </div>
      </main>

      {/* ── Book Detail Modal ── */}
      {activeBook && (
        <div onClick={closeBook} style={{ position: 'fixed', inset: 0, background: 'rgba(40,30,18,.46)', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'flFade .2s ease', padding: 40 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: 760, maxWidth: '100%', maxHeight: '88vh', background: '#F7F5F1', borderRadius: 22, overflow: 'hidden', display: 'flex', boxShadow: '0 30px 70px -20px rgba(40,30,18,.55)', animation: 'flPop .26s cubic-bezier(.22,1,.36,1)' }}>
            <div style={{ width: 300, flexShrink: 0, background: '#F1ECE3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', borderRight: '1px solid #E7E1D6', gap: 12 }}>
              {showBack && activeBook.back_image_url
                ? <img src={activeBook.back_image_url} alt="back cover" style={{ width: 206, height: 293, objectFit: 'cover', borderRadius: 10, boxShadow: '0 4px 18px -6px rgba(40,30,18,.4)' }} />
                : <BookCover book={activeBook} width={206} height={293} fontSize={26} authorSize={11} />
              }
              {activeBook.back_image_url && (
                <button onClick={() => setShowBack(v => !v)} style={{ border: '1.5px solid #D8D1C4', background: '#F7F5F1', borderRadius: 20, padding: '5px 16px', fontSize: 13, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, color: '#7C756C', cursor: 'pointer' }}>
                  {showBack ? '← עטיפה קדמית' : 'עטיפה אחורית →'}
                </button>
              )}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '34px 34px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: s.color, background: s.bg, padding: '5px 12px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />{s.label}
                  </span>
                  {activeBook.topic && <span style={{ fontSize: 13, fontWeight: 600, color: '#8A6A3A', background: '#F3ECDD', padding: '5px 12px', borderRadius: 999 }}>{TOPIC_LABELS[activeBook.topic] || activeBook.topic}</span>}
                  {canRequest && (
                    <button onClick={() => setShowContact(true)} style={{ marginRight: 'auto', border: 'none', borderRadius: 999, padding: '6px 16px', background: '#C05A3E', color: '#F7F5F1', fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                      בקש להשאיל
                    </button>
                  )}
                  {canJoinWaitlist && (
                    <button onClick={() => joinWaitlist(activeBook)} disabled={joining} style={{ marginRight: 'auto', border: '1.5px solid #C05A3E', borderRadius: 999, padding: '6px 16px', background: '#FBF0EB', color: '#C05A3E', fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
                      {joining ? 'מצטרף/ת…' : 'הצטרף/י לרשימת המתנה'}
                    </button>
                  )}
                  {myStatusLabel && (
                    <span style={{ marginRight: 'auto', fontSize: 13, fontWeight: 600, color: '#8A6A3A', background: '#F3ECDD', padding: '6px 14px', borderRadius: 999 }}>{myStatusLabel}</span>
                  )}
                </div>
                <h2 style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 32, lineHeight: 1.14, color: '#2C2622', margin: '0 0 6px' }}>{activeBook.title}</h2>
                <div style={{ fontSize: 17, color: '#7C756C', marginBottom: 14 }}>מאת {activeBook.author}</div>

                {friends.length > 0 && (
                  <button onClick={() => { setShowRecommend(true); setRecommendTarget(null); setRecommendSent(false) }} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: '1.5px solid #E7E1D6', background: '#FFFFFF', borderRadius: 999, padding: '8px 14px', fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 13, color: '#6E675C', cursor: 'pointer', marginBottom: 18 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6E675C" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                    המלץ לחבר
                  </button>
                )}

                {activeBook.description && (
                  <div style={{ marginBottom: 22 }}>
                    <p style={{ fontSize: 16, lineHeight: 1.65, color: '#4A443D', margin: '0 0 8px', direction: showTranslated ? 'rtl' : 'ltr', textAlign: showTranslated ? 'right' : 'left' }}>
                      {showTranslated && translated ? translated : activeBook.description}
                    </p>
                    {!isHebrewText(activeBook.description) && (
                      <button onClick={handleTranslate} disabled={translating} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 13, color: '#C05A3E', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C05A3E" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" /></svg>
                        {translating ? 'מתרגם…' : translated ? (showTranslated ? 'הצג במקור' : 'הצג תרגום') : 'תרגם לעברית'}
                      </button>
                    )}
                    {translateError && <div style={{ fontSize: 12, color: '#B24A3A', marginTop: 4 }}>{translateError}</div>}
                  </div>
                )}

                {activeBook.owner_review && (
                  <div style={{ marginBottom: 22 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#A39B90', marginBottom: 6 }}>חוות דעת הבעלים</div>
                    <p style={{ fontSize: 15, lineHeight: 1.6, color: '#4A443D', margin: 0, fontStyle: 'italic' }}>{activeBook.owner_review}</p>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FFFFFF', border: '1.5px solid #ECE7DE', borderRadius: 14, padding: '14px 16px', marginBottom: 18 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: ownerPal.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: ownerPal.color, flexShrink: 0 }}>{initial(activeBook.Users?.name)}</div>
                  <div>
                    <div style={{ fontSize: 12, color: '#A39B90' }}>{holderLabel}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#2C2622' }}>{holderName}</div>
                  </div>
                </div>

                {!isOwnActiveBook && (
                  <button onClick={toggleReadingList} style={{
                    width: '100%', border: `1.5px solid ${inReadingList ? '#C05A3E' : '#E7E1D6'}`,
                    background: inReadingList ? '#FBF0EB' : '#FFFFFF',
                    borderRadius: 13, padding: '13px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    cursor: 'pointer', fontFamily: "'Source Sans 3',sans-serif",
                    fontWeight: 600, fontSize: 14.5,
                    color: inReadingList ? '#C05A3E' : '#6E675C',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={inReadingList ? '#C05A3E' : '#A39B90'} strokeWidth="2.2" strokeLinecap="round">
                      {inReadingList ? <path d="M5 13l4 4L19 7" /> : <path d="M12 5v14M5 12h14" />}
                    </svg>
                    {inReadingList ? 'נשמר לרשימת הקריאה' : 'הוסף לרשימת הקריאה'}
                  </button>
                )}

                {isOwnActiveBook && queue.length > 0 && (
                  <div style={{ marginTop: 22 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#A39B90', marginBottom: 10 }}>רשימת המתנה</div>
                    {queue.map((q, i) => {
                      const pal = avatarPalette(q.borrower_id)
                      const label = q.status === 'borrowed' ? 'מחזיק/ה כרגע'
                        : q.status === 'requested' ? 'ממתין/ה לאישורך'
                        : `מקום ${waitlistOnly.findIndex(w => w.id === q.id) + 1} בתור`
                      return (
                        <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0', borderBottom: i < queue.length - 1 ? '1px solid #ECE7DE' : 'none' }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: pal.bg, color: pal.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flex: 'none' }}>
                            {initial(q.Users?.name)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 14, color: '#2C2622' }}>{q.Users?.name}</div>
                          <div style={{ fontSize: 12.5, color: '#8A6A3A', fontWeight: 600, flex: 'none' }}>{label}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              {isOwnActiveBook && (
                <div style={{ padding: '18px 34px 22px', borderTop: '1px solid #ECE7DE', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, fontSize: 13, color: '#A39B90' }}>הוספת ספר זה — אחרים יכולים לשאול אותו ממך.</div>
                  <button onClick={() => { setEditBook(activeBook); closeBook() }} style={{ flexShrink: 0, border: '1.5px solid #E7E1D6', background: '#F7F5F1', borderRadius: 12, padding: '7px 16px', fontSize: 14, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, color: '#6E675C', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    ערוך
                  </button>
                </div>
              )}
            </div>
            <button onClick={closeBook} style={{ position: 'absolute', right: 18, top: 18, width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.85)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px -3px rgba(40,30,18,.3)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6E675C" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>

          {/* contact popover */}
          {showContact && (
            <div onClick={() => setShowContact(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(40,30,18,.4)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'flFade .15s ease' }}>
              <div onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: '90%', background: '#F7F5F1', borderRadius: 20, padding: 28, animation: 'flPop .24s cubic-bezier(.22,1,.36,1)', boxShadow: '0 24px 56px -18px rgba(40,30,18,.55)' }}>
                <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 21, color: '#2C2622', marginBottom: 6 }}>צור קשר עם {activeBook.Users?.name || 'הבעלים'}</div>
                <div style={{ fontSize: 14, color: '#7C756C', marginBottom: 22 }}>בחר כיצד לשלוח את בקשת ההשאלה:</div>
                {contactOptions.map(opt => (
                  <button key={opt.key} onClick={opt.go} style={{ width: '100%', border: '1.5px solid #ECE7DE', background: '#FFFFFF', borderRadius: 14, padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: opt.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, flexShrink: 0 }}>{opt.icon}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, color: '#2C2622' }}>{opt.label}</div>
                      <div style={{ fontSize: 13, color: '#A39B90', marginTop: 1 }}>{opt.sub}</div>
                    </div>
                    <svg style={{ marginLeft: 'auto' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CFC8BB" strokeWidth="2.2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                  </button>
                ))}
                {contactOptions.length === 0 && <div style={{ fontSize: 14, color: '#A39B90', fontStyle: 'italic', marginBottom: 14 }}>{activeBook.Users?.name || 'הבעלים'} לא הוסיף פרטי קשר עדיין.</div>}
                <button onClick={() => setShowContact(false)} style={{ marginTop: 8, width: '100%', border: '1.5px solid #E7E1D6', background: 'transparent', borderRadius: 14, padding: 13, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 15, color: '#6E675C', cursor: 'pointer' }}>ביטול</button>
              </div>
            </div>
          )}

          {/* recommend popover */}
          {showRecommend && (
            <div onClick={() => { setShowRecommend(false); setRecommendTarget(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(40,30,18,.4)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'flFade .15s ease' }}>
              <div onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: '90%', background: '#F7F5F1', borderRadius: 20, padding: 28, animation: 'flPop .24s cubic-bezier(.22,1,.36,1)', boxShadow: '0 24px 56px -18px rgba(40,30,18,.55)' }}>
                {recommendSent ? (
                  <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>💌</div>
                    <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 20, color: '#2C2622', marginBottom: 6 }}>ההמלצה נשלחה!</div>
                    <div style={{ fontSize: 14, color: '#7C756C' }}>{recommendTarget?.name} יראה/תראה את ההמלצה שלך.</div>
                  </div>
                ) : recommendTarget ? (
                  <>
                    <button onClick={() => setRecommendTarget(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', padding: 0, marginBottom: 12, cursor: 'pointer', fontFamily: "'Source Sans 3',sans-serif", fontSize: 13, fontWeight: 600, color: '#A39B90' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A39B90" strokeWidth="2.4" strokeLinecap="round"><path d="M15 5l-7 7 7 7" /></svg>
                      חזרה
                    </button>
                    <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 21, color: '#2C2622', marginBottom: 6 }}>שליחה אל {recommendTarget.name}</div>
                    <div style={{ fontSize: 14, color: '#7C756C', marginBottom: 22 }}>המלצה על "{activeBook.title}" עבור {recommendTarget.name}:</div>
                    <RecommendBtn icon="🔔" label="הודעה בתוך האפליקציה" sub="יראה/תראה את ההמלצה שלך" onClick={() => sendRecommend(recommendTarget, 'inapp')} color="#C05A3E" />
                    {recommendTarget.phone ? (<>
                      <RecommendBtn icon="💬" label="WhatsApp" sub={recommendTarget.phone} onClick={() => sendRecommend(recommendTarget, 'whatsapp')} color="#25D366" />
                      <RecommendBtn icon="📱" label="SMS" sub={recommendTarget.phone} onClick={() => sendRecommend(recommendTarget, 'sms')} color="#5A7FE0" />
                    </>) : null}
                    {recommendTarget.email ? (
                      <RecommendBtn icon="✉️" label="אימייל" sub={recommendTarget.email} onClick={() => sendRecommend(recommendTarget, 'email')} color="#C05A3E" />
                    ) : null}
                  </>
                ) : (
                  <>
                    <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 21, color: '#2C2622', marginBottom: 6 }}>המלץ לחבר</div>
                    <div style={{ fontSize: 14, color: '#7C756C', marginBottom: 22 }}>למי כדאי לספר על "{activeBook.title}"?</div>
                    {friends.map(f => (
                      <button key={f.id} onClick={() => setRecommendTarget(f)} style={{ width: '100%', border: '1.5px solid #ECE7DE', background: '#FFFFFF', borderRadius: 14, padding: '12px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarPalette(f.id).bg, color: avatarPalette(f.id).color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flex: 'none' }}>{initial(f.name)}</div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: '#2C2622' }}>{f.name}</div>
                        <svg style={{ marginLeft: 'auto' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CFC8BB" strokeWidth="2.2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                      </button>
                    ))}
                  </>
                )}
                <button onClick={() => { setShowRecommend(false); setRecommendTarget(null) }} style={{ marginTop: 8, width: '100%', border: '1.5px solid #E7E1D6', background: 'transparent', borderRadius: 14, padding: 13, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 15, color: '#6E675C', cursor: 'pointer' }}>ביטול</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Add Book Modal ── */}
      {showAdd && (
        <AddBook currentUser={currentUser} desktop onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); showToast('הספר נוסף למדף'); fetchBooks() }} />
      )}

      {/* ── Edit Book Modal ── */}
      {editBook && (
        <AddBook currentUser={currentUser} desktop bookToEdit={editBook} onClose={() => setEditBook(null)} onSaved={() => { setEditBook(null); showToast('הספר עודכן בהצלחה'); fetchBooks() }} />
      )}

      {/* ── Profile overlay ── */}
      {showProfile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <Profile currentUser={currentUser} onClose={() => setShowProfile(false)}
            onUserUpdate={u => { setCurrentUser(u); onUserUpdate?.(u) }}
            onLogout={handleLogout} />
        </div>
      )}

      <Toast message={toast} />
    </div>
  )
}

function RecommendBtn({ icon, label, sub, onClick, color }) {
  return (
    <button onClick={onClick} style={{ width: '100%', border: '1.5px solid #ECE7DE', background: '#FFFFFF', borderRadius: 14, padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left' }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flex: 'none' }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, color: '#2C2622' }}>{label}</div>
        <div style={{ fontSize: 13, color: '#A39B90', marginTop: 1 }}>{sub}</div>
      </div>
      <svg style={{ marginLeft: 'auto' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CFC8BB" strokeWidth="2.2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
    </button>
  )
}
