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
  const [error, setError] = useState('')
  const fileRef = useRef()

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
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
      position: 'absolute', inset: 0, background: '#F5F0E6',
      animation: 'flFade .22s ease', zIndex: 30,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '58px 18px 14px', borderBottom: '1px solid #E8DFCC' }}>
        <button onClick={onClose} style={{
          width: 34, height: 34, borderRadius: '50%', border: 'none',
          background: '#EAE2D0', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#7A6F58" strokeWidth="2.4" strokeLinecap="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 21, color: '#33291C' }}>Add a book</div>
      </div>

      {/* form */}
      <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 30px' }}>
        {/* photo upload */}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        <button onClick={() => fileRef.current.click()} style={{
          width: '100%', border: '1.6px dashed #CFC4AC', background: '#FBF7EE',
          borderRadius: 18, padding: imagePreview ? 0 : 26,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9,
          cursor: 'pointer', marginBottom: 22, overflow: 'hidden',
          minHeight: imagePreview ? 180 : 'auto',
        }}>
          {imagePreview ? (
            <img src={imagePreview} alt="cover preview"
              style={{ width: '100%', height: 180, objectFit: 'cover' }} />
          ) : (
            <>
              <div style={{ width: 50, height: 50, borderRadius: 14, background: '#EFE6D3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B45A3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#33291C' }}>Add a cover photo</div>
              <div style={{ fontSize: 13, color: '#A8997E' }}>Take a photo or choose from gallery</div>
            </>
          )}
        </button>

        {/* title */}
        <Label>Title</Label>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Book title" style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />

        {/* author */}
        <Label>Author</Label>
        <input value={author} onChange={e => setAuthor(e.target.value)}
          placeholder="Author name" style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />

        {/* description */}
        <Label>Description</Label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="A few words about this book…" rows={3}
          style={{ ...inputStyle, resize: 'none' }} onFocus={focusBorder} onBlur={blurBorder} />

        {/* topic */}
        <Label>Topic</Label>
        <div style={{ position: 'relative', marginBottom: 18 }}>
          <select value={topic} onChange={e => setTopic(e.target.value)}
            style={{ ...inputStyle, appearance: 'none', marginBottom: 0 }}>
            {TOPICS.map(t => <option key={t}>{t}</option>)}
          </select>
          <svg style={{ position: 'absolute', right: 15, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8997E" strokeWidth="2.4" strokeLinecap="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>

        {/* status */}
        <Label>Borrowing status</Label>
        <div style={{ display: 'flex', gap: 9, marginBottom: 8 }}>
          {Object.entries(STATUS).map(([key, s]) => {
            const on = status === key
            return (
              <button key={key} onClick={() => setStatus(key)} style={{
                flex: 1, border: `1.5px solid ${on ? s.color : '#E2D9C6'}`,
                background: on ? s.bg : '#FFFCF5', borderRadius: 13, padding: '13px 6px',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: on ? s.color : '#8A7F6B' }}>{s.label}</span>
              </button>
            )
          })}
        </div>

        {error && <div style={{ color: '#B24A3A', fontSize: 14, marginTop: 8 }}>{error}</div>}
      </div>

      {/* footer */}
      <div style={{ padding: '14px 22px 30px', background: '#F5F0E6', borderTop: '1px solid #E8DFCC' }}>
        <button onClick={handleSave} disabled={!canSave} style={{
          width: '100%', border: 'none', borderRadius: 16, padding: 17,
          fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 17,
          color: '#F5F0E6', background: canSave ? '#B45A3C' : '#D9B7A6',
          cursor: canSave ? 'pointer' : 'not-allowed',
        }}>
          {saving ? 'Saving…' : 'Save book'}
        </button>
      </div>
    </div>
  )
}

function Label({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 600, color: '#8A7F6B', marginBottom: 7 }}>{children}</div>
}

const inputStyle = {
  width: '100%', border: '1.5px solid #E2D9C6', background: '#FFFCF5',
  borderRadius: 13, padding: '14px 15px',
  fontFamily: "'Source Sans 3',sans-serif", fontSize: 16, color: '#33291C',
  outline: 'none', marginBottom: 18, display: 'block',
}

function focusBorder(e) { e.target.style.borderColor = '#B45A3C' }
function blurBorder(e) { e.target.style.borderColor = '#E2D9C6' }
