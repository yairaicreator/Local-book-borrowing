import { useState } from 'react'
import { STATUS, TOPICS, initial } from './lib/utils'
import BookCover from './BookCover'
import NotificationBell from './NotificationBell'

export default function HomeTab({ books, loading, currentUser, onOpenBook, onOpenAdd, onOpenProfile, onShare }) {
  const [search, setSearch] = useState('')
  const [topicFilter, setTopicFilter] = useState('all')

  const q = search.trim().toLowerCase()
  const pool = books.filter(b =>
    (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)) &&
    (topicFilter === 'all' || b.topic === topicFilter)
  )

  const byTopic = {}
  pool.forEach(b => { (byTopic[b.topic] = byTopic[b.topic] || []).push(b) })
  const topicGroups = Object.keys(byTopic).sort().map(t => ({ title: t, books: byTopic[t] }))

  const byOwner = {}
  pool.filter(b => b.add_by !== currentUser.id).forEach(b => {
    (byOwner[b.add_by] = byOwner[b.add_by] || []).push(b)
  })
  const circleGroups = Object.entries(byOwner).map(([uid, bks]) => ({
    title: `המדף של ${bks[0].Users?.name || 'חבר'}`, books: bks,
  }))

  const homeEmpty = books.length === 0 && !loading
  const homeNoMatch = !homeEmpty && !loading && topicGroups.length === 0 && circleGroups.length === 0

  const firstName = currentUser.name ? currentUser.name.split(' ')[0] : 'שם'

  const chips = [{ key: 'all', label: 'כל המדף' }, ...TOPICS.map(t => ({ key: t, label: t }))]

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '54px 22px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 22, color: '#B5502E', letterSpacing: '-.01em', lineHeight: 1.15 }}>שלום, {firstName}</div>
          </div>
          <button onClick={onShare} title="שתף קישור לאפליקציה" style={{ width: 38, height: 38, borderRadius: '50%', border: '1.5px solid #E7E1D6', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6E675C" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
          </button>
          <NotificationBell currentUser={currentUser} small />
          <button onClick={onOpenProfile} style={{ width: 38, height: 38, borderRadius: '50%', background: '#E7C8A0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 15, color: '#7A4A28', flex: 'none', border: 'none', cursor: 'pointer' }}>
            {initial(currentUser.name)}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFFFFF', border: '1.5px solid #E7E1D6', borderRadius: 14, padding: '12px 14px', marginBottom: 14 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A39B90" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש ספרים ומחברים" dir="rtl" style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: "'Source Sans 3',sans-serif", fontSize: 15, color: '#2C2622', width: '100%' }} />
        </div>

        <div className="fl-scroll" style={{ display: 'flex', gap: 9, overflowX: 'auto' }}>
          {chips.map(c => {
            const on = topicFilter === c.key
            return (
              <button key={c.key} onClick={() => setTopicFilter(c.key)} style={{
                flex: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Source Sans 3',sans-serif",
                fontWeight: 600, fontSize: 13.5, padding: '9px 16px', borderRadius: 999,
                background: on ? '#DCE9D3' : '#EFEAE1', color: on ? '#3F6B41' : '#6E675C', whiteSpace: 'nowrap',
              }}>{c.label}</button>
            )
          })}
        </div>
      </div>

      <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '6px 0 116px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '60px 30px', color: '#A39B90', fontSize: 15 }}>טוען…</div>}

        {topicGroups.map(group => (
          <BookRow key={group.title} title={group.title} books={group.books} subtitleOwner onOpenBook={onOpenBook} />
        ))}
        {circleGroups.map(group => (
          <BookRow key={group.title} title={group.title} books={group.books} onOpenBook={onOpenBook} />
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

function BookRow({ title, books, subtitleOwner, onOpenBook }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 17, color: '#2C2622', padding: '0 20px 12px' }}>{title}</div>
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
