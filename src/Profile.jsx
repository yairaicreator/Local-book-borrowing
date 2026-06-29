import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { STATUS, avatarPalette, initial } from './lib/utils'
import BookCover from './BookCover'

export default function Profile({ currentUser, onClose }) {
  const [myBooks, setMyBooks] = useState([])
  const [borrows, setBorrows] = useState([])
  const [readingList, setReadingList] = useState([])
  const [loading, setLoading] = useState(true)

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

  async function toggleRead(item) {
    const next = !item.is_read
    await supabase.from('reading_list').update({ is_read: next }).eq('id', item.id)
    setReadingList(prev => prev.map(r => r.id === item.id ? { ...r, is_read: next } : r))
  }

  async function removeFromList(item) {
    await supabase.from('reading_list').delete().eq('id', item.id)
    setReadingList(prev => prev.filter(r => r.id !== item.id))
  }

  const pal = avatarPalette(currentUser.id)
  const readCount = readingList.filter(r => r.is_read).length

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
        <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 21, color: '#2C2622' }}>My Profile</div>
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
          <div style={{ textAlign: 'center', color: '#A39B90', fontSize: 15, padding: 40 }}>Loading…</div>
        ) : (<>

          {/* ── My Shelf ── */}
          <Section title="My Shelf" count={myBooks.length}>
            {myBooks.length === 0
              ? <Empty>You haven't added any books yet.</Empty>
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

          {/* ── Books I'm Borrowing ── */}
          <Section title="Books I'm Borrowing" count={borrows.length}>
            {borrows.length === 0
              ? <Empty>No active borrows — request a book to see it here.</Empty>
              : borrows.map(b => {
                  const book = b.Books
                  const s = STATUS[book?.status] || STATUS.available
                  return (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #ECE7DE' }}>
                      <BookCover book={book || {}} width={48} height={68} fontSize={9} authorSize={7} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#2C2622', marginBottom: 1 }}>{book?.title}</div>
                        <div style={{ fontSize: 12, color: '#7C756C' }}>by {book?.author}</div>
                        <div style={{ fontSize: 12, color: '#A39B90', marginTop: 4 }}>
                          From <strong style={{ color: '#6B5440' }}>{book?.Users?.name}</strong>'s shelf
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: s.color, background: s.bg,
                        padding: '4px 8px', borderRadius: 999, flex: 'none',
                      }}>{s.label}</span>
                    </div>
                  )
                })
            }
          </Section>

          {/* ── Reading List ── */}
          <Section
            title="Reading List"
            count={readingList.length}
            subtitle={readingList.length > 0 ? `${readCount} of ${readingList.length} read` : null}
          >
            {readingList.length === 0
              ? <Empty>Tap "Add to Reading List" on any book to save it here.</Empty>
              : readingList.map(item => {
                  const book = item.Books
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

                      <BookCover book={book || {}} width={48} height={68} fontSize={9} authorSize={7} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 600, fontSize: 14, color: item.is_read ? '#A39B90' : '#2C2622',
                          textDecoration: item.is_read ? 'line-through' : 'none', marginBottom: 1,
                        }}>
                          {book?.title}
                        </div>
                        <div style={{ fontSize: 12, color: '#7C756C' }}>by {book?.author}</div>
                        <div style={{ fontSize: 12, color: '#A39B90', marginTop: 2 }}>
                          From {book?.Users?.name}'s shelf
                        </div>
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
    </div>
  )
}

function Section({ title, count, subtitle, children }) {
  return (
    <div style={{ marginBottom: 34 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 18, color: '#2C2622' }}>{title}</span>
        {count > 0 && <span style={{ fontSize: 13, color: '#A39B90', fontWeight: 500 }}>{count}</span>}
        {subtitle && <span style={{ fontSize: 12, color: '#A39B90', marginLeft: 'auto' }}>{subtitle}</span>}
      </div>
      {children}
    </div>
  )
}

function Empty({ children }) {
  return <div style={{ fontSize: 14, color: '#A39B90', fontStyle: 'italic', padding: '4px 0 8px' }}>{children}</div>
}
