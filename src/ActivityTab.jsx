import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import AddToReadingList from './AddToReadingList'

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (diff < 60) return 'עכשיו'
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דקות`
  if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שעות`
  return `לפני ${Math.floor(diff / 86400)} ימים`
}

export default function ActivityTab({ currentUser, onOpenBook }) {
  const [incoming, setIncoming] = useState([])
  const [borrows, setBorrows] = useState([])
  const [readingList, setReadingList] = useState([])
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddRL, setShowAddRL] = useState(false)
  const [removingBorrow, setRemovingBorrow] = useState(null)
  const [busyIncoming, setBusyIncoming] = useState(null)
  const [returningBorrow, setReturningBorrow] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [incomingRes, borrowsRes, rlRes, recentRes] = await Promise.all([
      supabase.from('borrows').select('*, Books!inner(id, title, author, add_by), Users!borrower_id(name)').eq('Books.add_by', currentUser.id).eq('status', 'requested').order('created_at', { ascending: false }),
      supabase.from('borrows').select('*, Books(*, Users(name))').eq('borrower_id', currentUser.id).order('created_at', { ascending: false }),
      supabase.from('reading_list').select('*, Books(*, Users(name))').eq('user_id', currentUser.id).order('created_at'),
      supabase.from('Notifications').select('id, message, created_at').eq('recipient_id', currentUser.id).order('created_at', { ascending: false }).limit(20),
    ])
    setIncoming(incomingRes.data || [])
    setBorrows(borrowsRes.data || [])
    setReadingList(rlRes.data || [])
    setRecent(recentRes.data || [])
    setLoading(false)
  }

  async function handOverBook(req) {
    setBusyIncoming(req.id)
    await supabase.from('borrows').update({ status: 'borrowed' }).eq('id', req.id)
    setIncoming(prev => prev.filter(r => r.id !== req.id))
    setBusyIncoming(null)
  }

  async function declineRequest(req) {
    setBusyIncoming(req.id)
    await supabase.from('borrows').delete().eq('id', req.id)
    setIncoming(prev => prev.filter(r => r.id !== req.id))
    setBusyIncoming(null)
  }

  async function removeBorrow(b) {
    setRemovingBorrow(b.id)
    await supabase.from('borrows').delete().eq('id', b.id)
    setBorrows(prev => prev.filter(r => r.id !== b.id))
    setRemovingBorrow(null)
  }

  async function markReturned(b) {
    setReturningBorrow(b.id)
    await supabase.from('borrows').delete().eq('id', b.id)
    if (b.book_id) {
      await supabase.from('reading_list').upsert(
        { user_id: currentUser.id, book_id: b.book_id, is_read: true },
        { onConflict: 'user_id,book_id' }
      )
    }
    setBorrows(prev => prev.filter(r => r.id !== b.id))
    const { data } = await supabase.from('reading_list').select('*, Books(*, Users(name))').eq('user_id', currentUser.id).order('created_at')
    setReadingList(data || [])
    setReturningBorrow(null)
  }

  async function toggleRead(item) {
    const next = !item.is_read
    await supabase.from('reading_list').update({ is_read: next }).eq('id', item.id)
    setReadingList(prev => prev.map(r => r.id === item.id ? { ...r, is_read: next } : r))
  }

  async function removeFromList(item) {
    await supabase.from('reading_list').delete().eq('id', item.id)
    setReadingList(prev => prev.filter(r => r.id !== item.id))
  }

  async function handleAdded() {
    setShowAddRL(false)
    const { data } = await supabase.from('reading_list').select('*, Books(*, Users(name))').eq('user_id', currentUser.id).order('created_at')
    setReadingList(data || [])
  }

  const requestedBorrows = borrows.filter(b => b.status !== 'borrowed')
  const activeBorrows = borrows.filter(b => b.status === 'borrowed')
  const readCount = readingList.filter(r => r.is_read).length
  const existingBookIds = readingList.filter(r => r.book_id).map(r => r.book_id)

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '54px 22px 16px' }}>
        <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 26, color: '#2C2622' }}>פעילות</div>
        <div style={{ fontSize: 14, color: '#8A8278', marginTop: 3 }}>בקשות, השאלות ופעילות אחרונה</div>
      </div>

      <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '6px 22px 116px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#A39B90', fontSize: 15, padding: 40 }}>טוען…</div>
        ) : (<>

          <Section title="בקשות שקיבלת" count={incoming.length}>
            {incoming.length === 0
              ? <Empty>אין בקשות חדשות — כשמישהו יבקש לשאול ספר שלך, זה יופיע כאן.</Empty>
              : incoming.map(req => (
                  <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #ECE7DE' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#2C2622', marginBottom: 1 }}>{req.Books?.title}</div>
                      <div style={{ fontSize: 12, color: '#A39B90' }}><strong style={{ color: '#6B5440' }}>{req.Users?.name}</strong> ביקש/ה לשאול</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
                      <button onClick={() => declineRequest(req)} disabled={busyIncoming === req.id} style={{ border: '1.5px solid #E7E1D6', background: '#FFFFFF', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, color: '#B24A3A', cursor: 'pointer' }}>
                        דחה
                      </button>
                      <button onClick={() => handOverBook(req)} disabled={busyIncoming === req.id} style={{ border: 'none', background: '#C05A3E', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, color: '#F7F5F1', cursor: 'pointer' }}>
                        {busyIncoming === req.id ? '…' : 'מסרתי את הספר'}
                      </button>
                    </div>
                  </div>
                ))
            }
          </Section>

          <Section title="מבוקשים" count={requestedBorrows.length}>
            {requestedBorrows.length === 0
              ? <Empty>אין בקשות ממתינות — בקש ספר כדי לראות אותו כאן.</Empty>
              : requestedBorrows.map(b => (
                  <div key={b.id} onClick={() => b.Books && onOpenBook(b.Books)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #ECE7DE', cursor: b.Books ? 'pointer' : 'default' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#2C2622', marginBottom: 1 }}>{b.Books?.title}</div>
                      <div style={{ fontSize: 12, color: '#7C756C' }}>מאת {b.Books?.author}</div>
                      <div style={{ fontSize: 12, color: '#A39B90', marginTop: 4 }}>מהמדף של <strong style={{ color: '#6B5440' }}>{b.Books?.Users?.name}</strong></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flex: 'none' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#B8860B', background: '#F6EDD4', padding: '4px 8px', borderRadius: 999 }}>ממתין</span>
                      <button onClick={e => { e.stopPropagation(); removeBorrow(b) }} disabled={removingBorrow === b.id} style={{ border: '1.5px solid #E7E1D6', background: '#FFFFFF', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, color: '#B24A3A', cursor: 'pointer' }}>
                        {removingBorrow === b.id ? '…' : 'הסר'}
                      </button>
                    </div>
                  </div>
                ))
            }
          </Section>

          <Section title="מושאלים" count={activeBorrows.length}>
            {activeBorrows.length === 0
              ? <Empty>אין ספרים בהשאלה כרגע.</Empty>
              : activeBorrows.map(b => (
                  <div key={b.id} onClick={() => b.Books && onOpenBook(b.Books)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #ECE7DE', cursor: b.Books ? 'pointer' : 'default' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#2C2622', marginBottom: 1 }}>{b.Books?.title}</div>
                      <div style={{ fontSize: 12, color: '#7C756C' }}>מאת {b.Books?.author}</div>
                      <div style={{ fontSize: 12, color: '#A39B90', marginTop: 4 }}>מהמדף של <strong style={{ color: '#6B5440' }}>{b.Books?.Users?.name}</strong></div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); markReturned(b) }} disabled={returningBorrow === b.id} style={{ flex: 'none', border: 'none', background: '#2E8B57', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, color: '#F7F5F1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {returningBorrow === b.id ? '…' : (<><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F7F5F1" strokeWidth="3" strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>הוחזר</>)}
                    </button>
                  </div>
                ))
            }
          </Section>

          <Section title="רשימת קריאה" count={readingList.length}
            subtitle={readingList.length > 0 ? `${readCount} מתוך ${readingList.length} נקראו` : null}
            action={
              <button onClick={() => setShowAddRL(true)} style={{ width: 28, height: 28, borderRadius: 9, border: 'none', background: '#C05A3E', color: '#F7F5F1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F7F5F1" strokeWidth="2.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            }
          >
            {readingList.length === 0
              ? <Empty>לחץ + להוסיף ספרים שרוצה לקרוא.</Empty>
              : readingList.map(item => {
                  const book = item.Books
                  const title = book?.title || item.custom_title
                  const author = book?.author || item.custom_author
                  const source = book?.Users?.name ? `מהמדף של ${book.Users.name}` : 'ספר מותאם'
                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #ECE7DE' }}>
                      <button onClick={() => toggleRead(item)} style={{ width: 26, height: 26, borderRadius: 8, flex: 'none', border: `2px solid ${item.is_read ? '#2E8B57' : '#DDD6CA'}`, background: item.is_read ? '#2E8B57' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.is_read && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      <div onClick={() => book && onOpenBook(book)} style={{ flex: 1, minWidth: 0, cursor: book ? 'pointer' : 'default' }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: item.is_read ? '#A39B90' : '#2C2622', textDecoration: item.is_read ? 'line-through' : 'none', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
                        {author && <div style={{ fontSize: 12, color: '#7C756C' }}>מאת {author}</div>}
                        <div style={{ fontSize: 12, color: '#A39B90', marginTop: 2 }}>{source}</div>
                      </div>
                      <button onClick={() => removeFromList(item)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, color: '#C4BAA8', flex: 'none' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                      </button>
                    </div>
                  )
                })
            }
          </Section>

          <Section title="פעילות אחרונה" count={0}>
            {recent.length === 0
              ? <Empty>אין פעילות עדיין — פעולות שנעשות סביבך יופיעו כאן.</Empty>
              : recent.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 13, background: '#FFFFFF', border: '1.5px solid #ECE7DE', borderRadius: 14, padding: '13px 14px', marginBottom: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: '#F1ECE3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flex: 'none' }}>🔔</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: '#2C2622', lineHeight: 1.4 }}>{a.message}</div>
                      <div style={{ fontSize: 12, color: '#A39B90', marginTop: 3 }}>{timeAgo(a.created_at)}</div>
                    </div>
                  </div>
                ))
            }
          </Section>
        </>)}
      </div>

      {showAddRL && (
        <AddToReadingList currentUser={currentUser} existingBookIds={existingBookIds} onAdded={handleAdded} onClose={() => setShowAddRL(false)} />
      )}
    </div>
  )
}

function Section({ title, count, subtitle, action, children }) {
  return (
    <div style={{ marginBottom: 34 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 18, color: '#2C2622' }}>{title}</span>
        {count > 0 && <span style={{ fontSize: 13, color: '#A39B90', fontWeight: 500 }}>{count}</span>}
        {subtitle && <span style={{ fontSize: 12, color: '#A39B90' }}>{subtitle}</span>}
        {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
      </div>
      {children}
    </div>
  )
}

function Empty({ children }) {
  return <div style={{ fontSize: 14, color: '#A39B90', fontStyle: 'italic', padding: '4px 0 8px' }}>{children}</div>
}
