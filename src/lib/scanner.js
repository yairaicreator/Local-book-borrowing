const VISION_KEY = 'AIzaSyDC9s4Ge7V5XhygYjvEErv7Y-4BnnF0SZc'

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Returns { text: string, words: AnnotatedWord[] }
// words have: { text, h (height), x (center), y (top) }
export async function scanImageText(file) {
  const base64 = await fileToBase64(file)
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${VISION_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64 },
          features: [{ type: 'TEXT_DETECTION' }],
        }]
      })
    }
  )
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Vision API ${res.status}: ${errBody}`)
  }
  const data = await res.json()
  if (data.responses?.[0]?.error) {
    throw new Error(data.responses[0].error.message)
  }

  const annotations = data.responses?.[0]?.textAnnotations
  if (!annotations?.length) return { text: '', words: [] }

  const text = annotations[0].description?.trim() || ''

  const words = annotations.slice(1).map(a => {
    const verts = a.boundingPoly?.vertices || []
    const ys = verts.map(v => v.y ?? 0)
    const xs = verts.map(v => v.x ?? 0)
    return {
      text: a.description,
      h: Math.max(...ys) - Math.min(...ys),
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: Math.min(...ys),
    }
  }).filter(w => w.text?.trim())

  return { text, words }
}

// Uses font size (bounding box height) to identify title and author.
// Title = largest text on cover (≥80% of max height).
// Author = next size tier (40–79% of max height), first visual line only.
// This ignores publisher names, editor credits, subtitles etc. which are smaller.
export function extractTitleAuthor(words) {
  if (!words?.length) return { title: '', author: '' }

  const maxH = Math.max(...words.map(w => w.h))

  const titleWords = words.filter(w => w.h >= maxH * 0.8)
  const authorWords = words.filter(w => w.h >= maxH * 0.4 && w.h < maxH * 0.8)

  const title = linesToText(groupByLines(titleWords))
  // Only take the first visual line of author-sized words
  const authorLines = groupByLines(authorWords)
  const author = authorLines.length ? authorLines[0].words.map(w => w.text).join(' ') : ''

  return { title, author }
}

// Group words into visual lines sorted top-to-bottom.
// Within each line words are sorted right-to-left (correct for Hebrew and safe for LTR).
function groupByLines(words) {
  const sorted = [...words].sort((a, b) => a.y - b.y)
  const lines = []
  sorted.forEach(w => {
    const last = lines[lines.length - 1]
    // Two words are on the same line if y difference < half the max word height
    if (last && w.y - last.baseY < Math.max(...words.map(w => w.h)) * 0.5) {
      last.words.push(w)
    } else {
      lines.push({ baseY: w.y, words: [w] })
    }
  })
  // Sort each line right-to-left (works for Hebrew; harmless for LTR)
  lines.forEach(l => l.words.sort((a, b) => b.x - a.x))
  return lines
}

function linesToText(lines) {
  return lines.map(l => l.words.map(w => w.text).join(' ')).join(' ')
}

// Split Vision's full text into non-empty lines (used for back cover description)
export function textToLines(text) {
  return text.split('\n').map(l => l.trim()).filter(Boolean)
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
