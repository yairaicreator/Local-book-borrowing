import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { STATUS, avatarPalette, initial } from './lib/utils'
import BookCover from './BookCover'
import AddToReadingList from './AddToReadingList'

export default function Profile({ currentUser, onClose }) {
  const [myBooks, setMyBooks] = useState([])
  const [borrows, setBorrows] = useState([])
  const [readingList, setReadingList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddRL, setShowAddRL] = useState(false)
  const [removingBorrow, setRemovingBorrow] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [booksRes, borrowsRes, rlRes] = await Promise.all([
      supabase.from('Books').select('*').eq('add_by', currentUser.id).order('created_at'),
      supabase.from('borrows').select('*, Books(*, Users(name))').eq('borrower_id', currentUser.id).order('created_at', { ascending: false }),
      supabase.from('reading_list').select('*, Books(*, Users(name))').eq('user_id', currentUser.id).order('created_at'),
    ])
    setMyBooks(booksRes.data || [])
    setBorrows(borrowsRes.data || [])
    setReadingList(rlRes.data || [])
    setLoading(false)
  }

  async function removeBorrow(b) {
    setRemovingBorrow(b.id)
    await supabase.from('borrows').delete().eq('id', b.id)
    setBorrows(prev => prev.filter(r => r.id !== b.id))
    setRemovingBorrow(null)
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
    const { data } = await supabase
      .from('reading_list')
      .select('*, Books(*, Users(name))')
      .eq('user_id', currentUser.id)
      .order('created_at')
    setReadingList(data || [])
  }

  const pal = avatarPalette(currentUser.id)
  const readCount = readingList.filter(r => r.is_read).length
  const existingBookIds = readingList.filter(r => r.book_id).map(r => r.book_id)

  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#F7F5F1',
      zIndex: 30, display: 'flex', flexDirection: 'column',
      animation: 'flFade .22s ease',
    }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '58px 18px 14px', borderBottom: '1px solid #ECE7DE' }}>
        <button onClick={onClose} style={{
          width: 34, height: 34, borderRadius: '50%', border: 'none',
          background: '#F0ECE4', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6E675C" strokeWidth="2.4" strokeLinecap="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 21, color: '#2C2622' }}>הפרופיל שלי</div>
      </div>

      <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 48px' }}>
        {/* avatar + info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: pal.bg, color: pal.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 24, flex: 'none',
          }}>
            {initial(currentUser.name)}
          </div>
          <div>
            <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 22, color: '#2C2622' }}>{currentUser.name}</div>
            {currentUser.phone && <div style={{ fontSize: 13, color: '#A39B90', marginTop: 2 }}>{currentUser.phone}</div>}
            {currentUser.email && <div style={{ fontSize: 13, color: '#A39B90' }}>{currentUser.email}</div>}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#A39B90', fontSize: 15, padding: 40 }}>טוען…</div>
        ) : (<>

          {/* ── המדף שלי ── */}
          <Section title="המדף שלי" count={myBooks.length}>
            {myBooks.length === 0
              ? <Empty>עדיין לא הוספת ספרים.</Empty>
              : (
                <div className="fl-scroll" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '2px 0 6px' }}>
                  {myBooks.map(book => {
                    const s = STATUS[book.status] || STATUS.available
                    return (
                      <div key={book.id} style={{ flex: 'none', width: 100 }}>
                        <BookCover book={book} width={100} height={142} fontSize={13} authorSize={9} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flex: 'none' }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: s.color }}>{s.label}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#7C756C', marginTop: 1, lineHeight: 1.3 }}>{book.title}</div>
                      </div>
                    )
                  })}
                </div>
              )
            }
          </Section>

          {/* ── ספרים שאני שואל ── */}
          <Section title="ספרים שאני שואל" count={borrows.length}>
            {borrows.length === 0
              ? <Empty>אין השאלות פעילות — בקש ספר כדי לראות אותו כאן.</Empty>
              : borrows.map(b => {
                  const book = b.Books
                  const s = STATUS[book?.status] || STATUS.available
                  return (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #ECE7DE' }}>
                      <BookCover book={book || {}} width={48} height={68} fontSize={9} authorSize={7} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#2C2622', marginBottom: 1 }}>{book?.title}</div>
                        <div style={{ fontSize: 12, color: '#7C756C' }}>מאת {book?.author}</div>
                        <div style={{ fontSize: 12, color: '#A39B90', marginTop: 4 }}>
                          מהמדף של <strong style={{ color: '#6B5440' }}>{book?.Users?.name}</strong>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flex: 'none' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, color: s.color, background: s.bg,
                          padding: '4px 8px', borderRadius: 999,
                        }}>{s.label}</span>
                        <button
                          onClick={() => removeBorrow(b)}
                          disabled={removingBorrow === b.id}
                          style={{
                            border: '1.5px solid #E7E1D6', background: '#FFFFFF', borderRadius: 8,
                            padding: '4px 10px', fontSize: 12, fontFamily: "'Source Sans 3',sans-serif",
                            fontWeight: 600, color: '#B24A3A', cursor: 'pointer',
                          }}
                        >
                          {removingBorrow === b.id ? '…' : 'הסר'}
                        </button>
                      </div>
                    </div>
                  )
                })
            }
          </Section>

          {/* ── רשימת קריאה ── */}
          <Section
            title="רשימת קריאה"
            count={readingList.length}
            subtitle={readingList.length > 0 ? `${readCount} מתוך ${readingList.length} נקראו` : null}
            action={
              <button onClick={() => setShowAddRL(true)} style={{
                width: 28, height: 28, borderRadius: 9, border: 'none',
                background: '#C05A3E', color: '#F7F5F1', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F7F5F1" strokeWidth="2.8" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
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

                  const coverBook = book || {
                    id: item.id,
                    title: item.custom_title,
                    author: item.custom_author,
                    image_url: item.custom_image_url,
                  }

                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #ECE7DE' }}>
                      <button onClick={() => toggleRead(item)} style={{
                        width: 26, height: 26, borderRadius: 8, flex: 'none',
                        border: `2px solid ${item.is_read ? '#2E8B57' : '#DDD6CA'}`,
                        background: item.is_read ? '#2E8B57' : 'transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {item.is_read && (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      <BookCover book={coverBook} width={48} height={68} fontSize={9} authorSize={7} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 600, fontSize: 14,
                          color: item.is_read ? '#A39B90' : '#2C2622',
                          textDecoration: item.is_read ? 'line-through' : 'none', marginBottom: 1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {title}
                        </div>
                        {author && <div style={{ fontSize: 12, color: '#7C756C' }}>מאת {author}</div>}
                        <div style={{ fontSize: 12, color: '#A39B90', marginTop: 2 }}>{source}</div>
                      </div>

                      <button onClick={() => removeFromList(item)} style={{
                        border: 'none', background: 'none', cursor: 'pointer', padding: 6,
                        color: '#C4BAA8', flex: 'none',
                      }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                          <path d="M6 6l12 12M18 6 6 18" />
                        </svg>
                      </button>
                    </div>
                  )
                })
            }
          </Section>

        </>)}
      </div>

      {showAddRL && (
        <AddToReadingList
          currentUser={currentUser}
          existingBookIds={existingBookIds}
          onAdded={handleAdded}
          onClose={() => setShowAddRL(false)}
        />
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
