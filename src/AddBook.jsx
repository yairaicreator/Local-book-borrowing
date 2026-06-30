import { useState, useRef, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { STATUS, TOPICS } from './lib/utils'
import { scanImageText, extractTitleAuthor, detectTopic, scanISBN, lookupISBN, searchBooks } from './lib/scanner'

const isMobileDevice = () => window.innerWidth < 640

export default function AddBook({ currentUser, onClose, onSaved, desktop = false }) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [topic, setTopic] = useState(TOPICS[0])
  const [status, setStatus] = useState('available')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [backPreview, setBackPreview] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [backScanning, setBackScanning] = useState(false)
  const [isbnScanning, setIsbnScanning] = useState(false)
  const [isbnNote, setIsbnNote] = useState('')
  const [isbnSuccess, setIsbnSuccess] = useState(false)
  // title search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef(null)
  const [ocrNote, setOcrNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const frontRef = useRef()
  const backRef = useRef()
  const isbnRef = useRef()
  const mobile = isMobileDevice()

  // Debounced title search
  useEffect(() => {
    clearTimeout(searchTimer.current)
    if (!searchQuery.trim()) { setSearchResults([]); return }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      const results = await searchBooks(searchQuery)
      setSearchResults(results)
      setSearching(false)
    }, 500)
    return () => clearTimeout(searchTimer.current)
  }, [searchQuery])

  function applyBook(book) {
    if (book.title) setTitle(book.title)
    if (book.author) setAuthor(book.author)
    if (book.description) setDescription(book.description)
    if (book.topic) setTopic(book.topic)
    setIsbnSuccess(true)
    setIsbnNote(`✓ Found: "${book.title}"`)
    setSearchQuery('')
    setSearchResults([])
  }

  async function handleISBNChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setIsbnScanning(true)
    setIsbnNote('')
    setIsbnSuccess(false)
    try {
      const isbn = await scanISBN(file)
      if (!isbn) {
        setIsbnNote("No barcode found — try a close-up photo of just the barcode, or search by title below.")
        return
      }
      const book = await lookupISBN(isbn)
      if (!book) {
        setIsbnNote(`Barcode read but not in database (local publisher code). Search by title below instead.`)
        return
      }
      applyBook(book)
    } catch (err) {
      setIsbnNote(`Error: ${err.message}`)
    } finally {
      setIsbnScanning(false)
      e.target.value = ''
    }
  }

  async function handleFrontChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setOcrNote('')
    setScanning(true)
    try {
      const { text, words } = await scanImageText(file)
      if (words.length > 0) {
        const { title: t, author: a } = extractTitleAuthor(words)
        if (t && !title) setTitle(t)
        if (a && !author) setAuthor(a)
        const guessed = detectTopic(text)
        if (guessed) setTopic(guessed)
      } else {
        setOcrNote("No text found on this cover — please type manually.")
      }
    } catch (err) {
      setOcrNote(`Scan failed: ${err.message}`)
    } finally { setScanning(false) }
  }

  async function handleBackChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setBackPreview(URL.createObjectURL(file))
    setBackScanning(true)
    try {
      const { text } = await scanImageText(file)
      if (text) {
        if (!description) setDescription(text.replace(/\n/g, ' ').trim())
        const guessed = detectTopic(text)
        if (guessed) setTopic(guessed)
      }
    } catch (err) {
      setOcrNote(`Back cover scan failed: ${err.message}`)
    } finally { setBackScanning(false) }
  }

  async function handleSave() {
    if (!title.trim() || !author.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      let image_url = null
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `${currentUser.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('book-images').upload(path, imageFile, { upsert: false })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('book-images').getPublicUrl(path)
        image_url = urlData.publicUrl
      }
      const { error: insErr } = await supabase.from('Books').insert({
        title: title.trim(), author: author.trim(),
        description: description.trim() || null,
        topic, status, add_by: currentUser.id, image_url,
      })
      if (insErr) throw insErr
      onSaved()
    } catch (e) {
      setError(e.message || 'Something went wrong.')
      setSaving(false)
    }
  }

  const canSave = title.trim() && author.trim() && !saving

  if (desktop) {
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(40,30,18,.46)', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'flFade .2s ease', padding: 40 }}>
        <div onClick={e => e.stopPropagation()} style={{ width: 680, maxWidth: '100%', maxHeight: '90vh', background: '#F7F5F1', borderRadius: 22, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 70px -20px rgba(40,30,18,.55)', animation: 'flPop .26s cubic-bezier(.22,1,.36,1)' }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '24px 30px', borderBottom: '1px solid #ECE7DE' }}>
            <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 22, color: '#2C2622' }}>Add a book</div>
            <button onClick={onClose} style={{ marginLeft: 'auto', width: 34, height: 34, borderRadius: '50%', border: 'none', background: '#F0ECE4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6E675C" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>

          <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 30px' }}>
            <div style={{ display: 'flex', gap: 24 }}>
              {/* photo column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
                <input ref={frontRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFrontChange} />
                <input ref={backRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBackChange} />
                <input ref={isbnRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleISBNChange} />

                {/* Auto fill (ISBN) */}
                <div>
                  <div style={photoLabel}>Auto fill <span style={photoSub}>— scan barcode</span></div>
                  <button onClick={() => { setIsbnNote(''); isbnRef.current.click() }} style={{ width: 150, border: `2px solid ${isbnSuccess ? '#2E8B57' : '#C05A3E'}`, background: isbnSuccess ? '#E2F1E7' : '#FDF0EC', borderRadius: 14, padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', justifyContent: 'center' }}>
                    {isbnScanning ? (
                      <>
                        <div style={{ width: 22, height: 22, border: '2.5px solid #F1E3DE', borderTopColor: '#C05A3E', borderRadius: '50%', animation: 'fl-spin 0.7s linear infinite' }} />
                        <div style={{ fontSize: 12, color: '#C05A3E', fontWeight: 600 }}>Scanning…</div>
                      </>
                    ) : (
                      <>
                        <BarcodeIcon color={isbnSuccess ? '#2E8B57' : '#C05A3E'} />
                        <div style={{ fontSize: 13, fontWeight: 700, color: isbnSuccess ? '#2E8B57' : '#C05A3E' }}>Auto fill</div>
                        <div style={{ fontSize: 11, color: '#A39B90', textAlign: 'center' }}>Photo of barcode</div>
                      </>
                    )}
                  </button>
                  {isbnNote && <div style={{ fontSize: 12, color: isbnSuccess ? '#2E8B57' : '#8A6A3A', background: isbnSuccess ? '#E2F1E7' : '#F6EDD4', borderRadius: 8, padding: '7px 10px', marginTop: 8, width: 150, lineHeight: 1.4 }}>{isbnNote}</div>}
                </div>

                {/* front cover */}
                <div>
                  <div style={photoLabel}>Front cover <span style={photoSub}>— scans title &amp; author</span></div>
                  <button onClick={() => frontRef.current.click()} style={{ width: 150, border: '1.6px dashed #D8D1C4', background: '#FBFAF7', borderRadius: 14, padding: imagePreview ? 0 : '18px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', aspectRatio: '128/182', justifyContent: 'center', overflow: 'hidden' }}>
                    {imagePreview ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <img src={imagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        {scanning && <ScanOverlay label="Reading…" />}
                      </div>
                    ) : (
                      <>
                        <PhotoIcon />
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2622', textAlign: 'center' }}>Add a cover</div>
                        <div style={{ fontSize: 11, color: '#A39B90', textAlign: 'center' }}>AI reads title &amp; author</div>
                      </>
                    )}
                  </button>
                </div>

                {/* back cover */}
                <div>
                  <div style={photoLabel}>Back cover <span style={photoSub}>(optional)</span></div>
                  <button onClick={() => backRef.current.click()} style={{ width: 150, border: `1.6px dashed ${backPreview ? '#C05A3E' : '#D8D1C4'}`, background: '#FBFAF7', borderRadius: 14, overflow: 'hidden', aspectRatio: '128/182', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', padding: backPreview ? 0 : '18px 12px', flexDirection: 'column', gap: 8 }}>
                    {backPreview ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <img src={backPreview} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        {backScanning && <ScanOverlay label="Reading…" />}
                        {!backScanning && (
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(44,38,34,.7)', padding: '6px', textAlign: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#F7F5F1' }}>✓ Back cover added</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#A39B90" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#A39B90', textAlign: 'center' }}>Back cover</div>
                        <div style={{ fontSize: 11, color: '#C4BAB0', textAlign: 'center' }}>AI reads description</div>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* fields column */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Title search */}
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <DLabel>Search by title</DLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#FFFFFF', border: '1.5px solid #E7E1D6', borderRadius: 12, padding: '11px 13px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A39B90" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg>
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Type a title or author…" style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: "'Source Sans 3',sans-serif", fontSize: 14, color: '#2C2622', flex: 1 }} />
                    {searching && <div style={{ width: 14, height: 14, border: '2px solid #E7E1D6', borderTopColor: '#C05A3E', borderRadius: '50%', animation: 'fl-spin 0.7s linear infinite', flexShrink: 0 }} />}
                    {searchQuery && !searching && <button onClick={() => { setSearchQuery(''); setSearchResults([]) }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#A39B90', padding: 0, lineHeight: 1, fontSize: 17 }}>×</button>}
                  </div>
                  {searchResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#FFFFFF', border: '1.5px solid #E7E1D6', borderRadius: 12, overflow: 'hidden', zIndex: 50, boxShadow: '0 8px 24px -8px rgba(44,38,34,.2)', marginTop: 4 }}>
                      {searchResults.map((r, i) => (
                        <button key={i} onClick={() => applyBook(r)} style={{ width: '100%', border: 'none', background: 'none', padding: '11px 14px', textAlign: 'left', cursor: 'pointer', borderBottom: i < searchResults.length - 1 ? '1px solid #F0ECE4' : 'none', display: 'block' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F7F5F1'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2622', lineHeight: 1.3 }}>{r.title}</div>
                          {r.author && <div style={{ fontSize: 12, color: '#7C756C', marginTop: 2 }}>{r.author}</div>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {(ocrNote || (isbnNote && !isbnSuccess)) && <div style={{ fontSize: 13, color: '#8A6A3A', background: '#F6EDD4', borderRadius: 10, padding: '10px 13px', marginBottom: 14 }}>{ocrNote || isbnNote}</div>}
                <DLabel>Title</DLabel>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Book title" style={dinputStyle} onFocus={f} onBlur={b} />
                <DLabel>Author</DLabel>
                <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author name" style={dinputStyle} onFocus={f} onBlur={b} />
                <DLabel>Topic</DLabel>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <select value={topic} onChange={e => setTopic(e.target.value)} style={{ ...dinputStyle, appearance: 'none', marginBottom: 0 }}>
                    {TOPICS.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <ChevDown />
                </div>
              </div>
            </div>

            <DLabel style={{ marginTop: 6 }}>Description</DLabel>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="A few words about this book…" rows={3} style={{ ...dinputStyle, resize: 'none' }} onFocus={f} onBlur={b} />

            <DLabel>Borrowing status</DLabel>
            <StatusPicker status={status} setStatus={setStatus} />
            {error && <div style={{ color: '#B24A3A', fontSize: 14, marginTop: 10 }}>{error}</div>}
          </div>

          <div style={{ padding: '18px 30px 24px', borderTop: '1px solid #ECE7DE', display: 'flex', gap: 12 }}>
            <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button onClick={handleSave} disabled={!canSave} style={{ ...saveBtnStyle, background: canSave ? '#C05A3E' : '#E3B5A8', cursor: canSave ? 'pointer' : 'not-allowed' }}>
              {saving ? 'Saving…' : 'Save book'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Mobile layout ──
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#F7F5F1', animation: 'flFade .22s ease', zIndex: 30, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '58px 18px 14px', borderBottom: '1px solid #ECE7DE' }}>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: '#F0ECE4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6E675C" strokeWidth="2.4" strokeLinecap="round"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 21, color: '#2C2622' }}>Add a book</div>
      </div>

      <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 30px' }}>
        {/* hidden inputs — capture="environment" on mobile opens camera directly */}
        <input ref={frontRef} type="file" accept="image/*" capture={mobile ? 'environment' : undefined} style={{ display: 'none' }} onChange={handleFrontChange} />
        <input ref={backRef} type="file" accept="image/*" capture={mobile ? 'environment' : undefined} style={{ display: 'none' }} onChange={handleBackChange} />
        <input ref={isbnRef} type="file" accept="image/*" capture={mobile ? 'environment' : undefined} style={{ display: 'none' }} onChange={handleISBNChange} />

        {/* Auto fill (ISBN) — primary action */}
        <button onClick={() => { setIsbnNote(''); isbnRef.current.click() }} style={{ width: '100%', border: `2px solid ${isbnSuccess ? '#2E8B57' : '#C05A3E'}`, background: isbnSuccess ? '#E2F1E7' : '#FDF0EC', borderRadius: 18, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', marginBottom: 10 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: isbnSuccess ? '#C4E4D0' : '#F1E0D8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {isbnScanning
              ? <div style={{ width: 22, height: 22, border: '2.5px solid rgba(192,90,62,.25)', borderTopColor: '#C05A3E', borderRadius: '50%', animation: 'fl-spin 0.7s linear infinite' }} />
              : <BarcodeIcon color={isbnSuccess ? '#2E8B57' : '#C05A3E'} size={26} />
            }
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: isbnSuccess ? '#2E8B57' : '#C05A3E' }}>
              {isbnScanning ? 'Scanning barcode…' : isbnSuccess ? 'Auto filled!' : 'Auto fill'}
            </div>
            <div style={{ fontSize: 13, color: '#7C756C', marginTop: 2 }}>
              {isbnSuccess ? isbnNote : 'Close-up photo of just the barcode'}
            </div>
          </div>
        </button>
        {isbnNote && !isbnSuccess && <div style={{ fontSize: 13, color: '#8A6A3A', background: '#F6EDD4', borderRadius: 12, padding: '11px 14px', marginBottom: 10 }}>{isbnNote}</div>}

        {/* Title search */}
        <div style={{ position: 'relative', marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#A39B90', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Or search by title</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFFFFF', border: '1.5px solid #E7E1D6', borderRadius: 13, padding: '12px 14px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A39B90" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Type a title or author…" style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: "'Source Sans 3',sans-serif", fontSize: 15, color: '#2C2622', flex: 1 }} />
            {searching && <div style={{ width: 16, height: 16, border: '2px solid #E7E1D6', borderTopColor: '#C05A3E', borderRadius: '50%', animation: 'fl-spin 0.7s linear infinite', flexShrink: 0 }} />}
            {searchQuery && !searching && <button onClick={() => { setSearchQuery(''); setSearchResults([]) }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#A39B90', padding: 0, lineHeight: 1, fontSize: 18 }}>×</button>}
          </div>
          {searchResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#FFFFFF', border: '1.5px solid #E7E1D6', borderRadius: 13, overflow: 'hidden', zIndex: 10, boxShadow: '0 8px 24px -8px rgba(44,38,34,.2)', marginTop: 4 }}>
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => applyBook(r)} style={{ width: '100%', border: 'none', background: 'none', padding: '12px 16px', textAlign: 'left', cursor: 'pointer', borderBottom: i < searchResults.length - 1 ? '1px solid #F0ECE4' : 'none', display: 'block' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F7F5F1'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2622', lineHeight: 1.3 }}>{r.title}</div>
                  {r.author && <div style={{ fontSize: 13, color: '#7C756C', marginTop: 2 }}>{r.author}</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* front cover */}
        <div style={{ fontSize: 11, fontWeight: 600, color: '#A39B90', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Front cover — AI reads title &amp; author</div>
        <button onClick={() => frontRef.current.click()} style={{ width: '100%', border: '1.6px dashed #D8D1C4', background: '#FBFAF7', borderRadius: 18, padding: imagePreview ? 0 : 26, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, cursor: 'pointer', marginBottom: 10, overflow: 'hidden', minHeight: imagePreview ? 180 : 'auto' }}>
          {imagePreview ? (
            <div style={{ position: 'relative', width: '100%' }}>
              <img src={imagePreview} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
              {scanning && <ScanOverlay label="Reading cover…" />}
            </div>
          ) : (
            <>
              <div style={{ width: 50, height: 50, borderRadius: 14, background: '#F1ECE3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C05A3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#2C2622' }}>{mobile ? 'Take a photo of front cover' : 'Front cover photo'}</div>
              <div style={{ fontSize: 13, color: '#A39B90' }}>AI will extract title &amp; author</div>
            </>
          )}
        </button>

        {ocrNote && <div style={{ fontSize: 13, color: '#8A6A3A', background: '#F6EDD4', borderRadius: 12, padding: '11px 14px', marginBottom: 14 }}>{ocrNote}</div>}

        {/* back cover */}
        <div style={{ fontSize: 11, fontWeight: 600, color: '#A39B90', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Back cover <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional — AI reads description)</span></div>
        <button onClick={() => backRef.current.click()} style={{ width: '100%', border: `1.6px dashed ${backPreview ? '#C05A3E' : '#D8D1C4'}`, background: '#FBFAF7', borderRadius: 18, overflow: 'hidden', marginBottom: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: backPreview ? 140 : 'auto', padding: backPreview ? 0 : '18px 20px', gap: 9 }}>
          {backPreview ? (
            <div style={{ position: 'relative', width: '100%' }}>
              <img src={backPreview} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
              {backScanning && <ScanOverlay label="Reading back cover…" />}
              {!backScanning && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(44,38,34,.72)', padding: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#F7F5F1' }}>✓ Back cover added · tap to change</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#F1ECE3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A39B90" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#7C756C' }}>{mobile ? 'Take a photo of back cover' : 'Back cover photo'}</div>
              <div style={{ fontSize: 12, color: '#A39B90' }}>AI will read the description</div>
            </>
          )}
        </button>

        <Label>Title</Label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Book title" style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />
        <Label>Author</Label>
        <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author name" style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />
        <Label>Description</Label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="A few words about this book…" rows={3} style={{ ...inputStyle, resize: 'none' }} onFocus={focusBorder} onBlur={blurBorder} />
        <Label>Topic</Label>
        <div style={{ position: 'relative', marginBottom: 18 }}>
          <select value={topic} onChange={e => setTopic(e.target.value)} style={{ ...inputStyle, appearance: 'none', marginBottom: 0 }}>
            {TOPICS.map(t => <option key={t}>{t}</option>)}
          </select>
          <ChevDown />
        </div>
        <Label>Borrowing status</Label>
        <StatusPicker status={status} setStatus={setStatus} />
        {error && <div style={{ color: '#B24A3A', fontSize: 14, marginTop: 8 }}>{error}</div>}
      </div>

      <div style={{ padding: '14px 22px 30px', background: '#F7F5F1', borderTop: '1px solid #ECE7DE' }}>
        <button onClick={handleSave} disabled={!canSave} style={{ width: '100%', border: 'none', borderRadius: 16, padding: 17, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 17, color: '#F7F5F1', background: canSave ? '#C05A3E' : '#E3B5A8', cursor: canSave ? 'pointer' : 'not-allowed' }}>
          {saving ? 'Saving…' : 'Save book'}
        </button>
      </div>
    </div>
  )
}

function ScanOverlay({ label }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(44,38,34,.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <div style={{ width: 24, height: 24, border: '3px solid rgba(247,245,241,.35)', borderTopColor: '#F7F5F1', borderRadius: '50%', animation: 'fl-spin 0.7s linear infinite' }} />
      <div style={{ fontSize: 12, fontWeight: 600, color: '#F7F5F1' }}>{label}</div>
    </div>
  )
}

function StatusPicker({ status, setStatus }) {
  return (
    <div style={{ display: 'flex', gap: 9, marginBottom: 8 }}>
      {Object.entries(STATUS).map(([key, s]) => {
        const on = status === key
        return (
          <button key={key} onClick={() => setStatus(key)} style={{ flex: 1, border: `1.5px solid ${on ? s.color : '#E7E1D6'}`, background: on ? s.bg : '#FFFFFF', borderRadius: 13, padding: '13px 6px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: on ? s.color : '#7C756C' }}>{s.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function PhotoIcon() {
  return (
    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F1ECE3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#C05A3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
    </div>
  )
}

function BarcodeIcon({ color = '#C05A3E', size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14" strokeWidth="1.5" />
      <path d="M1 3h4M1 21h4M19 3h4M19 21h4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ChevDown() {
  return <svg style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A39B90" strokeWidth="2.4" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
}

function Label({ children }) { return <div style={{ fontSize: 13, fontWeight: 600, color: '#7C756C', marginBottom: 7 }}>{children}</div> }
function DLabel({ children, style }) { return <div style={{ fontSize: 13, fontWeight: 600, color: '#7C756C', marginBottom: 7, ...style }}>{children}</div> }

const inputStyle = { width: '100%', border: '1.5px solid #E7E1D6', background: '#FFFFFF', borderRadius: 13, padding: '14px 15px', fontFamily: "'Source Sans 3',sans-serif", fontSize: 16, color: '#2C2622', outline: 'none', marginBottom: 18, display: 'block' }
const dinputStyle = { width: '100%', border: '1.5px solid #E7E1D6', background: '#FFFFFF', borderRadius: 12, padding: '13px 15px', fontFamily: "'Source Sans 3',sans-serif", fontSize: 15, color: '#2C2622', outline: 'none', marginBottom: 16, display: 'block' }
const cancelBtnStyle = { flex: 'none', border: '1.5px solid #E7E1D6', background: 'transparent', borderRadius: 14, padding: '15px 24px', fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 15, color: '#6E675C', cursor: 'pointer' }
const saveBtnStyle = { flex: 1, border: 'none', borderRadius: 14, padding: 15, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 16, color: '#F7F5F1' }
const photoLabel = { fontSize: 11, fontWeight: 600, color: '#A39B90', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }
const photoSub = { fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#B4ABA0' }

function focusBorder(e) { e.target.style.borderColor = '#C05A3E' }
function blurBorder(e) { e.target.style.borderColor = '#E7E1D6' }
function f(e) { e.target.style.borderColor = '#C05A3E' }
function b(e) { e.target.style.borderColor = '#E7E1D6' }
