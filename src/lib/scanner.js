import { BrowserMultiFormatReader } from '@zxing/browser'

const VISION_KEY = 'AIzaSyDC9s4Ge7V5XhygYjvEErv7Y-4BnnF0SZc'

// ─── ISBN ────────────────────────────────────────────────────────────────────

// Read a barcode from a photo. Returns the numeric string or null.
// Strategy: native BarcodeDetector (Chrome/Android) first — it handles real photos
// much better than ZXing. Falls back to ZXing for other browsers.
export async function scanISBN(file) {
  const url = URL.createObjectURL(file)
  try {
    // 1. Native BarcodeDetector (Chrome desktop, Chrome Android, Edge)
    if ('BarcodeDetector' in window) {
      try {
        const detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
        })
        const img = new Image()
        img.src = url
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej })
        const barcodes = await detector.detect(img)
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue.replace(/\D/g, '')
          if (code.length >= 8) return code
        }
      } catch { /* fall through to ZXing */ }
    }

    // 2. ZXing fallback (Firefox, Safari)
    const reader = new BrowserMultiFormatReader()
    const result = await reader.decodeFromImageUrl(url)
    const text = result.getText().replace(/\D/g, '')
    return text.length >= 8 ? text : null
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Look up an ISBN using Google Books (free, no key, no billing).
// Returns { title, author, description, topic, coverUrl } or null if not found.
export async function lookupISBN(isbn) {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`
    )
    if (!res.ok) return null
    const data = await res.json()
    const info = data.items?.[0]?.volumeInfo
    if (!info) return null
    return bookInfoToResult(info)
  } catch {
    return null
  }
}

// Search by title/author. Tries Google Books first, falls back to Open Library.
export async function searchBooks(query) {
  if (!query.trim()) return []

  // 1. Google Books (with API key for higher quota)
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5&key=${VISION_KEY}`
    )
    if (res.ok) {
      const data = await res.json()
      const results = (data.items || []).map(item => bookInfoToResult(item.volumeInfo))
      if (results.length > 0) return results
    }
  } catch { /* fall through */ }

  // 2. Open Library fallback (no key, good for non-English books)
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=title,author_name,first_sentence,subject&limit=5`
    )
    if (res.ok) {
      const data = await res.json()
      return (data.docs || []).map(doc => ({
        title: doc.title || '',
        author: (doc.author_name || []).join(', '),
        description: doc.first_sentence?.value || doc.first_sentence || '',
        topic: mapCategory(doc.subject),
        coverUrl: null,
      }))
    }
  } catch { /* silent */ }

  return []
}

function bookInfoToResult(info) {
  return {
    title: info.title || '',
    author: (info.authors || []).join(', '),
    description: info.description || '',
    topic: mapCategory(info.categories),
    coverUrl: info.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
  }
}

const TOPIC_MAP = {
  Fiction: ['fiction', 'novel', 'fantasy', 'adventure', 'science fiction'],
  Thriller: ['thriller', 'mystery', 'crime', 'detective', 'suspense', 'horror'],
  Romance: ['romance', 'love story'],
  Biography: ['biography', 'autobiography', 'memoir'],
  Science: ['science', 'physics', 'biology', 'chemistry', 'technology', 'mathematics', 'astronomy'],
  History: ['history', 'historical'],
  'Non-fiction': ['self-help', 'business', 'psychology', 'philosophy', 'economics', 'politics', 'health', 'cooking', 'religion', 'education'],
}

function mapCategory(categories) {
  if (!categories?.length) return null
  const cat = categories.join(' ').toLowerCase()
  for (const [topic, keywords] of Object.entries(TOPIC_MAP)) {
    if (keywords.some(k => cat.includes(k))) return topic
  }
  return null
}

// ─── Google Vision OCR (front cover fallback) ─────────────────────────────

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function scanImageText(file) {
  const base64 = await fileToBase64(file)
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${VISION_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ image: { content: base64 }, features: [{ type: 'TEXT_DETECTION' }] }]
      })
    }
  )
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Vision API ${res.status}: ${errBody}`)
  }
  const data = await res.json()
  if (data.responses?.[0]?.error) throw new Error(data.responses[0].error.message)

  const annotations = data.responses?.[0]?.textAnnotations
  if (!annotations?.length) return { text: '', words: [] }

  const text = annotations[0].description?.trim() || ''
  const words = annotations.slice(1).map(a => {
    const verts = a.boundingPoly?.vertices || []
    const ys = verts.map(v => v.y ?? 0)
    const xs = verts.map(v => v.x ?? 0)
    return { text: a.description, h: Math.max(...ys) - Math.min(...ys), x: (Math.min(...xs) + Math.max(...xs)) / 2, y: Math.min(...ys) }
  }).filter(w => w.text?.trim())

  return { text, words }
}

export function extractTitleAuthor(words) {
  if (!words?.length) return { title: '', author: '' }
  const clusters = clusterByHeight(words)
  const titleWords = clusters[0] || []
  const authorWords = clusters[1] || []
  const title = linesToText(groupByLines(titleWords))
  const authorLines = groupByLines(authorWords)
  const author = authorLines.length ? authorLines[0].words.map(w => w.text).join(' ') : ''
  return { title, author }
}

function clusterByHeight(words) {
  const sorted = [...words].sort((a, b) => b.h - a.h)
  const clusters = [[sorted[0]]]
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].h
    if (prev > 0 && (prev - sorted[i].h) / prev > 0.20) clusters.push([])
    clusters[clusters.length - 1].push(sorted[i])
  }
  return clusters
}

function groupByLines(words) {
  if (!words.length) return []
  const sorted = [...words].sort((a, b) => a.y - b.y)
  const avgH = words.reduce((s, w) => s + w.h, 0) / words.length
  const lines = []
  sorted.forEach(w => {
    const last = lines[lines.length - 1]
    if (last && w.y - last.baseY < avgH * 0.6) last.words.push(w)
    else lines.push({ baseY: w.y, words: [w] })
  })
  lines.forEach(l => l.words.sort((a, b) => b.x - a.x))
  return lines
}

function linesToText(lines) {
  return lines.map(l => l.words.map(w => w.text).join(' ')).join(' ')
}

export function textToLines(text) {
  return text.split('\n').map(l => l.trim()).filter(Boolean)
}

export function detectTopic(text) {
  const lower = text.toLowerCase()
  const KEYWORDS = {
    Thriller: ['murder','detective','crime','thriller','mystery','killer','suspense','spy'],
    Romance: ['romance','love','heart','passion','kiss','desire','wedding'],
    Biography: ['memoir','biography','autobiography','life of'],
    Science: ['science','physics','biology','chemistry','technology','quantum','astronomy'],
    History: ['history','historical','war','century','empire','ancient','revolution'],
    'Non-fiction': ['guide','how to','self-help','business','leadership','success','habits'],
    Fiction: ['novel','fiction','adventure','quest','journey','magic','fantasy','dragon'],
  }
  let best = null, bestScore = 0
  for (const [topic, kws] of Object.entries(KEYWORDS)) {
    const score = kws.filter(kw => lower.includes(kw)).length
    if (score > bestScore) { bestScore = score; best = topic }
  }
  return bestScore > 0 ? best : null
}
