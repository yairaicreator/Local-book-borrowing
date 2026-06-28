import { useState } from 'react'
import BookCover from './BookCover'
import { STATUS, avatarPalette, initial } from './lib/utils'

export default function BookDetail({ book, currentUser, onClose, onBorrow }) {
  const [showContact, setShowContact] = useState(false)

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

  // Bottom button logic
  let borrowBg, borrowInk, borrowLabel, borrowCursor, borrowAction
  if (isOwnBook) {
    borrowBg = '#EAE2D0'; borrowInk = '#A8997E'; borrowCursor = 'not-allowed'
    borrowLabel = 'This is your book'
    borrowAction = null
  } else if (!isAvail) {
    borrowBg = '#E0D7C4'; borrowInk = '#A8997E'; borrowCursor = 'not-allowed'
    borrowLabel = book.status === 'borrowed' ? 'Currently Borrowed' : 'Not Available'
    borrowAction = null
  } else {
    borrowBg = '#B45A3C'; borrowInk = '#F5F0E6'; borrowCursor = 'pointer'
    borrowLabel = 'Request to Borrow'
    borrowAction = () => setShowContact(true)
  }

  const ownerName = book.Users?.name || 'the owner'
  const msgText = `Hi ${ownerName}! I'd love to borrow "${book.title}" from your Family Library shelf. Is it available? 📚`
  const ownerPhone = book.Users?.phone?.replace(/\D/g, '') // digits only
  const ownerEmail = book.Users?.email

  function openWhatsApp() {
    const url = `https://wa.me/${ownerPhone}?text=${encodeURIComponent(msgText)}`
    window.open(url, '_blank')
    onBorrow(book)
  }

  function openSMS() {
    const url = `sms:${ownerPhone}?body=${encodeURIComponent(msgText)}`
    window.open(url, '_blank')
    onBorrow(book)
  }

  function openEmail() {
    const subject = encodeURIComponent(`Book borrow request: ${book.title}`)
    const body = encodeURIComponent(msgText)
    window.open(`mailto:${ownerEmail}?subject=${subject}&body=${body}`, '_blank')
    onBorrow(book)
  }

  return (
    <>
      {/* overlay */}
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(40,30,18,.42)',
        animation: 'flFade .2s ease', zIndex: 20,
      }} />

      {/* sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, top: 46,
        background: '#F5F0E6', borderRadius: '26px 26px 0 0',
        animation: 'flSheetUp .32s cubic-bezier(.22,1,.36,1)',
        zIndex: 21, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 -16px 40px -16px rgba(40,30,18,.4)',
      }}>
        {/* handle row */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px 6px', position: 'relative' }}>
          <div style={{ width: 38, height: 5, borderRadius: 3, background: '#D8CDB6', margin: '0 auto' }} />
          <button onClick={onClose} style={{
            position: 'absolute', right: 16, top: 14,
            width: 32, height: 32, borderRadius: '50%', border: 'none',
            background: '#EAE2D0', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A6F58" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* scroll content */}
        <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 24px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
            <BookCover book={book} width={176} height={250} fontSize={23} authorSize={11} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{
              fontSize: 13, fontWeight: 600, color: s.color, background: s.bg,
              padding: '5px 11px', borderRadius: 999,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />
              {s.label}
            </span>
            {book.topic && (
              <span style={{ fontSize: 13, fontWeight: 600, color: '#8A6A3A', background: '#F1E7D2', padding: '5px 11px', borderRadius: 999 }}>
                {book.topic}
              </span>
            )}
          </div>

          <h2 style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 27, lineHeight: 1.15, color: '#33291C', margin: '0 0 5px' }}>
            {book.title}
          </h2>
          <div style={{ fontSize: 16, color: '#8A7F6B', marginBottom: 18 }}>by {book.author}</div>

          {book.description && (
            <p style={{ fontSize: 16, lineHeight: 1.6, color: '#54493A', margin: '0 0 18px' }}>{book.description}</p>
          )}

          <div style={{
            display: 'flex', alignItems: 'center', gap: 11,
            background: '#FFFCF5', border: '1.5px solid #E8DFCC', borderRadius: 14, padding: '13px 15px',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: ownerPal.bg, color: ownerPal.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 14, flex: 'none',
            }}>
              {initial(book.Users?.name)}
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#A8997E' }}>{holderLabel}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#33291C' }}>{holderName}</div>
            </div>
          </div>
        </div>

        {/* footer button */}
        <div style={{ padding: '14px 24px 30px', background: '#F5F0E6', borderTop: '1px solid #E8DFCC' }}>
          {isOwnBook && (
            <div style={{ fontSize: 13, color: '#A8997E', textAlign: 'center', marginBottom: 10 }}>
              You added this book — others can borrow it from you.
            </div>
          )}
          <button
            onClick={borrowAction || undefined}
            disabled={!borrowAction}
            style={{
              width: '100%', border: 'none', borderRadius: 16, padding: 17,
              fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 17,
              color: borrowInk, background: borrowBg, cursor: borrowCursor,
            }}
          >
            {borrowLabel}
          </button>
        </div>
      </div>

      {/* Contact options sheet */}
      {showContact && (
        <>
          <div onClick={() => setShowContact(false)} style={{
            position: 'absolute', inset: 0, background: 'rgba(40,30,18,.5)', zIndex: 40,
            animation: 'flFade .15s ease',
          }} />
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            background: '#F5F0E6', borderRadius: '26px 26px 0 0',
            zIndex: 41, padding: '22px 24px 36px',
            animation: 'flSheetUp .28s cubic-bezier(.22,1,.36,1)',
            boxShadow: '0 -12px 32px -12px rgba(40,30,18,.4)',
          }}>
            <div style={{ width: 38, height: 5, borderRadius: 3, background: '#D8CDB6', margin: '0 auto 20px' }} />
            <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 20, color: '#33291C', marginBottom: 6 }}>
              Contact {ownerName}
            </div>
            <div style={{ fontSize: 14, color: '#8A7F6B', marginBottom: 22 }}>
              Choose how to send your borrow request:
            </div>

            {ownerPhone ? (
              <>
                <ContactBtn
                  icon="💬"
                  label="WhatsApp"
                  sub={book.Users?.phone}
                  onClick={openWhatsApp}
                  color="#25D366"
                />
                <ContactBtn
                  icon="📱"
                  label="SMS"
                  sub={book.Users?.phone}
                  onClick={openSMS}
                  color="#5A7FE0"
                />
              </>
            ) : (
              <div style={{ fontSize: 14, color: '#A8997E', marginBottom: 14, fontStyle: 'italic' }}>
                {ownerName} hasn't added a phone number.
              </div>
            )}

            {ownerEmail ? (
              <ContactBtn
                icon="✉️"
                label="Email"
                sub={book.Users?.email}
                onClick={openEmail}
                color="#B45A3C"
              />
            ) : (
              <div style={{ fontSize: 14, color: '#A8997E', marginBottom: 14, fontStyle: 'italic' }}>
                {ownerName} hasn't added an email address.
              </div>
            )}

            {!ownerPhone && !ownerEmail && (
              <div style={{
                background: '#FBF7EE', border: '1.5px solid #E8DFCC', borderRadius: 14,
                padding: '16px', fontSize: 14, color: '#8A7F6B', lineHeight: 1.5,
              }}>
                {ownerName} hasn't added contact info yet. Ask them in person to update their profile!
              </div>
            )}

            <button onClick={() => setShowContact(false)} style={{
              marginTop: 18, width: '100%', border: '1.5px solid #E2D9C6',
              background: 'transparent', borderRadius: 14, padding: 14,
              fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600,
              fontSize: 16, color: '#7A6F58', cursor: 'pointer',
            }}>
              Cancel
            </button>
          </div>
        </>
      )}
    </>
  )
}

function ContactBtn({ icon, label, sub, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', border: '1.5px solid #E8DFCC', background: '#FFFCF5',
      borderRadius: 14, padding: '14px 16px', marginBottom: 10,
      display: 'flex', alignItems: 'center', gap: 14,
      cursor: 'pointer', textAlign: 'left',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, background: color + '1A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flex: 'none',
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, color: '#33291C' }}>{label}</div>
        <div style={{ fontSize: 13, color: '#A8997E', marginTop: 1 }}>{sub}</div>
      </div>
      <svg style={{ marginLeft: 'auto' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4BAA8" strokeWidth="2.2" strokeLinecap="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  )
}
