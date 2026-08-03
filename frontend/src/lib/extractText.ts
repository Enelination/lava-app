export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase()

  if (name.endsWith('.docx')) {
    const mod = (await import('mammoth/mammoth.browser.min.js')) as any
    const mammoth = typeof mod.extractRawText === 'function' ? mod : mod.default
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    return result.value
  }
  if (name.endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist')
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
    const chunks: string[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      const text = content.items
        .map((item: any) => (typeof item?.str === 'string' ? item.str : ''))
        .join(' ')
      if (text.trim()) chunks.push(text)
      page.cleanup()
    }
    return chunks.join('\n')
  }

  return file.text()
}
