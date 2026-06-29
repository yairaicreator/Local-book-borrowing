import { useState, useRef } from 'react'
import { supabase } from './lib/supabase'
import { STATUS, TOPICS } from './lib/utils'
import { scanImageText, wordsToLines, detectTopic } from './lib/scanner'

export default function AddBook({ currentUser, onClose, onSaved, desktop = false }) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [topic, setTopic] = useState(TOPICS[0])
  const [status, setStatus] = useState('available')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [backScanning, setBackScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const frontRef = useRef()
  const backRef = useRef()

  async function handleFrontChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setScanning(true)
    try {
      const words = await scanImageText(file)
      if (words.length > 0) {
        const lines = wordsToLines(words)
        if (lines.length >= 2) {
          if (!title) setTitle(lines.slice(0, lines.length - 1).join(' '))
          if (!author) setAuthor(lines[lines.length - 1])
        } else if (lines.length === 1) {
          if (!title) setTitle(lines[0])
        }
        const guessed = detectTopic(words.map(w => w.text).join(' '))
        if (guessed) setTopic(guessed)
      }
    } catch { /* silent */ }
    finally { setScanning(false) }
  }

  async function handleBackChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setBackScanning(true)
    try {
      const words = await scanImageText(file)
      if (words.length > 0) {
        const lines = wordsToLines(words)
        const text = lines.join(' ')
        if (!description) setDescription(text)
        if (!detectTopic(topic)) {
          const guessed = detectTopic(text)
          if (guessed) setTopic(guessed)
        }
      }
    } catch { /* silent */ }
    finally { setBackScanning(false) }
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
    // ── Desktop modal layout ──
    return (
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(40,30,18,.46)',
        zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'flFade .2s ease', padding: 40,
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          width: 680, maxWidth: '100%', maxHeight: '90vh',
          background: '#F7F5F1', borderRadius: 22, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 30px 70px -20px rgba(40,30,18,.55)',
          animation: 'flPop .26s cubic-bezier(.22,1,.36,1)',
        }}>
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

                {/* front cover */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#A39B90', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Front cover</div>
                  <button onClick={() => frontRef.current.click()} style={{
                    width: 150, border: '1.6px dashed #D8D1C4', background: '#FBFAF7',
                    borderRadius: 14, padding: imagePreview ? 0 : '18px 12px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    cursor: 'pointer', aspectRatio: '128/182', justifyContent: 'center', overflow: 'hidden',
                  }}>
                    {imagePreview ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <img src={imagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        {scanning && <ScanOverlay label="Reading…" />}
                      </div>
                    ) : (
                      <>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F1ECE3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#C05A3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#2C2622', textAlign: 'center' }}>Add a cover</div>
                        <div style={{ fontSize: 11, color: '#A39B90', textAlign: 'center' }}>Scans title & author</div>
                      </>
                    )}
                  </button>
                </div>

                {/* back cover */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#A39B90', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Back cover <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></div>
                  <BackPhotoBtn onClick={() => backRef.current.click()} scanning={backScanning} />
                </div>
              </div>

              {/* fields column */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <DLabel>Title</DLabel>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Book title" style={dinputStyle} onFocus={f} onBlur={b} />
                <DLabel>Author</DLabel>
                <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author name" style={dinputStyle} onFocus={f} onBlur={b} />
                <DLabel>Topic</DLabel>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <select value={topic} onChange={e => setTopic(e.target.value)} style={{ ...dinputStyle, appearance: 'none', marginBottom: 0 }}>
                    {TOPICS.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <svg style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A39B90" strokeWidth="2.4" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
              </div>
            </div>

            <DLabel style={{ marginTop: 6 }}>Description</DLabel>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="A few words about this book…" rows={3}
              style={{ ...dinputStyle, resize: 'none' }} onFocus={f} onBlur={b} />

            <DLabel>Borrowing status</DLabel>
            <div style={{ display: 'flex', gap: 10 }}>
              {Object.entries(STATUS).map(([key, s]) => {
                const on = status === key
                return (
                  <button key={key} onClick={() => setStatus(key)} style={{
                    flex: 1, border: `1.5px solid ${on ? s.color : '#E7E1D6'}`,
                    background: on ? s.bg : '#FFFFFF', borderRadius: 12, padding: '13px 6px',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: on ? s.color : '#7C756C' }}>{s.label}</span>
                  </button>
                )
              })}
            </div>
            {error && <div style={{ color: '#B24A3A', fontSize: 14, marginTop: 10 }}>{error}</div>}
          </div>

          <div style={{ padding: '18px 30px 24px', borderTop: '1px solid #ECE7DE', display: 'flex', gap: 12 }}>
            <button onClick={onClose} style={{ flex: 'none', border: '1.5px solid #E7E1D6', background: 'transparent', borderRadius: 14, padding: '15px 24px', fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 15, color: '#6E675C', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={!canSave} style={{ flex: 1, border: 'none', borderRadius: 14, padding: 15, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 16, color: '#F7F5F1', background: canSave ? '#C05A3E' : '#E3B5A8', cursor: canSave ? 'pointer' : 'not-allowed' }}>
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
        <input ref={frontRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFrontChange} />
        <input ref={backRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBackChange} />

        {/* front cover */}
        <div style={{ fontSize: 11, fontWeight: 600, color: '#A39B90', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Front cover — scans title &amp; author</div>
        <button onClick={() => frontRef.current.click()} style={{
          width: '100%', border: '1.6px dashed #D8D1C4', background: '#FBFAF7',
          borderRadius: 18, padding: imagePreview ? 0 : 26,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9,
          cursor: 'pointer', marginBottom: 10, overflow: 'hidden', minHeight: imagePreview ? 180 : 'auto',
        }}>
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
              <div style={{ fontSize: 15, fontWeight: 600, color: '#2C2622' }}>Front cover photo</div>
              <div style={{ fontSize: 13, color: '#A39B90' }}>AI will extract title &amp; author</div>
            </>
          )}
        </button>

        {/* back cover */}
        <div style={{ fontSize: 11, fontWeight: 600, color: '#A39B90', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Back cover <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional — scans description)</span></div>
        <div style={{ marginBottom: 22 }}>
          <BackPhotoBtn onClick={() => backRef.current.click()} scanning={backScanning} fullWidth />
        </div>

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
          <svg style={{ position: 'absolute', right: 15, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A39B90" strokeWidth="2.4" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
        </div>
        <Label>Borrowing status</Label>
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

function BackPhotoBtn({ onClick, scanning, fullWidth }) {
  return (
    <button onClick={onClick} style={{
      width: fullWidth ? '100%' : 150, border: '1.6px dashed #D8D1C4', background: '#FBFAF7',
      borderRadius: fullWidth ? 14 : 12, padding: '14px 12px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      cursor: 'pointer', position: 'relative', overflow: 'hidden',
    }}>
      {scanning ? (
        <>
          <div style={{ width: 18, height: 18, border: '2.5px solid #DDD6CA', borderTopColor: '#C05A3E', borderRadius: '50%', animation: 'fl-spin 0.7s linear infinite' }} />
          <span style={{ fontSize: 13, color: '#A39B90' }}>Scanning back…</span>
        </>
      ) : (
        <>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#A39B90" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
          <span style={{ fontSize: 13, color: '#7C756C', fontWeight: 600 }}>Back cover photo</span>
          <span style={{ fontSize: 12, color: '#A39B90' }}>→ description</span>
        </>
      )}
    </button>
  )
}

function Label({ children }) { return <div style={{ fontSize: 13, fontWeight: 600, color: '#7C756C', marginBottom: 7 }}>{children}</div> }
function DLabel({ children, style }) { return <div style={{ fontSize: 13, fontWeight: 600, color: '#7C756C', marginBottom: 7, ...style }}>{children}</div> }

const inputStyle = { width: '100%', border: '1.5px solid #E7E1D6', background: '#FFFFFF', borderRadius: 13, padding: '14px 15px', fontFamily: "'Source Sans 3',sans-serif", fontSize: 16, color: '#2C2622', outline: 'none', marginBottom: 18, display: 'block' }
const dinputStyle = { width: '100%', border: '1.5px solid #E7E1D6', background: '#FFFFFF', borderRadius: 12, padding: '13px 15px', fontFamily: "'Source Sans 3',sans-serif", fontSize: 15, color: '#2C2622', outline: 'none', marginBottom: 16, display: 'block' }

function focusBorder(e) { e.target.style.borderColor = '#C05A3E' }
function blurBorder(e) { e.target.style.borderColor = '#E7E1D6' }
function f(e) { e.target.style.borderColor = '#C05A3E' }
function b(e) { e.target.style.borderColor = '#E7E1D6' }
