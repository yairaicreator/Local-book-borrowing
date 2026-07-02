import { STATUS, TOPICS, avatarPalette, initial } from './lib/utils'

// Groups books by owner (columns, left→right), then by topic subcategory within each column.
// Text-only — no cover images. Used on both mobile and desktop main pages.
function buildColumns(books) {
  const byUser = {}
  books.forEach(b => {
    const uid = b.add_by
    if (!byUser[uid]) byUser[uid] = { name: b.Users?.name || 'לא ידוע', topics: {} }
    const t = TOPICS.includes(b.topic) ? b.topic : 'אחר'
    if (!byUser[uid].topics[t]) byUser[uid].topics[t] = []
    byUser[uid].topics[t].push(b)
  })
  return Object.entries(byUser).map(([uid, u]) => ({
    key: uid,
    name: u.name,
    total: Object.values(u.topics).reduce((n, arr) => n + arr.length, 0),
    topics: TOPICS.filter(t => u.topics[t]?.length).map(t => ({ name: t, books: u.topics[t] })),
  }))
}

export default function BookBoard({ books, onBookClick, columnWidth = 230 }) {
  const columns = buildColumns(books)

  if (columns.length === 0) return null

  return (
    <div className="fl-scroll" style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '4px 4px 8px' }}>
      {columns.map(col => {
        const pal = avatarPalette(col.key)
        return (
          <div key={col.key} style={{
            flex: 'none', width: columnWidth,
            background: '#FFFFFF', border: '1.5px solid #ECE7DE', borderRadius: 16,
            padding: '16px 14px 18px', display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', background: pal.bg, color: pal.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flex: 'none',
              }}>
                {initial(col.name)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 15, color: '#2C2622', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.name}</div>
              </div>
              <div style={{ fontSize: 12, color: '#A39B90', fontWeight: 600, flex: 'none' }}>{col.total}</div>
            </div>

            {col.topics.map(topic => (
              <div key={topic.name} style={{ marginBottom: 14 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: '#8A6A3A', textTransform: 'uppercase',
                  letterSpacing: '.08em', marginBottom: 6, paddingBottom: 5, borderBottom: '1px solid #F0EBE3',
                }}>
                  {topic.name}
                </div>
                {topic.books.map(book => {
                  const s = STATUS[book.status] || STATUS.available
                  return (
                    <button key={book.id} onClick={() => onBookClick(book)} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 7, width: '100%',
                      border: 'none', background: 'none', cursor: 'pointer', textAlign: 'right',
                      padding: '5px 0', font: 'inherit',
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flex: 'none', marginTop: 6 }} />
                      <span style={{ fontSize: 13, lineHeight: 1.4, color: '#2C2622' }}>
                        {book.title} <span style={{ color: '#A39B90' }}>— {book.author}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
