import { Router, Request, Response } from 'express'
import { getDb } from '../lib/database.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/status', (_req: Request, res: Response) => {
  try {
    const db = getDb()
    const count = (db.prepare('SELECT COUNT(*) as c FROM submissions WHERE status = ?').get('Verified') as any).c
    res.json({ verifiedRecords: count })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { messages, isPublic } = req.body
    const db = getDb()
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('claude_api_key') as any
    const claudeKey = setting?.value || ''

    if (!claudeKey) {
      return res.status(400).json({ error: 'Claude API key not configured. Go to Settings to add it.' })
    }

    const verifiedRecs = db.prepare('SELECT * FROM submissions WHERE status = ? ORDER BY submitted_at DESC LIMIT 20').get('Verified') as any[]
    const dbCtx = verifiedRecs.length
      ? verifiedRecs.map((r: any) =>
          `- ${r.community}, ${r.district || ''}, ${r.region} | ${r.property_type === 'Developed' ? 'DEVELOPED' : 'LAND'} | ${r.land_size || '?'} ${r.unit || ''} | ${r.land_use} | ${r.tenure_type}${r.property_type === 'Developed' ? ` | ${r.bedrooms ? r.bedrooms + ' bed' : ''}${r.bathrooms ? ', ' + r.bathrooms + ' bath' : ''}${r.storeys ? ', ' + r.storeys : ''}${r.floor_area ? ', ' + r.floor_area + ' sq.m' : ''}${r.building_age ? ', ' + r.building_age + 'yrs' : ''}${r.condition ? ', ' + r.condition : ''}` : ''} | GHS ${Number(r.price).toLocaleString()} | ${r.transaction_date || 'No date'} | Trust: ${r.trust_score}`
        ).join('\n')
      : 'No verified records yet.'

    const kbDocs = db.prepare('SELECT * FROM knowledge_base').all() as any[]
    const kbCtx = kbDocs.length
      ? '\n\nKNOWLEDGE BASE DOCUMENTS:\n' + kbDocs.map((d: any) => `--- ${d.name} ---\n${d.content.substring(0, 4000)}`).join('\n\n')
      : ''

    const sysPrompt = `You are LAVA (Land Valuation Assistant), a professional AI assistant for land valuation in Ghana for members of the Ghana Institution of Surveyors (GhIS).

KNOWLEDGE:
1. GhIS Valuation Standards
2. Market Comparison Analysis (MCA): select 3+ comparables, apply 1-10% adjustments for Location, Land Size, Constructional Details, General Conditions, No. of Bedrooms, Sale Date, Services, Legal Interest. Total Adjustment%. Adjusted Rate = Base Rate x (1+Total%/100). Average x subject area = Final Value.
3. Ghana Land Act 2020 (Act 1036)
4. Stamp Duty Act (Act 689): conveyance 0.5% up to GHS 100M, 1% above
5. GhIS Report format: purpose, basis, date, title, market data, neighbourhood, description, comparables, value opinion, certification
6. Rental: unit rate = rent p.a. / net floor area
7. Improved/developed property valuation: consider construction quality, condition, age, no. of bedrooms/bathrooms, storeys and floor area when selecting and adjusting comparables.

Ghana: Freehold > Leasehold > Stool > Family; Greater Accra > Ashanti > Eastern > Western > Central > Northern

LIVE DATABASE:
${dbCtx}${kbCtx}

${isPublic ? 'PUBLIC USER: Brief helpful response. Encourage sign-in for full analysis.' : 'SIGNED-IN PROFESSIONAL: Full response with detailed comparable analysis.'}

Reference specific database records. State stamp duty. Recommend field inspection.

FLOOR PLAN SKETCHES: If the user attaches an image of a hand-drawn floor plan, carefully read room labels and dimensions. Respond with: (1) a short bullet list of rooms identified with approximate dimensions and total floor area if estimable, and (2) a redrawn clean floor plan as SVG code inside a fenced code block starting with \`\`\`svg and ending with \`\`\`. The SVG must: use viewBox="0 0 640 440", draw each room as a rectangle with thin stroke (#1B2A4A, stroke-width 1.5, fill #F6F8FC), label each room with its name centered using small text (font-size 11, fill #1B2A4A), include dimension labels near rooms if known, keep proportions consistent. Do not include any text inside the svg fence - only valid SVG markup.`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2200,
        system: sysPrompt,
        messages
      })
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      return res.status(502).json({ error: `Claude API error: ${errText}` })
    }

    const data = await anthropicRes.json()
    res.json(data)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'AI chat failed' })
  }
})

export default router
