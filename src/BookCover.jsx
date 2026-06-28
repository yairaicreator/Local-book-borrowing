import { coverPalette } from './lib/utils'

export default function BookCover({ book, width = 128, height = 182, fontSize = 16, authorSize = 10 }) {
  const pal = coverPalette(book.id)

  return (
    <div style={{
      position: 'relative', width, height, borderRadius: 10,
      background: book.image_url ? '#E8DFCC' : pal.bg,
      boxShadow: '0 8px 18px -8px rgba(60,48,30,.4)',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: book.image_url ? 0 : '14px 13px',
    }}>
      {book.image_url ? (
        <img src={book.image_url} alt={book.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <>
          <div style={{ position: 'absolute', left: 9, top: 0, bottom: 0, width: 4, background: 'rgba(0,0,0,.13)' }} />
          <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize, lineHeight: 1.15, color: pal.ink, textShadow: '0 1px 1px rgba(0,0,0,.08)', paddingLeft: 8 }}>
            {book.title}
          </div>
          <div style={{ fontSize: authorSize, letterSpacing: '.05em', textTransform: 'uppercase', color: pal.ink, opacity: 0.72, paddingLeft: 8 }}>
            {book.author}
          </div>
        </>
      )}
    </div>
  )
}
