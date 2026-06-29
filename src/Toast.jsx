export default function Toast({ message }) {
  if (!message) return null
  return (
    <div style={{
      position: 'absolute', left: '50%', bottom: 30,
      transform: 'translateX(-50%)',
      background: '#2C2622', color: '#F7F5F1',
      fontSize: 14, fontWeight: 600,
      padding: '12px 20px', borderRadius: 13,
      zIndex: 50, whiteSpace: 'nowrap',
      boxShadow: '0 10px 24px -8px rgba(40,30,18,.6)',
      animation: 'flFade .2s ease',
    }}>
      {message}
    </div>
  )
}
