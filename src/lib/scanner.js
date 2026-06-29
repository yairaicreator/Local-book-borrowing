const VISION_KEY = 'AIzaSyDC9s4Ge7V5XhygYjvEErv7Y-4BnnF0SZc'

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Returns the full detected text as a plain string, or '' on failure.
// Google Vision supports Hebrew, Arabic, Latin, and many other scripts.
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
  // Check for API-level error in the response body
  if (data.responses?.[0]?.error) {
    throw new Error(data.responses[0].error.message)
  }
  return data.responses?.[0]?.fullTextAnnotation?.text?.trim() || ''
}

// Split Vision's output into non-empty lines
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
