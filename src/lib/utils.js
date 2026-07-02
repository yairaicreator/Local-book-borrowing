const COVER_PALETTES = [
  { bg: '#7C9885', ink: '#FBF8F0' },
  { bg: '#C98B6B', ink: '#FBF3EC' },
  { bg: '#B9A24B', ink: '#FCF9EC' },
  { bg: '#5E6B8A', ink: '#F2F4FB' },
  { bg: '#6E8B6E', ink: '#F4F9F2' },
  { bg: '#A85C4C', ink: '#FBF1ED' },
  { bg: '#4F6478', ink: '#EFF4F8' },
  { bg: '#C49A55', ink: '#FCF7EB' },
  { bg: '#C77E8A', ink: '#FBF1F3' },
  { bg: '#5F8A8B', ink: '#EFF7F7' },
  { bg: '#D08C4A', ink: '#FCF4E9' },
  { bg: '#7A6CA0', ink: '#F3F1FA' },
]

const AVATAR_PALETTES = [
  { bg: '#E7C8A0', color: '#7A4A28' },
  { bg: '#C6D3C0', color: '#3F5A3A' },
  { bg: '#D8C3D6', color: '#6B4368' },
  { bg: '#C5D4E0', color: '#2C4A5A' },
  { bg: '#E0D4B8', color: '#6A5330' },
  { bg: '#D4C0C0', color: '#5A3030' },
]

function strHash(str) {
  let h = 0
  for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return Math.abs(h)
}

export function coverPalette(id) {
  return COVER_PALETTES[strHash(id) % COVER_PALETTES.length]
}

export function avatarPalette(id) {
  return AVATAR_PALETTES[strHash(id) % AVATAR_PALETTES.length]
}

export function initial(name) {
  return (name || '?')[0].toUpperCase()
}

export const STATUS = {
  available:   { label: 'זמין',     color: '#2E8B57', bg: '#E2F1E7' },
  borrowed:    { label: 'מושאל',    color: '#B8860B', bg: '#F6EDD4' },
  unavailable: { label: 'לא זמין', color: '#B24A3A', bg: '#F4E2DD' },
}

export const TOPICS = ['דרמה', 'ישראלי', 'מתח', 'רומנטיקה', 'אחר']

// Topic values are stored in Hebrew directly, so no translation map is needed —
// kept as an identity fallback for any legacy/unmapped value.
export const TOPIC_LABELS = TOPICS.reduce((m, t) => ({ ...m, [t]: t }), {})
