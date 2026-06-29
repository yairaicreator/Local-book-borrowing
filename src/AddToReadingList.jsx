import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'
import { TOPICS, STATUS, coverPalette } from './lib/utils'
import BookCover from './BookCover'

export default function AddToReadingList({ currentUser, existingBookIds, onAdded, onClose }) {
  const [tab, setTab] = useState('browse') // 'browse' | 'custom'

  // browse state
  const [allBooks, setAllBooks] = useState([])
  const [booksLoading, setBooksLoading] = useState(true)
  const [browseSearch, setBrowseSearch] = useState('')
  const [adding, setAdding] = useState(null) // book id being added

  // custom state
  const [customTitle, setCustomTitle] = useState('')
  const [customAuthor, setCustomAuthor] = useState('')
  const [customTopic, setCustomTopic] = useState(TOPICS[0])
  const [customImage, setCustomImage] = useState(null)
  const [customImagePreview, setCustomImagePreview] = useState(null)
  const [customSaving, setCustomSaving] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    supabase.from('Books').select('*, Users(name)').order('title')
      .then(({ data }) => { setAllBooks(data || []); setBooksLoading(false) })
  }, [])

  const alreadyIn = new Set(existingBookIds)
  const q = browseSearch.trim().toLowerCase()
  const browseBooks = allBooks.filter(b => {
    if (alreadyIn.has(b.id)) return false
    if (q) return b.title.toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q)
    return true
  })

  async function addFromLibrary(book) {
    setAdding(book.id)
    await supabase.from('reading_list').upsert(
      { user_id: currentUser.id, book_id: book.id, is_read: false },
      { onConflict: 'user_id,book_id' }
    )
    onAdded()
    setAdding(null)
  }

  function handleCustomImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setCustomImage(file)
    setCustomImagePreview(URL.createObjectURL(file))
  }

  async function saveCustom() {
    if (!customTitle.trim() || customSaving) return
    setCustomSaving(true)
    let image_url = null
    if (customImage) {
      const ext = customImage.name.split('.').pop()
      const path = `rl-${currentUser.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('book-images').upload(path, customImage, { upsert: false })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('book-images').getPublicUrl(path)
        image_url = urlData.publicUrl
      }
    }
    await supabase.from('reading_list').insert({
      user_id: currentUser.id,
      book_id: null,
      is_read: false,
      custom_title: customTitle.trim(),
      custom_author: customAuthor.trim() || null,
      custom_image_url: image_url,
      custom_topic: customTopic,
    })
    onAdded()
  }

  const canSaveCustom = customTitle.trim() && !customSaving

  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(40,30,18,.45)',
        zIndex: 40, animation: 'flFade .18s ease',
      }} />

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: '#F7F5F1', borderRadius: '26px 26px 0 0',
        zIndex: 41, display: 'flex', flexDirection: 'column',
        maxHeight: '88vh',
        animation: 'flSheetUp .3s cubic-bezier(.22,1,.36,1)',
        boxShadow: '0 -14px 36px -12px rgba(40,30,18,.4)',
      }}>
        {/* handle + header */}
        <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
          <div style={{ width: 38, height: 5, borderRadius: 3, background: '#DDD6CA', margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 20, color: '#2C2622' }}>
              Add to Reading List
            </div>
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: '50%', border: 'none',
              background: '#F0ECE4', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6E675C" strokeWidth="2.4" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          {/* tabs */}
          <div style={{ display: 'flex', gap: 0, background: '#F0ECE4', borderRadius: 12, padding: 4, marginBottom: 16 }}>
            {[['browse', 'Browse Library'], ['custom', 'Add Custom']].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                flex: 1, border: 'none', cursor: 'pointer', padding: '9px 0',
                borderRadius: 9, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 14,
                background: tab === key ? '#F7F5F1' : 'transparent',
                color: tab === key ? '#2C2622' : '#A39B90',
                boxShadow: tab === key ? '0 1px 4px rgba(40,30,18,.12)' : 'none',
                transition: 'all .15s',
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* content */}
        {tab === 'browse' ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* search */}
            <div style={{ padding: '0 20px 12px', flexShrink: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#FFFFFF', border: '1.5px solid #E7E1D6',
                borderRadius: 12, padding: '10px 13px',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A39B90" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" />
                </svg>
                <input
                  value={browseSearch} onChange={e => setBrowseSearch(e.target.value)}
                  placeholder="Search books…"
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: "'Source Sans 3',sans-serif", fontSize: 15, color: '#2C2622', width: '100%' }}
                />
              </div>
            </div>

            <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 32px' }}>
              {booksLoading && <div style={{ textAlign: 'center', color: '#A39B90', padding: 30 }}>Loading…</div>}
              {!booksLoading && browseBooks.length === 0 && (
                <div style={{ textAlign: 'center', color: '#A39B90', fontSize: 14, fontStyle: 'italic', padding: '30px 0' }}>
                  {alreadyIn.size > 0 && allBooks.length <= alreadyIn.size
                    ? 'All library books are already in your reading list!'
                    : q ? `No books match "${browseSearch}".` : 'No books in the library yet.'}
                </div>
              )}
              {browseBooks.map(book => {
                const s = STATUS[book.status] || STATUS.available
                const isAdding = adding === book.id
                return (
                  <div key={book.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 0', borderBottom: '1px solid #ECE7DE',
                  }}>
                    <BookCover book={book} width={44} height={62} fontSize={9} authorSize={7} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#2C2622', marginBottom: 1 }}>{book.title}</div>
                      <div style={{ fontSize: 12, color: '#7C756C' }}>by {book.author}</div>
                      <div style={{ fontSize: 11, color: '#A39B90', marginTop: 2 }}>{book.Users?.name}'s shelf</div>
                    </div>
                    <button onClick={() => addFromLibrary(book)} disabled={isAdding} style={{
                      border: 'none', borderRadius: 10, padding: '8px 14px',
                      background: '#C05A3E', color: '#F7F5F1',
                      fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 13,
                      cursor: 'pointer', flex: 'none',
                      opacity: isAdding ? 0.6 : 1,
                    }}>
                      {isAdding ? '…' : '+ Add'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 32px' }}>
            {/* photo */}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCustomImageChange} />
            <button onClick={() => fileRef.current.click()} style={{
              width: '100%', border: '1.6px dashed #D8D1C4', background: '#FBFAF7',
              borderRadius: 16, padding: customImagePreview ? 0 : '20px 0',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              cursor: 'pointer', marginBottom: 18, overflow: 'hidden',
              minHeight: customImagePreview ? 140 : 'auto',
            }}>
              {customImagePreview ? (
                <img src={customImagePreview} alt="cover" style={{ width: '100%', height: 140, objectFit: 'cover' }} />
              ) : (
                <>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F1ECE3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C05A3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#7C756C' }}>Add cover photo</div>
                  <div style={{ fontSize: 12, color: '#A39B90' }}>Optional</div>
                </>
              )}
            </button>

            <CLabel>Book title *</CLabel>
            <input value={customTitle} onChange={e => setCustomTitle(e.target.value)}
              placeholder="Enter book title"
              style={cinputStyle}
              onFocus={e => e.target.style.borderColor = '#C05A3E'}
              onBlur={e => e.target.style.borderColor = '#E7E1D6'}
            />

            <CLabel>Author</CLabel>
            <input value={customAuthor} onChange={e => setCustomAuthor(e.target.value)}
              placeholder="Author name (optional)"
              style={cinputStyle}
              onFocus={e => e.target.style.borderColor = '#C05A3E'}
              onBlur={e => e.target.style.borderColor = '#E7E1D6'}
            />

            <CLabel>Topic</CLabel>
            <div style={{ position: 'relative', marginBottom: 24 }}>
              <select value={customTopic} onChange={e => setCustomTopic(e.target.value)}
                style={{ ...cinputStyle, marginBottom: 0, appearance: 'none' }}>
                {TOPICS.map(t => <option key={t}>{t}</option>)}
              </select>
              <svg style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A39B90" strokeWidth="2.4" strokeLinecap="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>

            <button onClick={saveCustom} disabled={!canSaveCustom} style={{
              width: '100%', border: 'none', borderRadius: 14, padding: 16,
              fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 16,
              color: '#F7F5F1', background: canSaveCustom ? '#C05A3E' : '#E3B5A8',
              cursor: canSaveCustom ? 'pointer' : 'not-allowed',
            }}>
              {customSaving ? 'Saving…' : 'Add to Reading List'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

function CLabel({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 600, color: '#7C756C', marginBottom: 6 }}>{children}</div>
}

const cinputStyle = {
  width: '100%', border: '1.5px solid #E7E1D6', background: '#FFFFFF',
  borderRadius: 12, padding: '12px 14px',
  fontFamily: "'Source Sans 3',sans-serif", fontSize: 15, color: '#2C2622',
  outline: 'none', marginBottom: 16, display: 'block',
}
