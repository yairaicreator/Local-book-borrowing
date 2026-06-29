const API_KEY = 'XuOE7YjWxnwu45Onz77nqO67MmDDcBqJ6IyVnH3p'

export async function scanImageText(file) {
  const formData = new FormData()
  formData.append('image', file)
  const res = await fetch('https://api.api-ninjas.com/v1/imagetotext', {
    method: 'POST',
    headers: { 'X-Api-Key': API_KEY },
    body: formData,
  })
  if (!res.ok) return []
  const words = await res.json()
  return Array.isArray(words) ? words : []
}

export function wordsToLines(words) {
  const sorted = [...words].sort((a, b) => a.bounding_box.y1 - b.bounding_box.y1)
  const lines = []
  sorted.forEach(w => {
    const last = lines[lines.length - 1]
    if (last && Math.abs(w.bounding_box.y1 - last.y) < 15) {
      last.words.push(w.text)
    } else {
      lines.push({ y: w.bounding_box.y1, words: [w.text] })
    }
  })
  return lines.map(l => l.words.join(' '))
}

const TOPIC_KEYWORDS = {
  Thriller:      ['murder','detective','crime','thriller','mystery','killer','suspense','spy','terror','assassin','chase','escape'],
  Romance:       ['romance','love','heart','passion','kiss','desire','wedding','bride','soulmate','beloved'],
  Biography:     ['memoir','biography','autobiography','remembers','grew up','born in','life of'],
  Science:       ['science','physics','biology','chemistry','technology','quantum','evolution','astronomy','research','experiment'],
  History:       ['history','historical','war','century','empire','ancient','revolution','civilization','medieval','dynasty'],
  'Non-fiction': ['guide','how to','self-help','business','leadership','success','productivity','habits','mindset','strategy'],
  Fiction:       ['novel','fiction','adventure','quest','journey','world','kingdom','magic','fantasy','dragon'],
}

export function detectTopic(text) {
  const lower = text.toLowerCase()
  let best = null, bestScore = 0
  for (const [topic, kws] of Object.entries(TOPIC_KEYWORDS)) {
    const score = kws.filter(kw => lower.includes(kw)).length
    if (score > bestScore) { bestScore = score; best = topic }
  }
  return bestScore > 0 ? best : null
}
