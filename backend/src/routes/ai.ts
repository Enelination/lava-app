import { Router, Request, Response } from 'express'
import { selectRows, countRows, insertRow, deleteRows } from '../lib/supabase.js'
import { authenticate, optionalAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { chatSchema } from '../schemas.js'

const router = Router()

const RETENTION_MS = 90 * 24 * 60 * 60 * 1000
const HISTORY_LIMIT = 100

function contentToText(content: any): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map((b: any) => b.text || '').join('\n')
  return ''
}

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const verifiedRecords = await countRows('submissions', { status: 'Verified' })
    res.json({ verifiedRecords })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/history', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user
    const cutoff = new Date(Date.now() - RETENTION_MS).toISOString()
    await deleteRows('chat_messages', { user_id: userId, created_at: { op: 'lt', value: cutoff } })
    const rows = await selectRows('chat_messages', {
      where: { user_id: userId },
      order: 'created_at.desc',
      limit: HISTORY_LIMIT,
    })
    const messages = rows.reverse().map((r: any) => ({ role: r.role, content: r.content }))
    res.json({ messages })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/history', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user
    await deleteRows('chat_messages', { user_id: userId })
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/chat', optionalAuth, validate(chatSchema), async (req: Request, res: Response) => {
  try {
    const { messages, isPublic } = req.body
    const userId = (req as any).user?.userId

    const settings = await selectRows('settings', { where: { key: 'claude_api_key' }, select: 'value' })
    const claudeKey = settings[0]?.value || ''

    if (!claudeKey) {
      return res.status(400).json({ error: 'Claude API key not configured. Go to Settings to add it.' })
    }

    if (userId && Array.isArray(messages)) {
      const lastUser = [...messages].reverse().find((m: any) => m.role === 'user')
      if (lastUser) {
        await insertRow('chat_messages', {
          id: crypto.randomUUID(),
          user_id: userId,
          role: 'user',
          content: contentToText(lastUser.content),
        }).catch(() => {})
      }
    }

    const verifiedRecs = await selectRows('submissions', {
      where: { status: 'Verified' },
      order: 'submitted_at.desc',
      limit: 20,
    })
    const dbCtx = verifiedRecs.length
      ? verifiedRecs.map((r: any) =>
          `- ${r.community}, ${r.district || ''}, ${r.region} | ${r.property_type === 'Developed' ? 'DEVELOPED' : 'LAND'} | ${r.land_size || '?'} ${r.unit || ''} | ${r.land_use} | ${r.tenure_type}${r.property_type === 'Developed' ? ` | ${r.bedrooms ? r.bedrooms + ' bed' : ''}${r.bathrooms ? ', ' + r.bathrooms + ' bath' : ''}${r.storeys ? ', ' + r.storeys : ''}${r.floor_area ? ', ' + r.floor_area + ' sq.m' : ''}${r.building_age ? ', ' + r.building_age + 'yrs' : ''}${r.condition ? ', ' + r.condition : ''}` : ''} | GHS ${Number(r.price).toLocaleString()} | ${r.transaction_date || 'No date'} | Trust: ${r.trust_score || 'Unrated'}`
        ).join('\n')
      : 'No verified records yet.'

    const kbDocs = await selectRows('knowledge_base')
    const kbCtx = kbDocs.length
      ? '\n\nKNOWLEDGE BASE DOCUMENTS:\n' + kbDocs.map((d: any) => `--- ${d.name} ---\n${d.content.substring(0, 20000)}`).join('\n\n')
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

    if (userId && data.content?.[0]?.text) {
      await insertRow('chat_messages', {
        id: crypto.randomUUID(),
        user_id: userId,
        role: 'assistant',
        content: data.content[0].text,
      }).catch(() => {})
    }

    res.json(data)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'AI chat failed' })
  }
})

export default router
