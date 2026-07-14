import { useState } from 'react'
import { STATUS, TOPICS } from './lib/utils'
import BookCover from './BookCover'

export default function HomeTabDesktop({ books, loading, currentUser, search, onOpenBook }) {
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

  const chips = [{ key: 'all', label: 'כל המדף' }, ...TOPICS.map(t => ({ key: t, label: t }))]

  return (
    <>
      <div style={{ display: 'flex', gap: 9, marginBottom: 8 }}>
        {chips.map(c => {
          const on = topicFilter === c.key
          return (
            <button key={c.key} onClick={() => setTopicFilter(c.key)} style={{
              flex: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Source Sans 3',sans-serif",
              fontWeight: 600, fontSize: 13.5, padding: '9px 16px', borderRadius: 999,
              background: on ? '#DCE9D3' : '#EFEAE1', color: on ? '#3F6B41' : '#6E675C',
            }}>{c.label}</button>
          )
        })}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '80px 0', color: '#A39B90' }}>טוען…</div>}

      {topicGroups.map(group => <GroupGrid key={group.title} title={group.title} books={group.books} subtitleOwner onOpenBook={onOpenBook} />)}
      {circleGroups.map(group => <GroupGrid key={group.title} title={group.title} books={group.books} onOpenBook={onOpenBook} />)}

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

function GroupGrid({ title, books, subtitleOwner, onOpenBook }) {
  return (
    <div style={{ marginTop: 30 }}>
      <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 20, color: '#2C2622', marginBottom: 18 }}>{title}</div>
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
