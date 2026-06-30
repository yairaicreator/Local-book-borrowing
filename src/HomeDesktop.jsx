import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { STATUS, avatarPalette, initial } from './lib/utils'
import BookCover from './BookCover'
import AddBook from './AddBook'
import Profile from './Profile'
import Toast from './Toast'

export default function HomeDesktop({ currentUser }) {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('user')
  const [activeBook, setActiveBook] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [toast, setToast] = useState('')
  const toastRef = { current: null }

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(''), 1900)
  }, [])

  const fetchBooks = useCallback(async () => {
    const { data } = await supabase.from('Books').select('*, Users(id, name, phone, email)').order('created_at')
    setBooks(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  const q = search.trim().toLowerCase()
  const filtered = books.filter(b => !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))

  let groups = [], shelfNav = []
  if (filter === 'user') {
    const byUser = {}
    books.forEach(b => {
      const uid = b.add_by
      if (!byUser[uid]) byUser[uid] = { name: b.Users?.name || 'Unknown', books: [], allCount: 0 }
      byUser[uid].allCount++
    })
    filtered.forEach(b => { const uid = b.add_by; if (byUser[uid]) byUser[uid].books.push(b) })
    Object.entries(byUser).forEach(([uid, g]) => {
      const pal = avatarPalette(uid)
      shelfNav.push({ key: uid, name: g.name, count: g.allCount, label: initial(g.name), bg: pal.bg, color: pal.color, radius: '50%' })
      if (g.books.length) groups.push({ key: uid, title: g.name, count: g.books.length, avatarLabel: initial(g.name), avatarBg: pal.bg, avatarColor: pal.color, avatarRadius: '50%', books: g.books })
    })
  } else {
    const byTopic = {}
    books.forEach(b => { const t = b.topic || 'Other'; if (!byTopic[t]) byTopic[t] = { all: 0, books: [] }; byTopic[t].all++ })
    filtered.forEach(b => { const t = b.topic || 'Other'; if (byTopic[t]) byTopic[t].books.push(b) })
    Object.keys(byTopic).sort().forEach(t => {
      shelfNav.push({ key: t, name: t, count: byTopic[t].all, label: t[0], bg: '#F1ECE3', color: '#8A6A3A', radius: '9px' })
      if (byTopic[t].books.length) groups.push({ key: t, title: t, count: byTopic[t].books.length, avatarLabel: t[0], avatarBg: '#F1ECE3', avatarColor: '#8A6A3A', avatarRadius: '9px', books: byTopic[t].books })
    })
  }

  const emptyShelf = groups.length === 0 && !q && !loading
  const noMatch = groups.length === 0 && !!q

  const navOn = (on) => on ? { bg: '#F1E7E2', color: '#C05A3E' } : { bg: 'transparent', color: '#6E675C' }
  const nu = navOn(filter === 'user'), nt = navOn(filter === 'topic')

  function handleBorrow(book) {
    showToast(`Request sent to ${book.Users?.name || 'the owner'}`)
    setActiveBook(null)
  }

  // Build contact options for active book
  const ab = activeBook
  let borrowDisabled = true, borrowLabel = 'בקש להשאיל', borrowBg = '#E9E3D8', borrowInk = '#A39B90', borrowCursor = 'not-allowed'
  let contactOptions = []
  if (ab) {
    const isAvail = ab.status === 'available'
    const isOwnBook = ab.add_by === currentUser.id
    if (isOwnBook) {
      borrowDisabled = true; borrowLabel = 'זה הספר שלך'; borrowBg = '#F0ECE4'; borrowInk = '#A39B90'; borrowCursor = 'not-allowed'
    } else if (!isAvail) {
      borrowDisabled = true
      borrowLabel = ab.status === 'borrowed' ? 'מושאל כרגע' : 'לא זמין'
    } else {
      borrowDisabled = false; borrowLabel = 'בקש להשאיל'; borrowBg = '#C05A3E'; borrowInk = '#F7F5F1'; borrowCursor = 'pointer'
    }
    const ownerName = ab.Users?.name || 'the owner'
    const msg = `שלום ${ownerName}! אשמח לשאול את הספר "${ab.title}" ממדף הספרייה המשפחתית שלך. האם הספר זמין? 📚`
    const phone = ab.Users?.phone?.replace(/\D/g, '')
    const email = ab.Users?.email
    if (phone) {
      contactOptions.push({ key: 'wa', icon: '💬', label: 'WhatsApp', sub: ab.Users?.phone, tint: 'rgba(37,211,102,.12)', go: () => { window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank'); handleBorrow(ab) } })
      contactOptions.push({ key: 'sms', icon: '📱', label: 'SMS', sub: ab.Users?.phone, tint: 'rgba(90,127,224,.12)', go: () => { window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`, '_blank'); handleBorrow(ab) } })
    }
    if (email) contactOptions.push({ key: 'email', icon: '✉️', label: 'Email', sub: email, tint: 'rgba(180,90,60,.12)', go: () => { window.open(`mailto:${email}?subject=${encodeURIComponent(`Book borrow request: ${ab.title}`)}&body=${encodeURIComponent(msg)}`, '_blank'); handleBorrow(ab) } })
  }

  const s = ab ? (STATUS[ab.status] || STATUS.available) : null
  const ownerPal = ab ? avatarPalette(ab.add_by) : null
  const holderLabel = !ab ? '' : ab.status === 'borrowed' ? 'מושאל כרגע על ידי' : ab.status === 'unavailable' ? 'נמצא אצל' : 'על המדף של'
  const holderName = !ab ? '' : ab.status === 'borrowed' ? (ab.borrowed_by_name || '—') : ab.status === 'unavailable' ? (ab.Users?.name || 'בעלים') + ' · לא להשאלה' : (ab.Users?.name || 'לא ידוע')

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#EDEAE5', fontFamily: "'Source Sans 3',sans-serif", color: '#2C2622', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 264, flexShrink: 0, background: '#F7F5F1', borderRight: '1px solid #E4DED3', display: 'flex', flexDirection: 'column', padding: '26px 20px' }}>
        {/* logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 34, padding: '0 4px' }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: '#C05A3E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 16px -6px rgba(180,90,60,.55)' }}>
            <span style={{ fontFamily: "'Lora',serif", fontWeight: 600, color: '#F7F5F1', fontSize: 23, lineHeight: 1 }}>F</span>
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#A39B90', fontWeight: 600, lineHeight: 1, marginBottom: 4 }}>Family</div>
            <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 19, color: '#2C2622', lineHeight: 1 }}>Library</div>
          </div>
        </div>

        {/* nav */}
        <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: '#B4ABA0', fontWeight: 600, padding: '0 8px 8px' }}>עיון</div>
        <NavBtn onClick={() => setFilter('user')} active={filter === 'user'} icon={
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={nu.color} strokeWidth="2.1" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" /></svg>
        } bg={nu.bg} color={nu.color} mb={4}>לפי אדם</NavBtn>
        <NavBtn onClick={() => setFilter('topic')} active={filter === 'topic'} icon={
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={nt.color} strokeWidth="2.1" strokeLinecap="round"><path d="M4 5h16M4 12h16M4 19h10" /></svg>
        } bg={nt.bg} color={nt.color}>לפי נושא</NavBtn>

        {/* shelves */}
        <div style={{ marginTop: 26, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: '#B4ABA0', fontWeight: 600, padding: '0 8px 10px' }}>מדפים</div>
        <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', margin: '0 -6px', padding: '0 6px' }}>
          {shelfNav.map(s => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 8px', borderRadius: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: s.radius, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: s.color, flexShrink: 0 }}>{s.label}</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#4A443D', flex: 1 }}>{s.name}</div>
              <div style={{ fontSize: 13, color: '#B4ABA0', fontWeight: 600 }}>{s.count}</div>
            </div>
          ))}
        </div>

        {/* user footer */}
        <button onClick={() => setShowProfile(true)} style={{
          display: 'flex', alignItems: 'center', gap: 11,
          padding: '12px 8px 2px', marginTop: 14,
          borderTop: '1px solid #E4DED3', border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
        }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#E7C8A0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: '#7A4A28', flexShrink: 0 }}>{initial(currentUser.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2622', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.name}</div>
            <div style={{ fontSize: 12, color: '#A39B90' }}>המדף שלך</div>
          </div>
        </button>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#FBFAF7' }}>
        {/* top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '24px 40px', borderBottom: '1px solid #ECE7DE', background: '#FBFAF7' }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 26, color: '#2C2622', lineHeight: 1.1 }}>{filter === 'user' ? 'עיון לפי אדם' : 'עיון לפי נושא'}</div>
            <div style={{ fontSize: 14, color: '#8A8278', marginTop: 3 }}>{books.length} {books.length === 1 ? 'ספר' : 'ספרים'} משותפים במעגל שלך</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, width: 380, maxWidth: '42%', background: '#FFFFFF', border: '1.5px solid #E7E1D6', borderRadius: 13, padding: '11px 16px', boxShadow: '0 2px 8px -5px rgba(60,48,30,.12)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A39B90" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש כותרות או מחברים" dir="rtl" style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: "'Source Sans 3',sans-serif", fontSize: 15, color: '#2C2622', width: '100%' }} />
          </div>
          <button onClick={() => setShowAdd(true)} style={{ flexShrink: 0, border: 'none', borderRadius: 13, padding: '13px 22px', fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 15, color: '#F7F5F1', background: '#C05A3E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, boxShadow: '0 10px 22px -10px rgba(180,90,60,.7)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F7F5F1" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>הוסף ספר
          </button>
        </div>

        {/* book grid */}
        <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 40px 60px' }}>
          {loading && <div style={{ textAlign: 'center', padding: '80px 0', color: '#A39B90' }}>טוען…</div>}

          {!loading && groups.map(group => (
            <div key={group.key} style={{ marginTop: 30 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <div style={{ width: 34, height: 34, borderRadius: group.avatarRadius, background: group.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: group.avatarColor, flexShrink: 0 }}>{group.avatarLabel}</div>
                <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 20, color: '#2C2622' }}>{group.title}</div>
                <div style={{ fontSize: 13, color: '#A39B90', fontWeight: 600, background: '#F1ECE3', padding: '3px 10px', borderRadius: 999 }}>{group.count}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(168px,1fr))', gap: '26px 22px' }}>
                {group.books.map(book => {
                  const bs = STATUS[book.status] || STATUS.available
                  return (
                    <div key={book.id} onClick={() => setActiveBook(book)} style={{ cursor: 'pointer' }}>
                      <div style={{ position: 'relative', width: '100%', aspectRatio: '128/182', borderRadius: 11, overflow: 'hidden', boxShadow: '0 10px 22px -10px rgba(60,48,30,.42)', transition: 'transform .18s, box-shadow .18s' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 18px 32px -12px rgba(60,48,30,.5)' }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 10px 22px -10px rgba(60,48,30,.42)' }}>
                        <BookCover book={book} width="100%" height="100%" fontSize={18} authorSize={10} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 11 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: bs.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: bs.color }}>{bs.label}</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2622', marginTop: 3, lineHeight: 1.25 }}>{book.title}</div>
                      <div style={{ fontSize: 13, color: '#7C756C', lineHeight: 1.3 }}>{book.author}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {emptyShelf && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '110px 40px 0' }}>
              <div style={{ width: 104, height: 104, borderRadius: 30, background: '#F1ECE3', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 26, boxShadow: 'inset 0 2px 6px rgba(120,95,60,.08)' }}>
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#C05A3E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
              </div>
              <h2 style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 26, color: '#2C2622', margin: '0 0 9px' }}>Your shelf is empty</h2>
              <p style={{ fontSize: 16, lineHeight: 1.55, color: '#7C756C', margin: '0 0 28px', maxWidth: 340 }}>Add the first book and start sharing reads with your family and friends.</p>
              <button onClick={() => setShowAdd(true)} style={{ border: 'none', borderRadius: 13, padding: '14px 28px', fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 16, color: '#F7F5F1', background: '#C05A3E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, boxShadow: '0 12px 24px -10px rgba(180,90,60,.6)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F7F5F1" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>הוסף ספר
              </button>
            </div>
          )}
          {noMatch && <div style={{ textAlign: 'center', padding: '110px 30px', color: '#A39B90', fontSize: 16 }}>No books match "{search}".</div>}
        </div>
      </main>

      {/* ── Book Detail Modal ── */}
      {activeBook && (
        <div onClick={() => { setActiveBook(null); setShowContact(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(40,30,18,.46)', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'flFade .2s ease', padding: 40 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: 760, maxWidth: '100%', maxHeight: '88vh', background: '#F7F5F1', borderRadius: 22, overflow: 'hidden', display: 'flex', boxShadow: '0 30px 70px -20px rgba(40,30,18,.55)', animation: 'flPop .26s cubic-bezier(.22,1,.36,1)' }}>
            {/* left: cover */}
            <div style={{ width: 300, flexShrink: 0, background: '#F1ECE3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', borderRight: '1px solid #E7E1D6' }}>
              <BookCover book={activeBook} width={206} height={293} fontSize={26} authorSize={11} />
            </div>
            {/* right: info */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '34px 34px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: s.color, background: s.bg, padding: '5px 12px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />{s.label}
                  </span>
                  {activeBook.topic && <span style={{ fontSize: 13, fontWeight: 600, color: '#8A6A3A', background: '#F3ECDD', padding: '5px 12px', borderRadius: 999 }}>{activeBook.topic}</span>}
                </div>
                <h2 style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 32, lineHeight: 1.14, color: '#2C2622', margin: '0 0 6px' }}>{activeBook.title}</h2>
                <div style={{ fontSize: 17, color: '#7C756C', marginBottom: 20 }}>by {activeBook.author}</div>
                {activeBook.description && <p style={{ fontSize: 16, lineHeight: 1.65, color: '#4A443D', margin: '0 0 22px' }}>{activeBook.description}</p>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FFFFFF', border: '1.5px solid #ECE7DE', borderRadius: 14, padding: '14px 16px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: ownerPal.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: ownerPal.color, flexShrink: 0 }}>{initial(activeBook.Users?.name)}</div>
                  <div>
                    <div style={{ fontSize: 12, color: '#A39B90' }}>{holderLabel}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#2C2622' }}>{holderName}</div>
                  </div>
                </div>
              </div>
              <div style={{ padding: '18px 34px 26px', borderTop: '1px solid #ECE7DE' }}>
                {activeBook.add_by === currentUser.id && <div style={{ fontSize: 13, color: '#A39B90', textAlign: 'center', marginBottom: 10 }}>הוספת ספר זה — אחרים יכולים לשאול אותו ממך.</div>}
                <button onClick={() => { if (!borrowDisabled) setShowContact(true) }} disabled={borrowDisabled} style={{ width: '100%', border: 'none', borderRadius: 14, padding: 16, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 16, color: borrowInk, background: borrowBg, cursor: borrowCursor }}>
                  {borrowLabel}
                </button>
              </div>
            </div>
            <button onClick={() => { setActiveBook(null); setShowContact(false) }} style={{ position: 'absolute', right: 18, top: 18, width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.85)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px -3px rgba(40,30,18,.3)' }}>
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
        </div>
      )}

      {/* ── Add Book Modal ── */}
      {showAdd && (
        <AddBook currentUser={currentUser} desktop onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); showToast('Book saved to your shelf'); fetchBooks() }} />
      )}

      {/* ── Profile overlay ── */}
      {showProfile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <Profile currentUser={currentUser} onClose={() => setShowProfile(false)} />
        </div>
      )}

      <Toast message={toast} />
    </div>
  )
}

function NavBtn({ onClick, icon, bg, color, mb = 0, children }) {
  return (
    <button onClick={onClick} style={{ border: 'none', cursor: 'pointer', fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 15, textAlign: 'left', padding: '12px 14px', borderRadius: 12, background: bg, color, display: 'flex', alignItems: 'center', gap: 12, marginBottom: mb, width: '100%' }}>
      {icon}{children}
    </button>
  )
}
