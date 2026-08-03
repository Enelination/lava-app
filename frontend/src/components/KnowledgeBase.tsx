import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { knowledgeBase as kbApi } from '../lib/api'
import type { KnowledgeDoc } from '../types'

const builtinDocs: KnowledgeDoc[] = [
  { id: 'kb-mca', name: 'Market Comparison Analysis Guide.pdf', type: 'builtin', word_count: 120, created_at: '' },
  { id: 'kb-ghis', name: 'GhIS Valuation Report Format.docx', type: 'builtin', word_count: 85, created_at: '' },
  { id: 'kb-landact', name: 'Ghana Land Act 2020 (Act 1036).pdf', type: 'builtin', word_count: 200, created_at: '' },
  { id: 'kb-stampact', name: 'Stamp Duty Act (Act 689).pdf', type: 'builtin', word_count: 180, created_at: '' },
]

export function KnowledgeBase() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

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
      const text = await file.text()
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

  const handleDelete = async (id: string) => {
    try {
      await kbApi.delete(id)
      setDocs(docs.filter((d) => d.id !== id))
      toast.success('Document removed.')
    } catch (err: any) {
      toast.error(err.message || 'Error deleting document.')
    }
  }

  const uploadedDocs = docs.filter((d) => d.type === 'uploaded')
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
        <div>
          <div className="uploadZone">
            <div className="uploadIcon">↑</div>
            <h4>Add a reference document</h4>
            <p>PDF, DOCX or text files up to 10 MB.</p>
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
        </div>

        <section className="panel docs">
          <div className="panelHead">
            <div>
              <h3>Active documents</h3>
              <p>{loading ? '…' : totalRefs} references available to LAVA</p>
            </div>
          </div>

          <div className="px-7 pb-3 mt-3">
            {builtinDocs.map((doc) => (
              <div className="docRow" key={doc.id}>
                <span className="docIcon">▤</span>
                <div className="min-w-0">
                  <div className="docName">{doc.name}</div>
                  <div className="docMeta">{doc.word_count} words · Built-in</div>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.06em] bg-approve-bg text-approve-text px-2.5 py-1 rounded">
                  Active
                </span>
              </div>
            ))}

            {uploadedDocs.map((doc) => (
              <div className="docRow" key={doc.id}>
                <span className="docIcon">▤</span>
                <div className="min-w-0">
                  <div className="docName">{doc.name}</div>
                  <div className="docMeta">{doc.word_count} words extracted</div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-red hover:text-red/70 bg-transparent border-none cursor-pointer p-1"
                  title="Remove document"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}

            {uploadedDocs.length === 0 && builtinDocs.length === 0 && !loading && (
              <div className="text-center py-10 text-muted text-xs font-mono">
                No documents available.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
