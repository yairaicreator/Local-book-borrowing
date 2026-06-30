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

// Groups words into natural font-size clusters by finding gaps in the height distribution.
// A gap of >20% relative to the larger height = a new prominence level.
// Cluster 0 = title (biggest), cluster 1 = author (second biggest), rest ignored.
export function extractTitleAuthor(words) {
  if (!words?.length) return { title: '', author: '' }

  const clusters = clusterByHeight(words)

  const titleWords = clusters[0] || []
  const authorWords = clusters[1] || []

  const title = linesToText(groupByLines(titleWords))
  // Only the first visual line of author-cluster words (avoids subtitles below the name)
  const authorLines = groupByLines(authorWords)
  const author = authorLines.length
    ? authorLines[0].words.map(w => w.text).join(' ')
    : ''

  return { title, author }
}

// Sort words into descending-height buckets separated by >20% gaps.
function clusterByHeight(words) {
  const sorted = [...words].sort((a, b) => b.h - a.h)
  const clusters = [[sorted[0]]]
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].h
    const curr = sorted[i].h
    if (prev > 0 && (prev - curr) / prev > 0.20) {
      clusters.push([])
    }
    clusters[clusters.length - 1].push(sorted[i])
  }
  return clusters
}

// Group words into visual lines (top-to-bottom). Within each line sort right-to-left
// so Hebrew text reads correctly (and is harmless for LTR languages).
function groupByLines(words) {
  if (!words.length) return []
  const sorted = [...words].sort((a, b) => a.y - b.y)
  const avgH = words.reduce((s, w) => s + w.h, 0) / words.length
  const lineThreshold = avgH * 0.6

  const lines = []
  sorted.forEach(w => {
    const last = lines[lines.length - 1]
    if (last && w.y - last.baseY < lineThreshold) {
      last.words.push(w)
    } else {
      lines.push({ baseY: w.y, words: [w] })
    }
  })
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
