import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { STATUS } from './lib/utils'
import BookCover from './BookCover'

export default function ShelfTabDesktop({ currentUser, books, loading, onOpenBook, showToast }) {
  const [lentOut, setLentOut] = useState([])
  const [reminding, setReminding] = useState(null)

  const fetchLentOut = useCallback(async () => {
    const { data } = await supabase
      .from('borrows')
      .select('*, Books!inner(id, title, add_by), Users!borrower_id(name)')
      .eq('Books.add_by', currentUser.id)
      .eq('status', 'borrowed')
      .order('created_at', { ascending: false })
    setLentOut(data || [])
  }, [currentUser.id])

  useEffect(() => { fetchLentOut() }, [fetchLentOut])

  async function remind(lb) {
    setReminding(lb.id)
    await supabase.from('Notifications').insert({
      recipient_id: lb.borrower_id,
      sender_id: currentUser.id,
      book_id: lb.book_id,
      message: `תזכורת: ${currentUser.name || 'מישהו'} מזכיר/ה לך להחזיר את "${lb.Books?.title}"`,
    })
    showToast(`תזכורת נשלחה ל${lb.Users?.name || 'השואל'}`)
    setReminding(null)
  }

  const myBooks = books.filter(b => b.add_by === currentUser.id)
  const myShelfEmpty = myBooks.length === 0 && !loading

  return (
    <>
      {lentOut.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#8A6A3A" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5z" /></svg>
            <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 20, color: '#2C2622' }}>מושאל החוצה</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
            {lentOut.map(lb => (
              <div key={lb.id} style={{ display: 'flex', alignItems: 'center', gap: 13, background: '#FFFFFF', border: '1.5px solid #ECE7DE', borderRadius: 14, padding: 12 }}>
                <BookCover book={books.find(b => b.id === lb.book_id) || { id: lb.book_id, title: lb.Books?.title, author: '' }} width={52} height={52} fontSize={11} authorSize={8} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: '#2C2622', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lb.Books?.title}</div>
                  <div style={{ fontSize: 13, color: '#8A8278', marginTop: 1 }}>אצל <span style={{ color: '#C05A3E', fontWeight: 600 }}>{lb.Users?.name}</span></div>
                </div>
                <button onClick={() => remind(lb)} disabled={reminding === lb.id} style={{ flex: 'none', border: '1.5px solid #E7E1D6', background: '#FBFAF7', borderRadius: 10, padding: '8px 12px', fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 12.5, color: '#6E675C', cursor: 'pointer' }}>
                  {reminding === lb.id ? '…' : 'תזכורת'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#8A6A3A" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5.5C2 4.7 2.7 4 3.5 4H10a2 2 0 0 1 2 2v14.5C12 19.3 10.8 18 9 18H2z" /><path d="M22 5.5c0-.8-.7-1.5-1.5-1.5H14a2 2 0 0 0-2 2v14.5c0-1.2 1.2-2.5 3-2.5h7z" /></svg>
          <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 20, color: '#2C2622' }}>כל הספרים שלי</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(168px,1fr))', gap: '26px 22px' }}>
          {myBooks.map(book => {
            const s = STATUS[book.status] || STATUS.available
            return (
              <div key={book.id} onClick={() => onOpenBook(book)} style={{ cursor: 'pointer' }}>
                <div style={{ position: 'relative', width: '100%', aspectRatio: '128/182', borderRadius: 11, overflow: 'hidden', boxShadow: '0 10px 22px -10px rgba(60,48,30,.42)' }}>
                  <BookCover book={book} width="100%" height="100%" fontSize={18} authorSize={10} />
                  <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#FFFFFF', background: s.color, padding: '4px 8px', borderRadius: 999 }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2622', marginTop: 11, lineHeight: 1.25 }}>{book.title}</div>
                <div style={{ fontSize: 13, color: '#7C756C', lineHeight: 1.3 }}>{book.author}</div>
              </div>
            )
          })}
        </div>
      </div>

      {myShelfEmpty && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '90px 40px 0' }}>
          <div style={{ width: 104, height: 104, borderRadius: 30, background: '#F1ECE3', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 26 }}>
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#C05A3E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
          </div>
          <h2 style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 26, color: '#2C2622', margin: '0 0 9px' }}>המדף שלך ריק</h2>
          <p style={{ fontSize: 16, lineHeight: 1.55, color: '#7C756C', margin: 0, maxWidth: 340 }}>הוסף את הספר הראשון והתחל לשתף קריאה עם המשפחה והחברים.</p>
        </div>
      )}
    </>
  )
}
