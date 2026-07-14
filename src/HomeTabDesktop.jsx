import { useState } from 'react'
import { STATUS, TOPICS, avatarPalette, initial } from './lib/utils'
import BookCover from './BookCover'

export default function HomeTabDesktop({ books, loading, currentUser, search, onOpenBook }) {
  const [mode, setMode] = useState('topic') // 'topic' | 'user'
  const [selectedTopics, setSelectedTopics] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])

  const q = search.trim().toLowerCase()
  const searched = books.filter(b =>
    !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
  )

  const owners = {}
  books.forEach(b => { if (!owners[b.add_by]) owners[b.add_by] = { id: b.add_by, name: b.Users?.name || 'לא ידוע' } })
  const ownerList = Object.values(owners).sort((a, b) => a.name.localeCompare(b.name, 'he'))

  let groups = []
  if (mode === 'topic') {
    const pool = selectedTopics.length ? searched.filter(b => selectedTopics.includes(b.topic)) : searched
    const byTopic = {}
    pool.forEach(b => { (byTopic[b.topic] = byTopic[b.topic] || []).push(b) })
    groups = TOPICS.filter(t => byTopic[t]?.length).map(t => ({ key: t, title: t, books: byTopic[t], subtitleOwner: true }))
  } else {
    const pool = selectedUsers.length ? searched.filter(b => selectedUsers.includes(b.add_by)) : searched
    const byOwner = {}
    pool.forEach(b => { (byOwner[b.add_by] = byOwner[b.add_by] || []).push(b) })
    groups = ownerList.filter(o => byOwner[o.id]?.length).map(o => {
      const byTopic = {}
      byOwner[o.id].forEach(b => { (byTopic[b.topic] = byTopic[b.topic] || []).push(b) })
      return {
        key: o.id, ownerName: o.name,
        topics: TOPICS.filter(t => byTopic[t]?.length).map(t => ({ key: t, title: t, books: byTopic[t] })),
      }
    })
  }

  const homeEmpty = books.length === 0 && !loading
  const homeNoMatch = !homeEmpty && !loading && groups.length === 0

  function toggleTopic(t) {
    setSelectedTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }
  function toggleUser(id) {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <>
      {/* mode toggle */}
      <div style={{ display: 'inline-flex', gap: 6, background: '#EFEAE1', borderRadius: 13, padding: 4, marginBottom: 14 }}>
        {[['topic', 'לפי נושא'], ['user', 'לפי משתמש']].map(([key, label]) => {
          const on = mode === key
          return (
            <button key={key} onClick={() => setMode(key)} style={{
              border: 'none', cursor: 'pointer', fontFamily: "'Source Sans 3',sans-serif",
              fontWeight: 600, fontSize: 14, padding: '9px 20px', borderRadius: 10,
              background: on ? '#FFFFFF' : 'transparent', color: on ? '#2C2622' : '#8A8278',
              boxShadow: on ? '0 1px 4px rgba(40,30,18,.12)' : 'none',
            }}>{label}</button>
          )
        })}
      </div>

      {/* multi-select chips */}
      <div style={{ display: 'flex', gap: 9, marginBottom: 8, flexWrap: 'wrap' }}>
        {mode === 'topic' ? TOPICS.map(t => {
          const on = selectedTopics.includes(t)
          return (
            <button key={t} onClick={() => toggleTopic(t)} style={{
              flex: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Source Sans 3',sans-serif",
              fontWeight: 600, fontSize: 13.5, padding: '9px 16px', borderRadius: 999,
              background: on ? '#DCE9D3' : '#EFEAE1', color: on ? '#3F6B41' : '#6E675C',
            }}>{t}</button>
          )
        }) : ownerList.map(o => {
          const on = selectedUsers.includes(o.id)
          return (
            <button key={o.id} onClick={() => toggleUser(o.id)} style={{
              flex: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Source Sans 3',sans-serif",
              fontWeight: 600, fontSize: 13.5, padding: '9px 16px', borderRadius: 999,
              background: on ? '#DCE9D3' : '#EFEAE1', color: on ? '#3F6B41' : '#6E675C',
            }}>{o.name}</button>
          )
        })}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '80px 0', color: '#A39B90' }}>טוען…</div>}

      {mode === 'topic' && groups.map(group => (
        <GroupGrid key={group.key} title={group.title} books={group.books} subtitleOwner onOpenBook={onOpenBook} />
      ))}

      {mode === 'user' && groups.map(group => (
        <div key={group.key} style={{ marginTop: 34 }}>
          <UserHeader id={group.key} name={group.ownerName} />
          {group.topics.map(t => (
            <GroupGrid key={t.key} title={t.title} books={t.books} level={2} onOpenBook={onOpenBook} />
          ))}
        </div>
      ))}

      {homeEmpty && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '110px 40px 0' }}>
          <div style={{ width: 104, height: 104, borderRadius: 30, background: '#F1ECE3', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 26 }}>
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#C05A3E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
          </div>
          <h2 style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 26, color: '#2C2622', margin: '0 0 9px' }}>המדף של המעגל שלך ריק</h2>
          <p style={{ fontSize: 16, lineHeight: 1.55, color: '#7C756C', margin: 0, maxWidth: 340 }}>הוסף את הספר הראשון והתחל לשתף קריאה עם המשפחה והחברים.</p>
        </div>
      )}
      {homeNoMatch && <div style={{ textAlign: 'center', padding: '110px 30px', color: '#A39B90', fontSize: 16 }}>לא נמצאו ספרים תואמים.</div>}
    </>
  )
}

function UserHeader({ id, name }) {
  const pal = avatarPalette(id)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: pal.bg, color: pal.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flex: 'none' }}>{initial(name)}</div>
      <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 20, color: '#2C2622' }}>{name}</div>
    </div>
  )
}

function GroupGrid({ title, books, subtitleOwner, level = 1, onOpenBook }) {
  const isSub = level === 2
  return (
    <div style={{ marginTop: isSub ? 20 : 30 }}>
      {isSub ? (
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8A6A3A', marginBottom: 14 }}>{title}</div>
      ) : (
        <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 20, color: '#2C2622', marginBottom: 18 }}>{title}</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(168px,1fr))', gap: '26px 22px' }}>
        {books.map(book => {
          const s = STATUS[book.status] || STATUS.available
          return (
            <div key={book.id} onClick={() => onOpenBook(book)} style={{ cursor: 'pointer' }}>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '128/182', borderRadius: 11, overflow: 'hidden', boxShadow: '0 10px 22px -10px rgba(60,48,30,.42)', transition: 'transform .18s, box-shadow .18s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 18px 32px -12px rgba(60,48,30,.5)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 10px 22px -10px rgba(60,48,30,.42)' }}>
                <BookCover book={book} width="100%" height="100%" fontSize={18} authorSize={10} />
                <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#FFFFFF', background: s.color, padding: '4px 8px', borderRadius: 999 }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2622', marginTop: 11, lineHeight: 1.25 }}>{book.title}</div>
              <div style={{ fontSize: 13, color: '#7C756C', lineHeight: 1.3 }}>{subtitleOwner ? `המדף של ${book.Users?.name || ''}` : book.author}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
