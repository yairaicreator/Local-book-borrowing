import { BrowserMultiFormatReader } from '@zxing/browser'

const VISION_KEY = import.meta.env.VITE_VISION_KEY_1
const BOOKS_KEY = import.meta.env.VITE_BOOKS_SEARCH
const GEMINI_KEY = import.meta.env.VITE_GEMINI_AI

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
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1&key=${BOOKS_KEY}`
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

const HEBREW_RE = /[֐-׿]/

// Search by title/author. Tries Google Books first, falls back to Open Library.
// When the query contains Hebrew, restricts Google Books to Hebrew-language editions.
export async function searchBooks(query) {
  if (!query.trim()) return []

  const isHebrew = HEBREW_RE.test(query)
  const langParam = isHebrew ? '&langRestrict=iw' : ''

  // 1. Google Books (with API key for higher quota)
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5&key=${BOOKS_KEY}${langParam}`
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
  if (!base64) throw new Error('לא ניתן לקרוא את קובץ התמונה')
  if (!VISION_KEY) throw new Error('Vision API key חסר')
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

// ─── Option A: Gemini Vision ─────────────────────────────────────────────────
const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.0-flash',
  'gemini-3-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
]

const GEMINI_PROMPT = `You are looking at a book cover photo.
Your only job: output the book title and author name.

Output format — two lines, nothing else:
TITLE: <the book title>
AUTHOR: <the author name>

Rules:
- Title = the largest or most prominent text on the cover
- Author = the person's name (usually smaller text)
- The text may be in Hebrew or English — copy it exactly as written
- Do NOT describe the image, do NOT add commentary, do NOT say "upside down" or anything else
- If you cannot find the author, write AUTHOR: unknown
- Output ONLY the two lines above, no other text`

function parseGeminiResponse(raw) {
  // Match TITLE:/AUTHOR: anywhere in the response (Gemini sometimes adds preamble commentary)
  let title = raw.match(/TITLE:\s*(.+)/i)?.[1]?.trim() || ''
  let author = raw.match(/AUTHOR:\s*(.+)/i)?.[1]?.trim() || ''

  // Hebrew labels fallback
  if (!title) title = raw.match(/כותרת[:\s]+(.+)/)?.[1]?.trim() || ''
  if (!author) author = raw.match(/(?:מחבר|סופר|מחברת)[:\s]+(.+)/)?.[1]?.trim() || ''

  // Strip stray quotes
  title = title.replace(/^["'"״]|["'"״]$/g, '').trim()
  author = author.replace(/^["'"״]|["'"״]$/g, '').trim()
  if (author.toLowerCase() === 'unknown') author = ''

  if (!title) throw new Error(`Gemini format unknown: "${raw.slice(0, 120)}"`)
  return { title, author }
}

export async function analyzeBookCoverWithGemini(file) {
  const base64 = await fileToBase64(file)
  const mimeType = file.type || 'image/jpeg'
  const body = JSON.stringify({
    contents: [{ parts: [{ inlineData: { mimeType, data: base64 } }, { text: GEMINI_PROMPT }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 600 },
  })

  let lastErr = 'no models tried'
  let retried = false
  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i]
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
    )
    if (res.status === 429) {
      if (!retried) { retried = true; await new Promise(r => setTimeout(r, 3000)); i--; continue }
      throw new Error('Gemini 429: rate limit — wait a minute and try again')
    }
    if (res.status === 404) { lastErr = `${model} not found`; continue }
    if (!res.ok) { lastErr = `${model} ${res.status}`; continue }

    const data = await res.json()
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
    const result = parseGeminiResponse(raw)
    return { title: result.title, author: result.author }
  }
  throw new Error(`Gemini unavailable: ${lastErr}`)
}

const GEMINI_BACK_PROMPT = `You are looking at the back cover of a book.
Extract the book description — the paragraph that tells what the book is about.

Output format — two lines, nothing else:
DESCRIPTION: <the book synopsis/description in the original language>
TOPIC: <one of: Fiction, Thriller, Romance, Biography, Science, History, Non-fiction, Other>

Rules:
- Description = the main synopsis paragraph(s), NOT reviews, NOT author bio, NOT awards
- If no clear description found, write DESCRIPTION: (leave blank)
- Do NOT add commentary, just output the two lines`

export async function analyzeBackCoverWithGemini(file) {
  const base64 = await fileToBase64(file)
  const mimeType = file.type || 'image/jpeg'
  const body = JSON.stringify({
    contents: [{ parts: [{ inlineData: { mimeType, data: base64 } }, { text: GEMINI_BACK_PROMPT }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 600 },
  })

  let lastErr = 'no models tried'
  let retried = false
  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i]
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
    )
    if (res.status === 429) {
      if (!retried) { retried = true; await new Promise(r => setTimeout(r, 3000)); i--; continue }
      throw new Error('rate limit')
    }
    if (res.status === 404) { lastErr = `${model} not found`; continue }
    if (!res.ok) { lastErr = `${model} ${res.status}`; continue }

    const data = await res.json()
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
    // Capture everything between DESCRIPTION: and TOPIC: (description can span multiple lines)
    const description = raw.match(/DESCRIPTION:\s*([\s\S]*?)(?=\nTOPIC:|$)/i)?.[1]?.trim() || ''
    const topicRaw = raw.match(/TOPIC:\s*(.+)/i)?.[1]?.trim() || ''
    const topic = ['Fiction','Thriller','Romance','Biography','Science','History','Non-fiction','Other'].includes(topicRaw) ? topicRaw : null
    return { description, topic }
  }
  throw new Error(`Gemini unavailable: ${lastErr}`)
}

// ─── Option B: Auto-search from OCR text ─────────────────────────────────────
// Smart OCR: search Google Books + Open Library with the full cover text.
// If a book is found whose title words appear in the OCR, return full book info.
// Otherwise fall back to bounding-box heuristic.
export async function extractBookFromOCR(text, words) {
  if (text.trim()) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1)
    const query = lines.slice(0, 6).join(' ')

    // Try Google Books
    try {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5&key=${BOOKS_KEY}`
      )
      if (res.ok) {
        const data = await res.json()
        const match = (data.items || []).find(item => {
          const titleWords = (item.volumeInfo.title || '').split(/\s+/).filter(w => w.length > 2)
          const ocrL = text.toLowerCase()
          // Accept if ≥1 title word found in OCR, or just take first result if query is rich enough
          return titleWords.some(w => ocrL.includes(w.toLowerCase())) || lines.length >= 3
        })
        if (match) return { ...bookInfoToResult(match.volumeInfo), fromDatabase: true }
      }
    } catch { /* fall through */ }

    // Try Open Library
    try {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=title,author_name,first_sentence,subject&limit=5`
      )
      if (res.ok) {
        const data = await res.json()
        const doc = (data.docs || [])[0]
        if (doc?.title) {
          return {
            title: doc.title,
            author: (doc.author_name || []).join(', '),
            description: doc.first_sentence?.value || doc.first_sentence || '',
            topic: mapCategory(doc.subject),
            coverUrl: null,
            fromDatabase: true,
          }
        }
      }
    } catch { /* fall through */ }
  }

  // Fall back to bounding-box heuristic
  const { title, author } = extractTitleAuthor(words)
  return { title, author, description: '', topic: null, coverUrl: null, fromDatabase: false }
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
