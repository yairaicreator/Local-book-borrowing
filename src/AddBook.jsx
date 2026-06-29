import { useState, useRef } from 'react'
import { supabase } from './lib/supabase'
import { STATUS, TOPICS } from './lib/utils'

export default function AddBook({ currentUser, onClose, onSaved }) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [topic, setTopic] = useState(TOPICS[0])
  const [status, setStatus] = useState('available')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    // Auto-extract text from cover image
    setScanning(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await fetch('https://api.api-ninjas.com/v1/imagetotext', {
        method: 'POST',
        headers: { 'X-Api-Key': 'XuOE7YjWxnwu45Onz77nqO67MmDDcBqJ6IyVnH3p' },
        body: formData,
      })
      if (res.ok) {
        const words = await res.json() // [{ text, bounding_box: {x1,y1,x2,y2} }]
        if (Array.isArray(words) && words.length > 0) {
          // Group words into lines by vertical position
          const sorted = [...words].sort((a, b) => a.bounding_box.y1 - b.bounding_box.y1)
          const lines = []
          sorted.forEach(w => {
            const last = lines[lines.length - 1]
            if (last && Math.abs(w.bounding_box.y1 - last.y) < 15) {
              last.words.push(w.text)
            } else {
              lines.push({ y: w.bounding_box.y1, words: [w.text] })
            }
          })
          const textLines = lines.map(l => l.words.join(' '))
          // Heuristic: first line(s) = title, last distinct line = author
          if (textLines.length >= 2) {
            // Last line often has author, first has title
            const possibleAuthor = textLines[textLines.length - 1]
            const possibleTitle = textLines.slice(0, textLines.length - 1).join(' ')
            if (!title) setTitle(possibleTitle)
            if (!author) setAuthor(possibleAuthor)
          } else if (textLines.length === 1) {
            if (!title) setTitle(textLines[0])
          }
        }
      }
    } catch {
      // silently fail — user can fill in manually
    } finally {
      setScanning(false)
    }
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
        const { error: upErr } = await supabase.storage
          .from('book-images')
          .upload(path, imageFile, { upsert: false })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('book-images').getPublicUrl(path)
        image_url = urlData.publicUrl
      }

      const { error: insErr } = await supabase.from('Books').insert({
        title: title.trim(),
        author: author.trim(),
        description: description.trim() || null,
        topic,
        status,
        add_by: currentUser.id,
        image_url,
      })
      if (insErr) throw insErr

      onSaved()
    } catch (e) {
      setError(e.message || 'Something went wrong.')
      setSaving(false)
    }
  }

  const canSave = title.trim() && author.trim() && !saving

  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#F7F5F1',
      animation: 'flFade .22s ease', zIndex: 30,
      display: 'flex', flexDirection: 'column',
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
        <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 21, color: '#2C2622' }}>Add a book</div>
      </div>

      {/* form */}
      <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 30px' }}>
        {/* photo upload */}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        <button onClick={() => fileRef.current.click()} style={{
          width: '100%', border: '1.6px dashed #D8D1C4', background: '#FBFAF7',
          borderRadius: 18, padding: imagePreview ? 0 : 26,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9,
          cursor: 'pointer', marginBottom: 22, overflow: 'hidden',
          minHeight: imagePreview ? 180 : 'auto',
        }}>
          {imagePreview ? (
            <div style={{ position: 'relative', width: '100%' }}>
              <img src={imagePreview} alt="cover preview"
                style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
              {scanning && (
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(44,38,34,.55)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <div style={{ width: 28, height: 28, border: '3px solid rgba(247,245,241,.35)', borderTopColor: '#F7F5F1', borderRadius: '50%', animation: 'fl-spin 0.7s linear infinite' }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#F7F5F1' }}>Reading cover…</div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{ width: 50, height: 50, borderRadius: 14, background: '#F1ECE3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C05A3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#2C2622' }}>Add a cover photo</div>
              <div style={{ fontSize: 13, color: '#A39B90' }}>Take a photo or choose from gallery</div>
            </>
          )}
        </button>

        <Label>Title</Label>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Book title" style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />

        <Label>Author</Label>
        <input value={author} onChange={e => setAuthor(e.target.value)}
          placeholder="Author name" style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />

        <Label>Description</Label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="A few words about this book…" rows={3}
          style={{ ...inputStyle, resize: 'none' }} onFocus={focusBorder} onBlur={blurBorder} />

        <Label>Topic</Label>
        <div style={{ position: 'relative', marginBottom: 18 }}>
          <select value={topic} onChange={e => setTopic(e.target.value)}
            style={{ ...inputStyle, appearance: 'none', marginBottom: 0 }}>
            {TOPICS.map(t => <option key={t}>{t}</option>)}
          </select>
          <svg style={{ position: 'absolute', right: 15, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A39B90" strokeWidth="2.4" strokeLinecap="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>

        <Label>Borrowing status</Label>
        <div style={{ display: 'flex', gap: 9, marginBottom: 8 }}>
          {Object.entries(STATUS).map(([key, s]) => {
            const on = status === key
            return (
              <button key={key} onClick={() => setStatus(key)} style={{
                flex: 1, border: `1.5px solid ${on ? s.color : '#E7E1D6'}`,
                background: on ? s.bg : '#FFFFFF', borderRadius: 13, padding: '13px 6px',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: on ? s.color : '#7C756C' }}>{s.label}</span>
              </button>
            )
          })}
        </div>

        {error && <div style={{ color: '#B24A3A', fontSize: 14, marginTop: 8 }}>{error}</div>}
      </div>

      {/* footer */}
      <div style={{ padding: '14px 22px 30px', background: '#F7F5F1', borderTop: '1px solid #ECE7DE' }}>
        <button onClick={handleSave} disabled={!canSave} style={{
          width: '100%', border: 'none', borderRadius: 16, padding: 17,
          fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 17,
          color: '#F7F5F1', background: canSave ? '#C05A3E' : '#E3B5A8',
          cursor: canSave ? 'pointer' : 'not-allowed',
        }}>
          {saving ? 'Saving…' : 'Save book'}
        </button>
      </div>
    </div>
  )
}

function Label({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 600, color: '#7C756C', marginBottom: 7 }}>{children}</div>
}

const inputStyle = {
  width: '100%', border: '1.5px solid #E7E1D6', background: '#FFFFFF',
  borderRadius: 13, padding: '14px 15px',
  fontFamily: "'Source Sans 3',sans-serif", fontSize: 16, color: '#2C2622',
  outline: 'none', marginBottom: 18, display: 'block',
}

function focusBorder(e) { e.target.style.borderColor = '#C05A3E' }
function blurBorder(e) { e.target.style.borderColor = '#E7E1D6' }
