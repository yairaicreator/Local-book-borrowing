import { useState } from 'react'
import { STATUS, TOPICS, avatarPalette, initial } from './lib/utils'
import BookCover from './BookCover'
import NotificationBell from './NotificationBell'

export default function HomeTab({ books, loading, currentUser, onOpenBook, onOpenAdd, onOpenProfile, onShare, onGoToActivity }) {
  const [search, setSearch] = useState('')
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

  const firstName = currentUser.name ? currentUser.name.split(' ')[0] : 'שם'

  function toggleTopic(t) {
    setSelectedTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }
  function toggleUser(id) {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '34px 22px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <button onClick={onOpenProfile} style={{ width: 38, height: 38, borderRadius: '50%', background: '#E7C8A0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 15, color: '#7A4A28', flex: 'none', border: 'none', cursor: 'pointer' }}>
              {initial(currentUser.name)}
            </button>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 22, color: '#B5502E', letterSpacing: '-.01em', lineHeight: 1.15 }}>שלום, {firstName}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
            <button onClick={onShare} title="שתף קישור לאפליקציה" style={{ width: 38, height: 38, borderRadius: '50%', border: '1.5px solid #E7E1D6', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6E675C" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
            </button>
            <NotificationBell currentUser={currentUser} small onGoToActivity={onGoToActivity} anchor="left" />
            <button onClick={onOpenAdd} title="הוסף ספר" style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: '#C05A3E', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F7F5F1" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFFFFF', border: '1.5px solid #E7E1D6', borderRadius: 14, padding: '12px 14px', marginBottom: 14 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A39B90" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש ספרים ומחברים" dir="rtl" style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: "'Source Sans 3',sans-serif", fontSize: 15, color: '#2C2622', width: '100%' }} />
        </div>

        {/* mode toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, background: '#EFEAE1', borderRadius: 12, padding: 4 }}>
          {[['topic', 'לפי נושא'], ['user', 'לפי משתמש']].map(([key, label]) => {
            const on = mode === key
            return (
              <button key={key} onClick={() => setMode(key)} style={{
                flex: 1, border: 'none', cursor: 'pointer', fontFamily: "'Source Sans 3',sans-serif",
                fontWeight: 600, fontSize: 14, padding: '9px 0', borderRadius: 9,
                background: on ? '#FFFFFF' : 'transparent', color: on ? '#2C2622' : '#8A8278',
                boxShadow: on ? '0 1px 4px rgba(40,30,18,.12)' : 'none',
              }}>{label}</button>
            )
          })}
        </div>

        {/* multi-select chips */}
        <div className="fl-scroll" style={{ display: 'flex', gap: 9, overflowX: 'auto' }}>
          {mode === 'topic' ? TOPICS.map(t => {
            const on = selectedTopics.includes(t)
            return (
              <button key={t} onClick={() => toggleTopic(t)} style={{
                flex: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Source Sans 3',sans-serif",
                fontWeight: 600, fontSize: 13.5, padding: '9px 16px', borderRadius: 999,
                background: on ? '#DCE9D3' : '#EFEAE1', color: on ? '#3F6B41' : '#6E675C', whiteSpace: 'nowrap',
              }}>{t}</button>
            )
          }) : ownerList.map(o => {
            const on = selectedUsers.includes(o.id)
            return (
              <button key={o.id} onClick={() => toggleUser(o.id)} style={{
                flex: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Source Sans 3',sans-serif",
                fontWeight: 600, fontSize: 13.5, padding: '9px 16px', borderRadius: 999,
                background: on ? '#DCE9D3' : '#EFEAE1', color: on ? '#3F6B41' : '#6E675C', whiteSpace: 'nowrap',
              }}>{o.name}</button>
            )
          })}
        </div>
      </div>

      <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '6px 0 116px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '60px 30px', color: '#A39B90', fontSize: 15 }}>טוען…</div>}

        {mode === 'topic' && groups.map(group => (
          <BookRow key={group.key} title={group.title} books={group.books} subtitleOwner onOpenBook={onOpenBook} />
        ))}

        {mode === 'user' && groups.map(group => (
          <div key={group.key} style={{ marginTop: 22 }}>
            <UserHeader id={group.key} name={group.ownerName} />
            {group.topics.map(t => (
              <BookRow key={t.key} title={t.title} books={t.books} level={2} onOpenBook={onOpenBook} />
            ))}
          </div>
        ))}

        {homeEmpty && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '70px 40px 0' }}>
            <div style={{ width: 96, height: 96, borderRadius: 28, background: '#F1ECE3', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#C05A3E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
            </div>
            <h2 style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 23, color: '#2C2622', margin: '0 0 8px' }}>המדף של המעגל שלך ריק</h2>
            <p style={{ fontSize: 15, lineHeight: 1.55, color: '#7C756C', margin: '0 0 26px', maxWidth: 260 }}>הוסף את הספר הראשון והתחל לשתף קריאה עם המשפחה והחברים.</p>
            <button onClick={onOpenAdd} style={{ border: 'none', borderRadius: 14, padding: '14px 26px', fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 16, color: '#F7F5F1', background: '#C05A3E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F7F5F1" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              הוסף ספר
            </button>
          </div>
        )}
        {homeNoMatch && (
          <div style={{ textAlign: 'center', padding: '60px 30px', color: '#A39B90', fontSize: 15 }}>לא נמצאו ספרים תואמים.</div>
        )}
      </div>
    </div>
  )
}

function UserHeader({ id, name }) {
  const pal = avatarPalette(id)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 20px 10px' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', background: pal.bg, color: pal.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flex: 'none' }}>{initial(name)}</div>
      <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 17, color: '#2C2622' }}>{name}</div>
    </div>
  )
}

function BookRow({ title, books, subtitleOwner, level = 1, onOpenBook }) {
  const isSub = level === 2
  return (
    <div style={{ marginTop: isSub ? 14 : 18 }}>
      {isSub ? (
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8A6A3A', padding: '0 20px 8px' }}>{title}</div>
      ) : (
        <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 17, color: '#2C2622', padding: '0 20px 12px' }}>{title}</div>
      )}
      <div className="fl-scroll" style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '0 20px 4px' }}>
        {books.map(book => {
          const s = STATUS[book.status] || STATUS.available
          return (
            <div key={book.id} onClick={() => onOpenBook(book)} style={{ width: 140, flex: 'none', cursor: 'pointer' }}>
              <div style={{ position: 'relative', width: 140, height: 150, borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 16px -8px rgba(60,48,30,.35)' }}>
                <BookCover book={book} width={140} height={150} fontSize={15} authorSize={9} />
                <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#FFFFFF', background: s.color, padding: '4px 8px', borderRadius: 999 }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2622', marginTop: 9, lineHeight: 1.25 }}>{book.title}</div>
              <div style={{ fontSize: 12.5, color: '#8A8278', marginTop: 1 }}>
                {subtitleOwner ? `המדף של ${book.Users?.name || ''}` : book.author}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
