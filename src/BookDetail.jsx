import { useState, useEffect } from 'react'
import BookCover from './BookCover'
import { STATUS, avatarPalette, initial } from './lib/utils'
import { supabase } from './lib/supabase'

export default function BookDetail({ book, currentUser, onClose, onBorrow, onEdit }) {
  const [showContact, setShowContact] = useState(false)
  const [inReadingList, setInReadingList] = useState(false)
  const [rlLoading, setRlLoading] = useState(false)
  const [showBack, setShowBack] = useState(false)

  useEffect(() => {
    supabase.from('reading_list')
      .select('id').eq('user_id', currentUser.id).eq('book_id', book.id).maybeSingle()
      .then(({ data }) => setInReadingList(!!data))
  }, [book.id])

  const s = STATUS[book.status] || STATUS.available
  const ownerPal = avatarPalette(book.add_by)
  const isAvail = book.status === 'available'
  const isOwnBook = book.add_by === currentUser.id

  let holderLabel, holderName
  if (book.status === 'borrowed') {
    holderLabel = 'Currently borrowed by'
    holderName = book.borrowed_by_name || '—'
  } else if (book.status === 'unavailable') {
    holderLabel = 'Kept by'
    holderName = (book.Users?.name || 'Owner') + ' · not lending'
  } else {
    holderLabel = 'On the shelf of'
    holderName = book.Users?.name || 'Unknown'
  }

  let borrowBg, borrowInk, borrowLabel, borrowCursor, borrowAction
  if (isOwnBook) {
    borrowBg = '#F0ECE4'; borrowInk = '#A39B90'; borrowCursor = 'not-allowed'
    borrowLabel = 'This is your book'; borrowAction = null
  } else if (!isAvail) {
    borrowBg = '#E9E3D8'; borrowInk = '#A39B90'; borrowCursor = 'not-allowed'
    borrowLabel = book.status === 'borrowed' ? 'Currently Borrowed' : 'Not Available'
    borrowAction = null
  } else {
    borrowBg = '#C05A3E'; borrowInk = '#F7F5F1'; borrowCursor = 'pointer'
    borrowLabel = 'Request to Borrow'
    borrowAction = () => setShowContact(true)
  }

  const ownerName = book.Users?.name || 'the owner'
  const msgText = `Hi ${ownerName}! I'd love to borrow "${book.title}" from your Family Library shelf. Is it available? 📚`
  const ownerPhone = book.Users?.phone?.replace(/\D/g, '')
  const ownerEmail = book.Users?.email

  async function recordBorrow() {
    await supabase.from('borrows').upsert(
      { book_id: book.id, borrower_id: currentUser.id },
      { onConflict: 'book_id,borrower_id' }
    )
    onBorrow(book)
  }

  function openWhatsApp() { window.open(`https://wa.me/${ownerPhone}?text=${encodeURIComponent(msgText)}`, '_blank'); recordBorrow() }
  function openSMS() { window.open(`sms:${ownerPhone}?body=${encodeURIComponent(msgText)}`, '_blank'); recordBorrow() }
  function openEmail() {
    window.open(`mailto:${ownerEmail}?subject=${encodeURIComponent(`Book borrow request: ${book.title}`)}&body=${encodeURIComponent(msgText)}`, '_blank')
    recordBorrow()
  }

  async function toggleReadingList() {
    setRlLoading(true)
    if (inReadingList) {
      await supabase.from('reading_list').delete().eq('user_id', currentUser.id).eq('book_id', book.id)
      setInReadingList(false)
    } else {
      await supabase.from('reading_list').upsert(
        { user_id: currentUser.id, book_id: book.id, is_read: false },
        { onConflict: 'user_id,book_id' }
      )
      setInReadingList(true)
    }
    setRlLoading(false)
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(40,30,18,.42)',
        animation: 'flFade .2s ease', zIndex: 20,
      }} />

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, top: 46,
        background: '#F7F5F1', borderRadius: '26px 26px 0 0',
        animation: 'flSheetUp .32s cubic-bezier(.22,1,.36,1)',
        zIndex: 21, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 -16px 40px -16px rgba(40,30,18,.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px 6px', position: 'relative' }}>
          <div style={{ width: 38, height: 5, borderRadius: 3, background: '#DDD6CA', margin: '0 auto' }} />
          <button onClick={onClose} style={{
            position: 'absolute', right: 16, top: 14, width: 32, height: 32,
            borderRadius: '50%', border: 'none', background: '#F0ECE4', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6E675C" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 24px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 22 }}>
            {showBack && book.back_image_url
              ? <img src={book.back_image_url} alt="back cover" style={{ width: 176, height: 250, objectFit: 'cover', borderRadius: 10, boxShadow: '0 4px 16px -6px rgba(40,30,18,.35)' }} />
              : <BookCover book={book} width={176} height={250} fontSize={23} authorSize={11} />
            }
            {book.back_image_url && (
              <button onClick={() => setShowBack(v => !v)} style={{ marginTop: 10, border: '1.5px solid #E7E1D6', background: '#F7F5F1', borderRadius: 20, padding: '5px 14px', fontSize: 13, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, color: '#7C756C', cursor: 'pointer' }}>
                {showBack ? '← עטיפה קדמית' : 'עטיפה אחורית →'}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{
              fontSize: 13, fontWeight: 600, color: s.color, background: s.bg,
              padding: '5px 11px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />{s.label}
            </span>
            {book.topic && (
              <span style={{ fontSize: 13, fontWeight: 600, color: '#8A6A3A', background: '#F3ECDD', padding: '5px 11px', borderRadius: 999 }}>
                {book.topic}
              </span>
            )}
          </div>

          <h2 style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 27, lineHeight: 1.15, color: '#2C2622', margin: '0 0 5px' }}>
            {book.title}
          </h2>
          <div style={{ fontSize: 16, color: '#7C756C', marginBottom: 18 }}>by {book.author}</div>

          {book.description && (
            <p style={{ fontSize: 16, lineHeight: 1.6, color: '#4A443D', margin: '0 0 18px' }}>{book.description}</p>
          )}

          <div style={{
            display: 'flex', alignItems: 'center', gap: 11,
            background: '#FFFFFF', border: '1.5px solid #ECE7DE', borderRadius: 14, padding: '13px 15px',
            marginBottom: 18,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', background: ownerPal.bg, color: ownerPal.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flex: 'none',
            }}>
              {initial(book.Users?.name)}
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#A39B90' }}>{holderLabel}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#2C2622' }}>{holderName}</div>
            </div>
          </div>

          {!isOwnBook && (
            <button onClick={toggleReadingList} disabled={rlLoading} style={{
              width: '100%', border: `1.5px solid ${inReadingList ? '#C05A3E' : '#E7E1D6'}`,
              background: inReadingList ? '#FBF0EB' : '#FFFFFF',
              borderRadius: 13, padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              cursor: 'pointer', fontFamily: "'Source Sans 3',sans-serif",
              fontWeight: 600, fontSize: 14,
              color: inReadingList ? '#C05A3E' : '#6E675C',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke={inReadingList ? '#C05A3E' : '#A39B90'} strokeWidth="2.2" strokeLinecap="round">
                {inReadingList ? <path d="M5 13l4 4L19 7" /> : <path d="M12 5v14M5 12h14" />}
              </svg>
              {inReadingList ? 'Saved to Reading List' : 'Add to Reading List'}
            </button>
          )}
        </div>

        <div style={{ padding: '14px 24px 30px', background: '#F7F5F1', borderTop: '1px solid #ECE7DE' }}>
          {isOwnBook && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1, fontSize: 13, color: '#A39B90', display: 'flex', alignItems: 'center' }}>
                הוספת ספר זה — אחרים יכולים לשאול ממך.
              </div>
              {onEdit && (
                <button onClick={() => onEdit(book)} style={{ flexShrink: 0, border: '1.5px solid #E7E1D6', background: '#F7F5F1', borderRadius: 12, padding: '8px 16px', fontSize: 14, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, color: '#6E675C', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  ערוך
                </button>
              )}
            </div>
          )}
          <button onClick={borrowAction || undefined} disabled={!borrowAction} style={{
            width: '100%', border: 'none', borderRadius: 16, padding: 17,
            fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 17,
            color: borrowInk, background: borrowBg, cursor: borrowCursor,
          }}>
            {borrowLabel}
          </button>
        </div>
      </div>

      {showContact && (
        <>
          <div onClick={() => setShowContact(false)} style={{
            position: 'absolute', inset: 0, background: 'rgba(40,30,18,.5)', zIndex: 40,
            animation: 'flFade .15s ease',
          }} />
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            background: '#F7F5F1', borderRadius: '26px 26px 0 0',
            zIndex: 41, padding: '22px 24px 36px',
            animation: 'flSheetUp .28s cubic-bezier(.22,1,.36,1)',
            boxShadow: '0 -12px 32px -12px rgba(40,30,18,.4)',
          }}>
            <div style={{ width: 38, height: 5, borderRadius: 3, background: '#DDD6CA', margin: '0 auto 20px' }} />
            <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 20, color: '#2C2622', marginBottom: 6 }}>
              Contact {ownerName}
            </div>
            <div style={{ fontSize: 14, color: '#7C756C', marginBottom: 22 }}>
              Choose how to send your borrow request:
            </div>

            {ownerPhone ? (<>
              <ContactBtn icon="💬" label="WhatsApp" sub={book.Users?.phone} onClick={openWhatsApp} color="#25D366" />
              <ContactBtn icon="📱" label="SMS" sub={book.Users?.phone} onClick={openSMS} color="#5A7FE0" />
            </>) : (
              <div style={{ fontSize: 14, color: '#A39B90', marginBottom: 14, fontStyle: 'italic' }}>
                {ownerName} hasn't added a phone number.
              </div>
            )}

            {ownerEmail ? (
              <ContactBtn icon="✉️" label="Email" sub={book.Users?.email} onClick={openEmail} color="#C05A3E" />
            ) : (
              <div style={{ fontSize: 14, color: '#A39B90', marginBottom: 14, fontStyle: 'italic' }}>
                {ownerName} hasn't added an email address.
              </div>
            )}

            <button onClick={() => setShowContact(false)} style={{
              marginTop: 18, width: '100%', border: '1.5px solid #E7E1D6',
              background: 'transparent', borderRadius: 14, padding: 14,
              fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 16,
              color: '#6E675C', cursor: 'pointer',
            }}>Cancel</button>
          </div>
        </>
      )}
    </>
  )
}

function ContactBtn({ icon, label, sub, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', border: '1.5px solid #ECE7DE', background: '#FFFFFF',
      borderRadius: 14, padding: '14px 16px', marginBottom: 10,
      display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left',
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flex: 'none' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, color: '#2C2622' }}>{label}</div>
        <div style={{ fontSize: 13, color: '#A39B90', marginTop: 1 }}>{sub}</div>
      </div>
      <svg style={{ marginLeft: 'auto' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CFC8BB" strokeWidth="2.2" strokeLinecap="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  )
}
