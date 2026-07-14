import { useState, useEffect, useCallback } from 'react'
import BookCover from './BookCover'
import { STATUS, TOPIC_LABELS, avatarPalette, initial, isHebrewText } from './lib/utils'
import { supabase } from './lib/supabase'
import { translateToHebrew } from './lib/scanner'

export default function BookDetail({ book, currentUser, onClose, onBorrow, onEdit }) {
  const [showContact, setShowContact] = useState(false)
  const [inReadingList, setInReadingList] = useState(false)
  const [rlLoading, setRlLoading] = useState(false)
  const [showBack, setShowBack] = useState(false)
  const [notifSent, setNotifSent] = useState(false)
  const [showRecommend, setShowRecommend] = useState(false)
  const [recommendTarget, setRecommendTarget] = useState(null)
  const [recommendSent, setRecommendSent] = useState(false)
  const [friends, setFriends] = useState([])
  const [queue, setQueue] = useState([])
  const [joining, setJoining] = useState(false)
  const [translated, setTranslated] = useState(null)
  const [translating, setTranslating] = useState(false)
  const [translateError, setTranslateError] = useState('')
  const [showTranslated, setShowTranslated] = useState(false)

  useEffect(() => {
    supabase.from('reading_list')
      .select('id').eq('user_id', currentUser.id).eq('book_id', book.id).maybeSingle()
      .then(({ data }) => setInReadingList(!!data))
  }, [book.id])

  useEffect(() => {
    supabase.from('Users').select('id, name, phone, email').neq('id', currentUser.id).order('name')
      .then(({ data }) => setFriends(data || []))
  }, [currentUser.id])

  const fetchQueue = useCallback(async () => {
    const { data } = await supabase.from('borrows')
      .select('id, borrower_id, status, created_at, Users!borrower_id(name)')
      .eq('book_id', book.id).order('created_at')
    setQueue(data || [])
  }, [book.id])

  useEffect(() => { fetchQueue() }, [fetchQueue])

  const s = STATUS[book.status] || STATUS.available
  const ownerPal = avatarPalette(book.add_by)
  const isOwnBook = book.add_by === currentUser.id

  const waitlistOnly = queue.filter(q => q.status === 'waitlisted')
  const activeRow = queue.find(q => q.status === 'requested' || q.status === 'borrowed')
  const myRow = queue.find(q => q.borrower_id === currentUser.id)
  const myWaitlistPos = myRow?.status === 'waitlisted' ? waitlistOnly.findIndex(q => q.id === myRow.id) + 1 : null

  let holderLabel, holderName
  if (book.status === 'unavailable') {
    holderLabel = 'נמצא אצל'
    holderName = (book.Users?.name || 'בעלים') + ' · לא להשאלה'
  } else if (activeRow) {
    holderLabel = activeRow.status === 'borrowed' ? 'מושאל כרגע על ידי' : 'מבוקש כרגע על ידי'
    holderName = activeRow.Users?.name || '—'
  } else {
    holderLabel = 'על המדף של'
    holderName = book.Users?.name || 'לא ידוע'
  }

  const canRequest = !isOwnBook && book.status === 'available' && !myRow
  const canJoinWaitlist = !isOwnBook && book.status === 'borrowed' && !myRow
  const myStatusLabel = !isOwnBook && myRow
    ? (myRow.status === 'requested' ? 'הבקשה שלך ממתינה לאישור הבעלים'
      : myRow.status === 'borrowed' ? 'הספר אצלך כרגע'
      : `במקום ${myWaitlistPos} בתור`)
    : null

  const ownerName = book.Users?.name || 'הבעלים'
  const msgText = `שלום ${ownerName}! אשמח לשאול את הספר "${book.title}" ממדף הספרייה המשפחתית שלך. האם הספר זמין? 📚`
  const ownerPhone = book.Users?.phone?.replace(/\D/g, '')
  const ownerEmail = book.Users?.email

  async function requestBorrow() {
    await supabase.from('borrows').upsert(
      { book_id: book.id, borrower_id: currentUser.id, status: 'requested' },
      { onConflict: 'book_id,borrower_id' }
    )
    await supabase.from('Books').update({ status: 'borrowed' }).eq('id', book.id)
    await supabase.from('Notifications').insert({
      recipient_id: book.add_by,
      sender_id: currentUser.id,
      book_id: book.id,
      message: `${currentUser.name || 'מישהו'} ביקש לשאול את "${book.title}"`,
    })
    fetchQueue()
    onBorrow(book)
  }

  async function joinWaitlist() {
    setJoining(true)
    await supabase.from('borrows').upsert(
      { book_id: book.id, borrower_id: currentUser.id, status: 'waitlisted' },
      { onConflict: 'book_id,borrower_id' }
    )
    await supabase.from('Notifications').insert({
      recipient_id: book.add_by,
      sender_id: currentUser.id,
      book_id: book.id,
      message: `${currentUser.name || 'מישהו'} הצטרף/ה לרשימת ההמתנה עבור "${book.title}"`,
    })
    await fetchQueue()
    setJoining(false)
  }

  async function sendInAppNotification() {
    await requestBorrow()
    setNotifSent(true)
    setTimeout(() => { setShowContact(false); setNotifSent(false) }, 1400)
  }

  function tapLink(url) {
    // Safest cross-browser/iOS approach: synthetic anchor click preserves the user gesture
    // without navigating the SPA away (unlike window.location.href).
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
  function formatWaPhone(raw) {
    const digits = (raw || '').replace(/\D/g, '')
    // Israeli numbers: 05XXXXXXXX (10 digits) → 97250XXXXXXX (remove leading 0, add 972)
    if (digits.startsWith('0') && digits.length === 10) return '972' + digits.slice(1)
    return digits
  }
  function openWhatsApp() {
    tapLink(`https://wa.me/${formatWaPhone(ownerPhone)}?text=${encodeURIComponent(msgText)}`)
    requestBorrow(); setShowContact(false)
  }
  function openSMS() {
    tapLink(`sms:${ownerPhone}&body=${encodeURIComponent(msgText)}`)
    requestBorrow(); setShowContact(false)
  }
  function openEmail() {
    tapLink(`mailto:${ownerEmail}?subject=${encodeURIComponent(`בקשת השאלת ספר: ${book.title}`)}&body=${encodeURIComponent(msgText)}`)
    requestBorrow(); setShowContact(false)
  }

  function openRecommend() { setShowRecommend(true); setRecommendTarget(null); setRecommendSent(false) }
  function closeRecommend() { setShowRecommend(false); setRecommendTarget(null); setRecommendSent(false) }

  async function sendRecommend(friend, via) {
    const msg = `היי ${friend.name}! חשבתי שתאהב/י את "${book.title}" מאת ${book.author} — תבדוק/י בספריית המשפחה שלנו! 📚`
    await supabase.from('Notifications').insert({
      recipient_id: friend.id,
      sender_id: currentUser.id,
      book_id: book.id,
      message: `${currentUser.name || 'מישהו'} המליץ/ה לך על "${book.title}"`,
    })
    if (via === 'whatsapp' && friend.phone) {
      tapLink(`https://wa.me/${formatWaPhone(friend.phone)}?text=${encodeURIComponent(msg)}`)
    } else if (via === 'sms' && friend.phone) {
      tapLink(`sms:${friend.phone}&body=${encodeURIComponent(msg)}`)
    } else if (via === 'email' && friend.email) {
      tapLink(`mailto:${friend.email}?subject=${encodeURIComponent('ספר שכדאי לך להכיר')}&body=${encodeURIComponent(msg)}`)
    }
    setRecommendSent(true)
    setTimeout(closeRecommend, 1400)
  }

  async function handleTranslate() {
    if (translated) { setShowTranslated(v => !v); return }
    setTranslating(true)
    setTranslateError('')
    try {
      const result = await translateToHebrew(book.description)
      setTranslated(result)
      setShowTranslated(true)
    } catch (err) {
      setTranslateError('לא הצלחנו לתרגם — נסה שנית.')
    } finally {
      setTranslating(false)
    }
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

        <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 24px env(safe-area-inset-bottom, 34px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 22 }}>
            {showBack && book.back_image_url
              ? <img src={book.back_image_url} alt="עטיפה אחורית" style={{ width: 176, height: 250, objectFit: 'cover', borderRadius: 10, boxShadow: '0 4px 16px -6px rgba(40,30,18,.35)' }} />
              : <BookCover book={book} width={176} height={250} fontSize={23} authorSize={11} />
            }
            {book.back_image_url && (
              <button onClick={() => setShowBack(v => !v)} style={{ marginTop: 10, border: '1.5px solid #E7E1D6', background: '#F7F5F1', borderRadius: 20, padding: '5px 14px', fontSize: 13, fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, color: '#7C756C', cursor: 'pointer' }}>
                {showBack ? '← עטיפה קדמית' : 'עטיפה אחורית →'}
              </button>
            )}
          </div>

          {/* status + topic + borrow/waitlist/status row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 13, fontWeight: 600, color: s.color, background: s.bg,
              padding: '5px 11px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />{s.label}
            </span>
            {book.topic && (
              <span style={{ fontSize: 13, fontWeight: 600, color: '#8A6A3A', background: '#F3ECDD', padding: '5px 11px', borderRadius: 999 }}>
                {TOPIC_LABELS[book.topic] || book.topic}
              </span>
            )}
            {canRequest && (
              <button onClick={() => setShowContact(true)} style={{
                marginRight: 'auto', border: 'none', borderRadius: 999, padding: '7px 16px',
                background: '#C05A3E', color: '#F7F5F1', fontFamily: "'Source Sans 3',sans-serif",
                fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                בקש להשאיל
              </button>
            )}
            {canJoinWaitlist && (
              <button onClick={joinWaitlist} disabled={joining} style={{
                marginRight: 'auto', border: '1.5px solid #C05A3E', borderRadius: 999, padding: '7px 16px',
                background: '#FBF0EB', color: '#C05A3E', fontFamily: "'Source Sans 3',sans-serif",
                fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
                {joining ? 'מצטרף/ת…' : 'הצטרף/י לרשימת המתנה'}
              </button>
            )}
            {myStatusLabel && (
              <span style={{ marginRight: 'auto', fontSize: 13, fontWeight: 600, color: '#8A6A3A', background: '#F3ECDD', padding: '7px 14px', borderRadius: 999 }}>
                {myStatusLabel}
              </span>
            )}
          </div>

          <h2 style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 27, lineHeight: 1.15, color: '#2C2622', margin: '0 0 5px' }}>
            {book.title}
          </h2>
          <div style={{ fontSize: 16, color: '#7C756C', marginBottom: 14 }}>מאת {book.author}</div>

          {friends.length > 0 && (
            <button onClick={openRecommend} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: '1.5px solid #E7E1D6', background: '#FFFFFF', borderRadius: 999, padding: '8px 14px', fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 13, color: '#6E675C', cursor: 'pointer', marginBottom: 18 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6E675C" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
              המלץ לחבר
            </button>
          )}

          {book.description && (
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: '#4A443D', margin: '0 0 8px', direction: showTranslated ? 'rtl' : 'ltr', textAlign: showTranslated ? 'right' : 'left' }}>
                {showTranslated && translated ? translated : book.description}
              </p>
              {!isHebrewText(book.description) && (
                <button onClick={handleTranslate} disabled={translating} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 13, color: '#C05A3E', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C05A3E" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" /></svg>
                  {translating ? 'מתרגם…' : translated ? (showTranslated ? 'הצג במקור' : 'הצג תרגום') : 'תרגם לעברית'}
                </button>
              )}
              {translateError && <div style={{ fontSize: 12, color: '#B24A3A', marginTop: 4 }}>{translateError}</div>}
            </div>
          )}

          {book.owner_review && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#A39B90', marginBottom: 6 }}>חוות דעת הבעלים</div>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: '#4A443D', margin: 0, fontStyle: 'italic' }}>{book.owner_review}</p>
            </div>
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
              {inReadingList ? 'נשמר לרשימת הקריאה' : 'הוסף לרשימת הקריאה'}
            </button>
          )}

          {isOwnBook && queue.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 18, borderTop: '1px solid #ECE7DE' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#A39B90', marginBottom: 10 }}>רשימת המתנה</div>
              {queue.map((q, i) => {
                const pal = avatarPalette(q.borrower_id)
                const label = q.status === 'borrowed' ? 'מחזיק/ה כרגע'
                  : q.status === 'requested' ? 'ממתין/ה לאישורך'
                  : `מקום ${waitlistOnly.findIndex(w => w.id === q.id) + 1} בתור`
                return (
                  <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0', borderBottom: i < queue.length - 1 ? '1px solid #ECE7DE' : 'none' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: pal.bg, color: pal.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flex: 'none' }}>
                      {initial(q.Users?.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#2C2622' }}>{q.Users?.name}</div>
                    </div>
                    <div style={{ fontSize: 12.5, color: '#8A6A3A', fontWeight: 600, flex: 'none' }}>{label}</div>
                  </div>
                )
              })}
            </div>
          )}

          {isOwnBook && onEdit && (
            <div style={{ marginTop: 10, paddingTop: 18, borderTop: '1px solid #ECE7DE' }}>
              <div style={{ fontSize: 13, color: '#A39B90', textAlign: 'center', marginBottom: 12 }}>
                הוספת ספר זה — אחרים יכולים לשאול ממך.
              </div>
              <button onClick={() => onEdit(book)} style={{
                width: '100%', border: '1.5px solid #E7E1D6', background: '#FFFFFF',
                borderRadius: 14, padding: 15, fontFamily: "'Source Sans 3',sans-serif",
                fontWeight: 600, fontSize: 16, color: '#2C2622', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                ערוך ספר
              </button>
            </div>
          )}
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

            {notifSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 20, color: '#2C2622', marginBottom: 6 }}>הבקשה נשלחה!</div>
                <div style={{ fontSize: 14, color: '#7C756C' }}>הבעלים יראה את ההודעה שלך.</div>
              </div>
            ) : (
              <>
                <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 20, color: '#2C2622', marginBottom: 6 }}>
                  צור קשר עם {ownerName}
                </div>
                <div style={{ fontSize: 14, color: '#7C756C', marginBottom: 22 }}>
                  בחר כיצד לשלוח את בקשת ההשאלה:
                </div>

                {/* In-app notification — always available */}
                <ContactBtn
                  icon="🔔"
                  label="הודעה בתוך האפליקציה"
                  sub="הבעלים יקבל התראה ישירות"
                  onClick={sendInAppNotification}
                  color="#C05A3E"
                />

                {ownerPhone ? (<>
                  <ContactBtn icon="💬" label="WhatsApp" sub={book.Users?.phone} onClick={openWhatsApp} color="#25D366" />
                  <ContactBtn icon="📱" label="SMS" sub={book.Users?.phone} onClick={openSMS} color="#5A7FE0" />
                </>) : null}

                {ownerEmail ? (
                  <ContactBtn icon="✉️" label="אימייל" sub={book.Users?.email} onClick={openEmail} color="#C05A3E" />
                ) : null}

                {!ownerPhone && !ownerEmail && (
                  <div style={{ fontSize: 14, color: '#A39B90', marginBottom: 14, fontStyle: 'italic' }}>
                    {ownerName} לא הוסיף פרטי קשר — ניתן לשלוח הודעה בתוך האפליקציה.
                  </div>
                )}

                <button onClick={() => setShowContact(false)} style={{
                  marginTop: 10, width: '100%', border: '1.5px solid #E7E1D6',
                  background: 'transparent', borderRadius: 14, padding: 14,
                  fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 16,
                  color: '#6E675C', cursor: 'pointer',
                }}>ביטול</button>
              </>
            )}
          </div>
        </>
      )}

      {showRecommend && (
        <>
          <div onClick={closeRecommend} style={{
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

            {recommendSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💌</div>
                <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 20, color: '#2C2622', marginBottom: 6 }}>ההמלצה נשלחה!</div>
                <div style={{ fontSize: 14, color: '#7C756C' }}>{recommendTarget?.name} יראה/תראה את ההמלצה שלך.</div>
              </div>
            ) : recommendTarget ? (
              <>
                <button onClick={() => setRecommendTarget(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', padding: 0, marginBottom: 12, cursor: 'pointer', fontFamily: "'Source Sans 3',sans-serif", fontSize: 13, fontWeight: 600, color: '#A39B90' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A39B90" strokeWidth="2.4" strokeLinecap="round"><path d="M15 5l-7 7 7 7" /></svg>
                  חזרה
                </button>
                <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 20, color: '#2C2622', marginBottom: 6 }}>
                  שליחה אל {recommendTarget.name}
                </div>
                <div style={{ fontSize: 14, color: '#7C756C', marginBottom: 22 }}>
                  המלצה על "{book.title}" עבור {recommendTarget.name}:
                </div>
                <ContactBtn icon="🔔" label="הודעה בתוך האפליקציה" sub="יראה/תראה את ההמלצה שלך" onClick={() => sendRecommend(recommendTarget, 'inapp')} color="#C05A3E" />
                {recommendTarget.phone ? (<>
                  <ContactBtn icon="💬" label="WhatsApp" sub={recommendTarget.phone} onClick={() => sendRecommend(recommendTarget, 'whatsapp')} color="#25D366" />
                  <ContactBtn icon="📱" label="SMS" sub={recommendTarget.phone} onClick={() => sendRecommend(recommendTarget, 'sms')} color="#5A7FE0" />
                </>) : null}
                {recommendTarget.email ? (
                  <ContactBtn icon="✉️" label="אימייל" sub={recommendTarget.email} onClick={() => sendRecommend(recommendTarget, 'email')} color="#C05A3E" />
                ) : null}
              </>
            ) : (
              <>
                <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 20, color: '#2C2622', marginBottom: 6 }}>המלץ לחבר</div>
                <div style={{ fontSize: 14, color: '#7C756C', marginBottom: 22 }}>
                  למי כדאי לספר על "{book.title}"?
                </div>
                {friends.map(f => (
                  <button key={f.id} onClick={() => setRecommendTarget(f)} style={{ width: '100%', border: '1.5px solid #ECE7DE', background: '#FFFFFF', borderRadius: 14, padding: '12px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarPalette(f.id).bg, color: avatarPalette(f.id).color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flex: 'none' }}>{initial(f.name)}</div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#2C2622' }}>{f.name}</div>
                    <svg style={{ marginLeft: 'auto' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CFC8BB" strokeWidth="2.2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                  </button>
                ))}
              </>
            )}
            <button onClick={closeRecommend} style={{
              marginTop: 10, width: '100%', border: '1.5px solid #E7E1D6',
              background: 'transparent', borderRadius: 14, padding: 14,
              fontFamily: "'Source Sans 3',sans-serif", fontWeight: 600, fontSize: 16,
              color: '#6E675C', cursor: 'pointer',
            }}>ביטול</button>
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
