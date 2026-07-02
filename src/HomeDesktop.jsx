import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { STATUS, TOPIC_LABELS, avatarPalette, initial } from './lib/utils'
import BookCover from './BookCover'
import BookBoard from './BookBoard'
import AddBook from './AddBook'
import Profile from './Profile'
import Toast from './Toast'
import NotificationBell from './NotificationBell'

export default function HomeDesktop({ currentUser }) {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeBook, setActiveBook] = useState(null)
  const [showBack, setShowBack] = useState(false)
  const [editBook, setEditBook] = useState(null)
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

  const shelfNav = []
  {
    const byUser = {}
    books.forEach(b => {
      const uid = b.add_by
      if (!byUser[uid]) byUser[uid] = { name: b.Users?.name || 'Unknown', allCount: 0 }
      byUser[uid].allCount++
    })
    Object.entries(byUser).forEach(([uid, g]) => {
      const pal = avatarPalette(uid)
      shelfNav.push({ key: uid, name: g.name, count: g.allCount, label: initial(g.name), bg: pal.bg, color: pal.color, radius: '50%' })
    })
  }

  const emptyShelf = books.length === 0 && !q && !loading
  const noMatch = filtered.length === 0 && !!q

  async function handleBorrow(book) {
    await supabase.from('Notifications').insert({
      recipient_id: book.add_by,
      sender_id: currentUser.id,
      book_id: book.id,
      message: `${currentUser.name || 'מישהו'} ביקש לשאול את "${book.title}"`,
    })
    showToast(`הבקשה נשלחה לבעלים`)
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
        <div style={{ borderTop: '1px solid #E4DED3', marginTop: 14, paddingTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => setShowProfile(true)} style={{
            display: 'flex', alignItems: 'center', gap: 11, flex: 1, minWidth: 0,
            padding: '4px 8px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#E7C8A0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: '#7A4A28', flexShrink: 0 }}>{initial(currentUser.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2622', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.name}</div>
              <div style={{ fontSize: 12, color: '#A39B90' }}>המדף שלך</div>
            </div>
          </button>
          <NotificationBell currentUser={currentUser} small />
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#FBFAF7' }}>
        {/* top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '24px 40px', borderBottom: '1px solid #ECE7DE', background: '#FBFAF7' }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 26, color: '#2C2622', lineHeight: 1.1 }}>הספרייה שלך</div>
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

        {/* book board */}
        <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 40px 60px' }}>
          {loading && <div style={{ textAlign: 'center', padding: '80px 0', color: '#A39B90' }}>טוען…</div>}

          {!loading && filtered.length > 0 && (
            <BookBoard books={filtered} onBookClick={b => { setActiveBook(b); setShowBack(false) }} columnWidth={260} />
          )}

          {emptyShelf && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '110px 40px 0' }}>
              <div style={{ width: 104, height: 104, borderRadius: 30, background: '#F1ECE3', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 26, boxShadow: 'inset 0 2px 6px rgba(120,95,60,.08)' }}>
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#C05A3E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
              </div>
              <h2 style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 26, color: '#2C2622', margin: '0 0 9px' }}>המדף שלך ריק</h2>
              <p style={{ fontSize: 16, lineHeight: 1.55, color: '#7C756C', margin: '0 0 28px', maxWidth: 340 }}>הוסף את הספר הראשון והתחל לשתף קריאה עם המשפחה והחברים.</p>
              <button onClick={() => setShowAdd(true)} style={{ border: 'none', borderRadius: 13, padding: '14px 28px', fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 16, color: '#F7F5F1', background: '#C05A3E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, boxShadow: '0 12px 24px -10px rgba(180,90,60,.6)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F7F5F1" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>הוסף ספר
              </button>
            </div>
          )}
          {noMatch && <div style={{ textAlign: 'center', padding: '110px 30px', color: '#A39B90', fontSize: 16 }}>לא נמצאו ספרים התואמים ל"{search}".</div>}
        </div>
      </main>

      {/* ── Book Detail Modal ── */}
      {activeBook && (
        <div onClick={() => { setActiveBook(null); setShowContact(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(40,30,18,.46)', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'flFade .2s ease', padding: 40 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: 760, maxWidth: '100%', maxHeight: '88vh', background: '#F7F5F1', borderRadius: 22, overflow: 'hidden', display: 'flex', boxShadow: '0 30px 70px -20px rgba(40,30,18,.55)', animation: 'flPop .26s cubic-bezier(.22,1,.36,1)' }}>
            {/* left: cover */}
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
            {/* right: info */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '34px 34px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: s.color, background: s.bg, padding: '5px 12px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />{s.label}
                  </span>
                  {activeBook.topic && <span style={{ fontSize: 13, fontWeight: 600, color: '#8A6A3A', background: '#F3ECDD', padding: '5px 12px', borderRadius: 999 }}>{TOPIC_LABELS[activeBook.topic] || activeBook.topic}</span>}
                  {!borrowDisabled && (
                    <button onClick={() => setShowContact(true)} style={{ marginRight: 'auto', border: 'none', borderRadius: 999, padding: '6px 16px', background: '#C05A3E', color: '#F7F5F1', fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                      בקש להשאיל
                    </button>
                  )}
                </div>
                <h2 style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 32, lineHeight: 1.14, color: '#2C2622', margin: '0 0 6px' }}>{activeBook.title}</h2>
                <div style={{ fontSize: 17, color: '#7C756C', marginBottom: 20 }}>מאת {activeBook.author}</div>
                {activeBook.description && <p style={{ fontSize: 16, lineHeight: 1.65, color: '#4A443D', margin: '0 0 22px' }}>{activeBook.description}</p>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FFFFFF', border: '1.5px solid #ECE7DE', borderRadius: 14, padding: '14px 16px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: ownerPal.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: ownerPal.color, flexShrink: 0 }}>{initial(activeBook.Users?.name)}</div>
                  <div>
                    <div style={{ fontSize: 12, color: '#A39B90' }}>{holderLabel}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#2C2622' }}>{holderName}</div>
                  </div>
                </div>
              </div>
              {activeBook.add_by === currentUser.id && (
                <div style={{ padding: '18px 34px 22px', borderTop: '1px solid #ECE7DE', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, fontSize: 13, color: '#A39B90' }}>הוספת ספר זה — אחרים יכולים לשאול אותו ממך.</div>
                  <button onClick={() => { setEditBook(activeBook); setActiveBook(null); setShowContact(false) }} style={{ flexShrink: 0, border: '1.5px solid #E7E1D6', background: '#F7F5F1', borderRadius: 12, padding: '7px 16px', fontSize: 14, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, color: '#6E675C', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    ערוך
                  </button>
                </div>
              )}
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
        <AddBook currentUser={currentUser} desktop onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); showToast('הספר נוסף למדף'); fetchBooks() }} />
      )}

      {/* ── Edit Book Modal ── */}
      {editBook && (
        <AddBook currentUser={currentUser} desktop bookToEdit={editBook} onClose={() => setEditBook(null)} onSaved={() => { setEditBook(null); showToast('הספר עודכן בהצלחה'); fetchBooks() }} />
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
