import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { STATUS } from './lib/utils'
import BookCover from './BookCover'

export default function ShelfTab({ currentUser, books, loading, onOpenBook, onOpenAdd, showToast }) {
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
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '54px 22px 16px' }}>
        <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 26, color: '#2C2622' }}>המדף שלי</div>
        <div style={{ fontSize: 14, color: '#8A8278', marginTop: 3 }}>{myBooks.length} ספרים משותפים עם המעגל שלך</div>
      </div>

      <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 0 116px' }}>
        {lentOut.length > 0 && (
          <div style={{ padding: '0 22px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8A6A3A" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5z" /></svg>
              <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 18, color: '#2C2622' }}>מושאל החוצה</div>
            </div>
            {lentOut.map(lb => (
              <div key={lb.id} style={{ display: 'flex', alignItems: 'center', gap: 13, background: '#FFFFFF', border: '1.5px solid #ECE7DE', borderRadius: 14, padding: 11, marginBottom: 10 }}>
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
        )}

        <div style={{ padding: '8px 22px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8A6A3A" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5.5C2 4.7 2.7 4 3.5 4H10a2 2 0 0 1 2 2v14.5C12 19.3 10.8 18 9 18H2z" /><path d="M22 5.5c0-.8-.7-1.5-1.5-1.5H14a2 2 0 0 0-2 2v14.5c0-1.2 1.2-2.5 3-2.5h7z" /></svg>
            <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 18, color: '#2C2622' }}>כל הספרים שלי</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {myBooks.map(book => {
              const s = STATUS[book.status] || STATUS.available
              return (
                <div key={book.id} onClick={() => onOpenBook(book)} style={{ cursor: 'pointer' }}>
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1.05', borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 16px -8px rgba(60,48,30,.3)' }}>
                    <BookCover book={book} width="100%" height="100%" fontSize={17} authorSize={10} />
                    <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#FFFFFF', background: s.color, padding: '4px 8px', borderRadius: 999 }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2622', marginTop: 9, lineHeight: 1.25 }}>{book.title}</div>
                  <div style={{ fontSize: 12.5, color: '#8A8278', marginTop: 1 }}>{book.author}</div>
                </div>
              )
            })}
          </div>
        </div>

        {myShelfEmpty && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '60px 40px 0' }}>
            <div style={{ width: 96, height: 96, borderRadius: 28, background: '#F1ECE3', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#C05A3E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
            </div>
            <h2 style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 23, color: '#2C2622', margin: '0 0 8px' }}>המדף שלך ריק</h2>
            <p style={{ fontSize: 15, lineHeight: 1.55, color: '#7C756C', margin: '0 0 26px', maxWidth: 260 }}>הוסף את הספר הראשון והתחל לשתף קריאה עם המשפחה והחברים.</p>
            <button onClick={onOpenAdd} style={{ border: 'none', borderRadius: 14, padding: '14px 26px', fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 16, color: '#F7F5F1', background: '#C05A3E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F7F5F1" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              הוסף ספר
            </button>
          </div>
        )}
      </div>

      <button onClick={onOpenAdd} style={{ position: 'absolute', right: 20, bottom: 96, width: 58, height: 58, border: 'none', borderRadius: 19, background: '#C05A3E', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 26px -8px rgba(180,90,60,.7)' }}>
        <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="#F7F5F1" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  )
}
