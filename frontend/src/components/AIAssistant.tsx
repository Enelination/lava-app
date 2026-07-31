import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Image, FileText, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import { useAuth } from '../store/authStore'
import { useApp } from '../store/appStore'
import { ai as aiApi } from '../lib/api'
import type { ChatMessage } from '../types'

const quickPrompts = [
  { label: 'Explain market comparison', text: 'What is the market comparison approach?' },
  { label: 'Adjust comparable sales', text: 'How should I adjust comparable sales?' },
  { label: 'Calculate stamp duty', text: 'How is stamp duty calculated?' },
]

export function AIAssistant() {
  const { user } = useAuth()
  const {
    chatMessages, addChatMessage, pendingImage, setPendingImage,
    pendingDoc, setPendingDoc, freeQuestions, incrementFreeQuestions,
    showUpgradeBanner, setShowUpgradeBanner,
  } = useApp()

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [dbLive, setDbLive] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    aiApi.status()
      .then((res) => setDbLive(res.verifiedRecords > 0))
      .catch(() => setDbLive(false))
  }, [])

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [chatMessages, loading])

  const handleQuickPrompt = useCallback((text: string) => {
    setInput(text)
    setTimeout(() => sendMessage(text), 50)
  }, [chatMessages])

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image too large (max 5MB).')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setPendingImage({
        type: 'image',
        name: file.name,
        data: dataUrl.split(',')[1],
        mediaType: file.type,
        preview: dataUrl,
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleDocAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      toast.error('File too large (max 8MB).')
      return
    }
    try {
      const text = await file.text()
      setPendingDoc({
        type: 'document',
        name: file.name,
        data: text,
        kind: file.name.endsWith('.txt') ? 'text' : 'document',
        text: text.substring(0, 6000),
      })
    } catch {
      toast.error('Could not read that file.')
    }
    e.target.value = ''
  }

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text && !pendingImage && !pendingDoc) return

    if (!user && freeQuestions >= 2) {
      setShowUpgradeBanner(true)
      toast.error('Sign in for unlimited access.')
      return
    }

    const userMsg: ChatMessage = {
      role: 'user',
      content: text || (pendingImage ? 'Please read this floor plan sketch.' : 'Please review the attached document.'),
    }

    addChatMessage(userMsg)
    setInput('')
    setLoading(true)

    setPendingImage(null)
    setPendingDoc(null)

    try {
      const response = await aiApi.chat([...chatMessages, userMsg], !user)
      if (response.content?.[0]?.text) {
        addChatMessage({ role: 'assistant', content: response.content[0].text })
        if (!user) incrementFreeQuestions()
      } else {
        addChatMessage({
          role: 'assistant',
          content: 'Error: No response from AI. Check your API key in Settings.',
        })
      }
    } catch (err: any) {
      addChatMessage({
        role: 'assistant',
        content: err.message || 'Could not connect. Check your Claude API key in Settings.',
      })
    } finally {
      setLoading(false)
    }
  }

  const renderContent = (msg: ChatMessage) => {
    const content = typeof msg.content === 'string' ? msg.content : msg.content.map((b: any) => b.text || '').join(' ')

    return (
      <div className="md-prose">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            pre: ({ children }) => <>{children}</>,
            code: ({ className, children }) => {
              if (/language-svg/.test(className || '')) {
                const svg = String(children).trim()
                if (svg.includes('<svg')) {
                  return (
                    <div className="mt-3">
                      <div className="font-mono text-[9px] uppercase tracking-[0.09em] text-muted mb-2">
                        Redrawn floor plan
                      </div>
                      <div dangerouslySetInnerHTML={{ __html: svg }} />
                    </div>
                  )
                }
              }
              return <code className={className}>{children}</code>
            },
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    )
  }

  return (
    <div>
      <div className="pageHead">
        <div className="welcome">
          <div className="crumb">Research</div>
          <h1>Ask LAVA <em>anything.</em></h1>
          <p>Professional valuation guidance, structured around GhIS methodology and verified market evidence.</p>
        </div>
      </div>

      <div className="assistant">
        <aside className="assistantInfo">
          <div className="aiSeal"><i /> LAVA</div>
          <div className="infoDivider" />
          <h3>LAVA Assistant</h3>
          <p>Grounded in market comparison analysis, Ghana land legislation and the LAVA data model.</p>
          <div className="infoDivider" />
          <div className="infoRow">
            <span className="dot green" /> Database connection
          </div>
          <div className="infoRow" style={{ marginLeft: 16, color: 'rgba(255,255,255,0.45)' }}>
            {dbLive ? 'Live verified records available' : user ? 'Connecting to database…' : 'Demo mode · sign in for access'}
          </div>
        </aside>

        <div className="chatPanel panel">
          <div className="chatHead">
            <div>
              <h2>New valuation conversation</h2>
              <span>Responses are guidance, not a formal valuation opinion.</span>
            </div>
            <span>● Ready</span>
          </div>

          {(pendingImage?.preview || pendingDoc) && (
            <div className="attachment">
              {pendingImage?.preview && (
                <img src={pendingImage.preview} alt="Attachment" className="w-9 h-9 rounded object-cover" />
              )}
              {!pendingImage?.preview && pendingDoc && (
                <FileText size={16} className="text-muted flex-shrink-0" />
              )}
              <span className="flex-1 truncate text-xs text-ink font-medium">
                {pendingImage?.name || pendingDoc?.name}
              </span>
              <button
                onClick={() => { setPendingImage(null); setPendingDoc(null); }}
                className="text-[10px] font-semibold text-red hover:text-red/80 bg-transparent border-none cursor-pointer"
              >
                Remove
              </button>
            </div>
          )}

          <div ref={chatRef} className="messages">
            {chatMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={`message ${msg.role === 'user' ? 'user' : ''}`}
              >
                <div className="messageLabel">{msg.role === 'user' ? 'You' : 'LAVA'}</div>
                <div className="bubble">
                  {renderContent(msg)}
                  {msg.role === 'assistant' && i === chatMessages.length - 1 && !loading && (
                    <div className="sourceLine">
                      <i className="dot green" style={{ width: 6, height: 6, borderRadius: '50%' }} />
                      Grounded in LAVA verified database · GhIS standards
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {loading && (
              <div className="message">
                <div className="messageLabel">LAVA</div>
                <div className="bubble flex gap-1.5 py-3">
                  <Loader2 size={14} className="animate-spin text-muted" />
                  Thinking…
                </div>
              </div>
            )}
          </div>

          <div className="suggestions">
            {quickPrompts.map((qp) => (
              <button key={qp.label} onClick={() => handleQuickPrompt(qp.text)}>
                {qp.label}
              </button>
            ))}
          </div>

          <div className="composer">
            <button className="attachBtn" title="Attach a floor plan sketch" onClick={() => fileInputRef.current?.click()}>
              <Image size={16} />
            </button>
            <button className="attachBtn" title="Attach a document (PDF, Word, or text)" onClick={() => docInputRef.current?.click()}>
              <FileText size={16} />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (!loading) sendMessage()
                }
              }}
              placeholder="Ask about a valuation, comparable evidence, or methodology…"
              rows={1}
            />
            <button
              className="button"
              onClick={() => sendMessage()}
              disabled={loading || (!input.trim() && !pendingImage && !pendingDoc)}
            >
              Send <span>↑</span>
            </button>
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageAttach} />
      <input ref={docInputRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={handleDocAttach} />

      {showUpgradeBanner && !user && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="upgradeBanner">
          <div>
            <h4>You have used your 2 free questions</h4>
            <p>Sign in with your GhIS licence number for unlimited access.</p>
          </div>
          <button className="button dark flex-shrink-0">Sign in →</button>
        </motion.div>
      )}
    </div>
  )
}
