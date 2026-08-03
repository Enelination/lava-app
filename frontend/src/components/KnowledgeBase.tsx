import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { knowledgeBase as kbApi } from '../lib/api'
import { extractTextFromFile } from '../lib/extractText'
import type { KnowledgeDoc } from '../types'

const builtinDocs: KnowledgeDoc[] = [
  { id: 'kb-mca', name: 'Market Comparison Analysis Guide.pdf', type: 'builtin', word_count: 120, created_at: '' },
  { id: 'kb-ghis', name: 'GhIS Valuation Report Format.docx', type: 'builtin', word_count: 85, created_at: '' },
  { id: 'kb-landact', name: 'Ghana Land Act 2020 (Act 1036).pdf', type: 'builtin', word_count: 200, created_at: '' },
  { id: 'kb-stampact', name: 'Stamp Duty Act (Act 689).pdf', type: 'builtin', word_count: 180, created_at: '' },
]

interface ComposerState {
  mode: 'add' | 'edit'
  id?: string
  name: string
  content: string
}

const emptyComposer: ComposerState = { mode: 'add', name: '', content: '' }

const inputCls =
  'w-full border border-line rounded-sm2 bg-paper px-3 py-2.5 text-xs text-ink outline-none focus:border-muted transition-colors placeholder:text-[#b0bcc3]'

export function KnowledgeBase() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [composer, setComposer] = useState<ComposerState | null>(null)
  const [loadingDoc, setLoadingDoc] = useState(false)

  useEffect(() => {
    loadDocs()
  }, [])

  const loadDocs = async () => {
    setLoading(true)
    try {
      const data = await kbApi.list()
      setDocs(data)
    } catch {
      setDocs([])
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const text = await extractTextFromFile(file)
      if (!text.trim()) {
        toast.error('No readable text found in that file (scanned PDF?).')
        return
      }
      await kbApi.upload(file.name, text.replace(/\u0000/g, ''))
      toast.success(`${file.name} added successfully.`)
      loadDocs()
    } catch (err: any) {
      toast.error(err.message || 'Could not read that file.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const openAdd = () => {
    setComposer({ ...emptyComposer })
  }

  const openEdit = async (id: string) => {
    setLoadingDoc(true)
    try {
      const doc = await kbApi.get(id)
      setComposer({ mode: 'edit', id, name: doc.name, content: doc.content || '' })
    } catch (err: any) {
      toast.error(err.message || 'Could not load document.')
    } finally {
      setLoadingDoc(false)
    }
  }

  const saveComposer = async () => {
    if (!composer) return
    if (!composer.name.trim()) {
      toast.error('Document name is required.')
      return
    }
    setSaving(true)
    try {
      if (composer.mode === 'add') {
        await kbApi.upload(composer.name.trim(), composer.content.replace(/\u0000/g, ''))
        toast.success('Document added.')
      } else if (composer.id) {
        await kbApi.update(composer.id, {
          name: composer.name.trim(),
          content: composer.content.replace(/\u0000/g, ''),
        })
        toast.success('Document updated.')
      }
      setComposer(null)
      loadDocs()
    } catch (err: any) {
      toast.error(err.message || 'Error saving document.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await kbApi.delete(id)
      setDocs(docs.filter((d) => d.id !== id))
      toast.success('Document removed.')
    } catch (err: any) {
      toast.error(err.message || 'Error deleting document.')
    }
  }

  const uploadedDocs = useMemo(
    () =>
      docs
        .filter((d) => d.type === 'uploaded')
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')),
    [docs]
  )
  const allDocs = useMemo(() => [...uploadedDocs, ...builtinDocs], [uploadedDocs])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allDocs
    return allDocs.filter((d) => d.name.toLowerCase().includes(q))
  }, [allDocs, query])

  const totalRefs = builtinDocs.length + uploadedDocs.length

  return (
    <div>
      <div className="pageHead">
        <div className="welcome">
          <div className="crumb">AI Reference Library</div>
          <h1>Knowledge <em>base.</em></h1>
          <p>Manage the documents used to ground LAVA's professional guidance.</p>
        </div>
      </div>

      <div className="kbGrid">
        <div className="flex flex-col gap-4">
          <div className="uploadZone">
            <div className="uploadIcon">↑</div>
            <h4>Add a reference document</h4>
            <p>PDF, DOCX or text files up to 10 MB — text is extracted automatically.</p>
            <label className="button mt-4 inline-flex cursor-pointer">
              {uploading ? 'Reading…' : 'Choose file'}
              <input
                type="file"
                hidden
                accept=".pdf,.docx,.txt"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </div>

          {!composer && (
            <button onClick={openAdd} className="button mt-1 w-full justify-center">
              <Plus size={14} />
              Add a document
            </button>
          )}

          {composer && (
            <section className="panel p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[13px] font-semibold text-ink">
                  {composer.mode === 'edit' ? 'Edit document' : 'Add a document'}
                </h4>
                <button
                  onClick={() => setComposer(null)}
                  className="bg-transparent border-none text-muted hover:text-ink cursor-pointer"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {loadingDoc ? (
                <p className="text-xs text-muted">Loading document…</p>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="field">
                    <label>Document name</label>
                    <input
                      type="text"
                      value={composer.name}
                      onChange={(e) => setComposer({ ...composer, name: e.target.value })}
                      placeholder="e.g. Stamp Duty Notes.pdf"
                      className={inputCls}
                    />
                  </div>
                  <div className="field">
                    <label>Content</label>
                    <textarea
                      value={composer.content}
                      onChange={(e) => setComposer({ ...composer, content: e.target.value })}
                      placeholder="Paste the full text of the document — LAVA reads this content to ground its answers."
                      rows={10}
                      className={`${inputCls} resize-y leading-relaxed`}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={saveComposer} disabled={saving} className="button dark">
                      {saving ? 'Saving…' : composer.mode === 'edit' ? 'Save changes' : 'Add document'}
                    </button>
                    <button onClick={() => setComposer(null)} className="button">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        <section className="panel docs">
          <div className="panelHead">
            <div>
              <h3>Active documents</h3>
              <p>{loading ? '…' : totalRefs} references available to LAVA</p>
            </div>
          </div>

          <div className="px-7 pt-4 pb-1">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents…"
                className={`${inputCls} pl-8`}
              />
            </div>
          </div>

          <div className="px-7 pb-3 mt-3">
            {filtered.map((doc) => (
              <div className="docRow" key={doc.id}>
                <span className="docIcon">▤</span>
                <div className="min-w-0">
                  <div className="docName">{doc.name}</div>
                  <div className="docMeta">
                    {doc.word_count} words · {doc.type === 'builtin' ? 'Built-in' : 'Uploaded'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.06em] bg-approve-bg text-approve-text px-2.5 py-1 rounded">
                    Active
                  </span>
                  {doc.type === 'uploaded' && (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => openEdit(doc.id)}
                        className="text-muted hover:text-ink bg-transparent border-none cursor-pointer p-1"
                        title="Edit document"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-red hover:text-red/70 bg-transparent border-none cursor-pointer p-1"
                        title="Remove document"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-10 text-muted text-xs font-mono">
                {query ? 'No documents match your search.' : 'No documents available.'}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
