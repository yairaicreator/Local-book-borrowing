import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (diff < 60) return 'עכשיו'
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דקות`
  if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שעות`
  return `לפני ${Math.floor(diff / 86400)} ימים`
}

export default function NotificationBell({ currentUser, small = false }) {
  const [notifs, setNotifs] = useState([])
  const [open, setOpen] = useState(false)
  const panelRef = useRef()

  async function fetchNotifs() {
    const { data } = await supabase
      .from('Notifications')
      .select('id, message, is_read, created_at')
      .eq('recipient_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifs(data || [])
  }

  useEffect(() => {
    fetchNotifs()
    const ch = supabase.channel('notifs-' + currentUser.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Notifications', filter: `recipient_id=eq.${currentUser.id}` }, () => fetchNotifs())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [currentUser.id])

  useEffect(() => {
    if (!open) return
    async function markRead() {
      const unread = notifs.filter(n => !n.is_read).map(n => n.id)
      if (!unread.length) return
      await supabase.from('Notifications').update({ is_read: true }).in('id', unread)
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    }
    markRead()
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const unread = notifs.filter(n => !n.is_read).length

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      <button onClick={() => setOpen(v => !v)} style={{
        position: 'relative', width: small ? 34 : 40, height: small ? 34 : 40,
        borderRadius: '50%', border: 'none',
        background: open ? '#F0ECE4' : 'transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width={small ? 18 : 20} height={small ? 18 : 20} viewBox="0 0 24 24" fill="none" stroke="#6E675C" strokeWidth="2.1" strokeLinecap="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16,
            background: '#C05A3E', color: '#fff', borderRadius: 999,
            fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', lineHeight: 1,
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: small ? 40 : 46, right: 0,
          width: 320, maxHeight: 420, background: '#F7F5F1',
          borderRadius: 18, boxShadow: '0 16px 48px -12px rgba(40,30,18,.45)',
          border: '1px solid #ECE7DE', zIndex: 100,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'flPop .2s cubic-bezier(.22,1,.36,1)',
        }}>
          <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #ECE7DE', fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 16, color: '#2C2622' }}>
            התראות
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '28px 18px', textAlign: 'center', fontSize: 14, color: '#A39B90' }}>
                אין התראות
              </div>
            ) : notifs.map(n => (
              <div key={n.id} style={{
                padding: '13px 18px', borderBottom: '1px solid #F0EBE3',
                background: n.is_read ? 'transparent' : '#FDF6F0',
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.is_read ? 'transparent' : '#C05A3E', marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: '#2C2622', lineHeight: 1.45 }}>{n.message}</div>
                  <div style={{ fontSize: 12, color: '#A39B90', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
