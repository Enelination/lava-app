import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Download, X, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import ExcelJS from 'exceljs'
import toast from 'react-hot-toast'
import { submissions as submissionsApi } from '../lib/api'

interface Props {
  onClose: () => void
}

const REGIONS = ['Greater Accra', 'Ashanti', 'Eastern', 'Western', 'Central', 'Northern', 'Upper East', 'Upper West', 'Volta', 'Bono']
const LAND_USES = ['Residential', 'Commercial', 'Agricultural', 'Industrial', 'Mixed use']
const TENURE_TYPES = ['Stool land', 'Family land', 'State / vested', 'Freehold', 'Leasehold']
const PROPERTY_TYPES = ['Land', 'Developed']
const TRANSACTION_TYPES = ['Sale', 'Lease', 'Rent', 'Asking price']
const SOURCES = ['Direct transaction', 'Client instruction', 'Field observation', 'Asking price', 'Agent']
const UNITS = ['Acres', 'Hectares', 'Square metres']
const BEDROOMS = ['Studio', '1', '2', '3', '4', '5', '6+']
const BATHROOMS = ['1', '2', '3', '4+']
const STOREYS = ['Single storey', 'Two storey', 'Three storey', 'Four storeys+']
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor']

const REQUIRED_HEADERS = [
  'Property Type *',
  'Region *',
  'Community *',
  'Land Use *',
  'Tenure Type *',
  'Price (GHS) *',
]

const HEADERS_TO_FIELD: Record<string, string> = {
  'Property Type *': 'property_type',
  'Region *': 'region',
  'District': 'district',
  'Community *': 'community',
  'GPS Coordinates': 'gps_coordinates',
  'Land Size': 'land_size',
  'Unit': 'unit',
  'Land Use *': 'land_use',
  'Tenure Type *': 'tenure_type',
  'Description': 'description',
  'Transaction Type': 'transaction_type',
  'Transaction Date': 'transaction_date',
  'Source': 'source',
  'Bedrooms': 'bedrooms',
  'Bathrooms': 'bathrooms',
  'Storeys': 'storeys',
  'Floor Area (sq.m)': 'floor_area',
  'Building Age (years)': 'building_age',
  'Condition': 'condition',
}

const HEADERS = Object.keys(HEADERS_TO_FIELD)

function addDropdownValidation(sheet: ExcelJS.Worksheet, colLetter: string, options: string[], startRow: number, endRow: number) {
  const formulaList = options.map((o) => `"${o}"`).join(',')
  for (let r = startRow; r <= endRow; r++) {
    ;(sheet.getCell(`${colLetter}${r}`) as any).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [formulaList],
      showErrorMessage: true,
      errorTitle: 'Invalid value',
      error: `Must be one of: ${options.join(', ')}`,
    }
  }
}

async function generateTemplate() {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'LAVA'
  wb.created = new Date()

  const ws = wb.addWorksheet('Template', { views: [{ state: 'frozen', ySplit: 1 }] })

  ws.columns = HEADERS.map((h) => ({ header: h, key: h, width: h.length + 6 }))

  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  headerRow.height = 28

  headerRow.eachCell((cell, colNumber) => {
    const header = HEADERS[colNumber - 1]
    const isRequired = REQUIRED_HEADERS.includes(header)
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isRequired ? 'FFC0392B' : 'FF2C3E50' },
    }
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF1A252F' } },
    }
  })

  const exampleLand = [
    'Land', 'Greater Accra', 'Osu Klottey', 'East Legon', '', '0.25', 'Acres',
    'Residential', 'Stool land', '', 'Sale', '2025-01-15', 'Direct transaction',
    '', '', '', '', '', '',
  ]
  const exampleDev = [
    'Developed', 'Ashanti', 'Adentan', 'Ashaiman', '5.6037, -0.1870', '1200', 'Square metres',
    'Residential', 'Freehold', '3-bedroom bungalow with parking', 'Sale', '2025-03-20', 'Client instruction',
    '3', '2', 'Two storey', '128.5', '5', 'Good',
  ]

  ws.addRow(exampleLand)
  ws.addRow(exampleDev)

  for (let r = 2; r <= 3; r++) {
    const row = ws.getRow(r)
    row.font = { italic: true, size: 10, color: { argb: 'FF7F8C8D' } }
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', wrapText: true }
    })
  }

  const numDataRows = 200
  const lastDataRow = 1 + numDataRows

  addDropdownValidation(ws, 'A', PROPERTY_TYPES, 2, lastDataRow)
  addDropdownValidation(ws, 'B', REGIONS, 2, lastDataRow)
  addDropdownValidation(ws, 'I', TENURE_TYPES, 2, lastDataRow)
  addDropdownValidation(ws, 'J', [], 2, lastDataRow)
  addDropdownValidation(ws, 'K', TRANSACTION_TYPES, 2, lastDataRow)
  addDropdownValidation(ws, 'M', SOURCES, 2, lastDataRow)
  addDropdownValidation(ws, 'G', UNITS, 2, lastDataRow)
  addDropdownValidation(ws, 'H', LAND_USES, 2, lastDataRow)
  addDropdownValidation(ws, 'N', BEDROOMS, 2, lastDataRow)
  addDropdownValidation(ws, 'O', BATHROOMS, 2, lastDataRow)
  addDropdownValidation(ws, 'P', STOREYS, 2, lastDataRow)
  addDropdownValidation(ws, 'R', CONDITIONS, 2, lastDataRow)

  const instWs = wb.addWorksheet('Instructions')
  instWs.columns = [{ width: 25 }, { width: 70 }]

  const titleRow = instWs.addRow(['LAVA Batch Upload — Instructions'])
  titleRow.font = { bold: true, size: 14, color: { argb: 'FF2C3E50' } }
  instWs.addRow([])

  const sectionTitle = instWs.addRow(['How to use this template'])
  sectionTitle.font = { bold: true, size: 11, color: { argb: 'FFC0392B' } }
  instWs.addRow(['1.', 'Go to the "Template" sheet and fill in your data starting from row 2.'])
  instWs.addRow(['2.', 'Required columns have a RED header with an asterisk (*). These must not be empty.'])
  instWs.addRow(['3.', 'Columns with dropdowns only accept the listed values. Use the dropdown to select.'])
  instWs.addRow(['4.', 'Remove the example rows (row 2 and 3 in italic) before uploading your own data.'])
  instWs.addRow(['5.', 'Save the file and upload it through the LAVA batch upload form.'])
  instWs.addRow([])

  const fieldSection = instWs.addRow(['Field Reference'])
  fieldSection.font = { bold: true, size: 11, color: { argb: 'FFC0392B' } }

  const fields: [string, string, string][] = [
    ['Property Type *', 'Land or Developed', 'Required'],
    ['Region *', 'One of the 10 Ghana regions', 'Required'],
    ['District', 'Free text', 'Optional'],
    ['Community *', 'Free text (town, area, neighbourhood)', 'Required'],
    ['GPS Coordinates', 'Format: latitude, longitude (e.g. 5.6037, -0.1870)', 'Optional'],
    ['Land Size', 'Number (e.g. 0.25)', 'Optional'],
    ['Unit', 'Acres, Hectares, or Square metres', 'Optional'],
    ['Land Use *', 'Residential / Commercial / Agricultural / Industrial / Mixed use', 'Required'],
    ['Tenure Type *', 'Stool land / Family land / State / vested / Freehold / Leasehold', 'Required'],
    ['Description', 'Free text — neighbourhood or property description', 'Optional'],
    ['Transaction Type', 'Sale / Lease / Rent / Asking price', 'Optional (defaults to Sale)'],
    ['Transaction Date', 'Format: YYYY-MM-DD', 'Optional'],
    ['Source', 'Direct transaction / Client instruction / Field observation / Asking price / Agent', 'Optional'],
    ['Bedrooms', 'Studio / 1 / 2 / 3 / 4 / 5 / 6+  (Developed only)', 'Optional'],
    ['Bathrooms', '1 / 2 / 3 / 4+  (Developed only)', 'Optional'],
    ['Storeys', 'Single storey / Two storey / Three storey / Four storeys+  (Developed only)', 'Optional'],
    ['Floor Area (sq.m)', 'Number (Developed only)', 'Optional'],
    ['Building Age (years)', 'Number (Developed only)', 'Optional'],
    ['Condition', 'Excellent / Good / Fair / Poor  (Developed only)', 'Optional'],
    ['Price (GHS) *', 'Number greater than 0 (Ghanaian Cedis)', 'Required'],
  ]

  for (const [field, desc, req] of fields) {
    const r = instWs.addRow([field, `${desc}  —  ${req}`])
    if (req === 'Required') {
      r.getCell(1).font = { bold: true, color: { argb: 'FFC0392B' } }
    }
  }

  instWs.addRow([])
  const noteRow = instWs.addRow(['Note:', 'Surveyor name, licence number, organisation, and email are auto-filled from your account.'])
  noteRow.getCell(1).font = { bold: true }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'LAVA_Batch_Upload_Template.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}

function parseUploadedFile(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const wb = new ExcelJS.Workbook()
        await wb.xlsx.load(e.target?.result as ArrayBuffer)
        const ws = wb.getWorksheet('Template') || wb.worksheets[0]
        if (!ws) {
          reject(new Error('No worksheet found in the file'))
          return
        }

        const headerRow = ws.getRow(1)
        const colMap: Record<number, string> = {}
        headerRow.eachCell((cell, colNumber) => {
          const val = String(cell.value || '').trim()
          if (HEADERS_TO_FIELD[val]) {
            colMap[colNumber] = HEADERS_TO_FIELD[val]
          }
        })

        const results: Record<string, any>[] = []
        ws.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return
          const record: Record<string, any> = {}
          let hasData = false
          for (const [colStr, field] of Object.entries(colMap)) {
            const colNum = parseInt(colStr)
            const cell = row.getCell(colNum)
            let val = cell.value
            if (val && typeof val === 'object' && 'result' in val) val = (val as any).result
            if (val !== null && val !== undefined && val !== '') {
              hasData = true
            }
            record[field] = val ?? ''
          }
          if (hasData) results.push(record)
        })

        resolve(results)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

function validateRows(rows: Record<string, any>[]): { row: number; field: string; message: string }[] {
  const errors: { row: number; field: string; message: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const rowNum = i + 2

    if (!r.region || !REGIONS.includes(r.region)) {
      errors.push({ row: rowNum, field: 'Region', message: `Must be one of: ${REGIONS.join(', ')}` })
    }
    if (!r.community || String(r.community).trim() === '') {
      errors.push({ row: rowNum, field: 'Community', message: 'Required field is empty' })
    }
    if (!r.land_use || !LAND_USES.includes(r.land_use)) {
      errors.push({ row: rowNum, field: 'Land Use', message: `Must be one of: ${LAND_USES.join(', ')}` })
    }
    if (!r.tenure_type || !TENURE_TYPES.includes(r.tenure_type)) {
      errors.push({ row: rowNum, field: 'Tenure Type', message: `Must be one of: ${TENURE_TYPES.join(', ')}` })
    }
    const price = parseFloat(r.price)
    if (isNaN(price) || price <= 0) {
      errors.push({ row: rowNum, field: 'Price', message: 'Must be a number greater than 0' })
    }
    if (r.property_type && !PROPERTY_TYPES.includes(r.property_type)) {
      errors.push({ row: rowNum, field: 'Property Type', message: `Must be Land or Developed` })
    }
    if (r.gps_coordinates && !/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(String(r.gps_coordinates).trim())) {
      errors.push({ row: rowNum, field: 'GPS Coordinates', message: 'Use format: latitude, longitude' })
    }
  }

  return errors
}

function toSubmitData(row: Record<string, any>) {
  return {
    property_type: (row.property_type || 'Land') as 'Land' | 'Developed',
    region: row.region || '',
    district: row.district || '',
    community: row.community || '',
    gps_coordinates: row.gps_coordinates || '',
    land_size: row.land_size !== '' && row.land_size != null ? parseFloat(row.land_size) : null,
    unit: row.unit || 'Acres',
    land_use: row.land_use || '',
    tenure_type: row.tenure_type || '',
    description: row.description || '',
    bedrooms: row.bedrooms || null,
    bathrooms: row.bathrooms || null,
    storeys: row.storeys || null,
    floor_area: row.floor_area !== '' && row.floor_area != null ? parseFloat(row.floor_area) : null,
    building_age: row.building_age !== '' && row.building_age != null ? parseInt(row.building_age) : null,
    condition: row.condition || null,
    transaction_type: row.transaction_type || 'Sale',
    price: parseFloat(row.price) || 0,
    transaction_date: row.transaction_date || null,
    source: row.source || 'Direct transaction',
  }
}

type Status = 'idle' | 'parsing' | 'validating' | 'uploading' | 'done'

export function BatchUpload({ onClose }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([])
  const [validationErrors, setValidationErrors] = useState<{ row: number; field: string; message: string }[]>([])
  const [serverErrors, setServerErrors] = useState<{ row: number; field: string; message: string }[]>([])
  const [createdCount, setCreatedCount] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please upload an Excel file (.xlsx)')
      return
    }
    setFileName(file.name)
    setStatus('parsing')
    try {
      const rows = await parseUploadedFile(file)
      if (rows.length === 0) {
        toast.error('No data rows found in the file')
        setStatus('idle')
        return
      }
      setParsedRows(rows)
      setStatus('validating')
      const errs = validateRows(rows)
      setValidationErrors(errs)
      if (errs.length > 0) {
        toast.error(`${errs.length} validation issue${errs.length > 1 ? 's' : ''} found. Please fix before uploading.`)
        setStatus('idle')
        return
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse file')
      setStatus('idle')
    }
  }, [])

  const handleUpload = useCallback(async () => {
    setStatus('uploading')
    setServerErrors([])
    try {
      const payloads = parsedRows.map(toSubmitData)
      const result = await submissionsApi.createBatch(payloads)
      setCreatedCount(result.created)
      setServerErrors(result.errors || [])
      setStatus('done')
      if (result.errors.length > 0) {
        toast.success(`${result.created} submissions created. ${result.errors.length} had errors.`)
      } else {
        toast.success(`${result.created} submissions created successfully!`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
      setStatus('idle')
    }
  }, [parsedRows])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const reset = useCallback(() => {
    setStatus('idle')
    setParsedRows([])
    setValidationErrors([])
    setServerErrors([])
    setCreatedCount(0)
    setFileName('')
  }, [])

  return (
    <motion.div
      className="modalWrap"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        className="authModal"
        style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18 }}
      >
        <button className="authClose" onClick={onClose}>
          <X size={18} />
        </button>

        <h2>Batch Upload</h2>
        <p>Upload multiple property submissions at once via Excel.</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            className="button outline"
            style={{ flex: 1, fontSize: 13 }}
            onClick={generateTemplate}
            type="button"
          >
            <Download size={15} style={{ marginRight: 6 }} />
            Download Template
          </button>
          <button
            className="button ghost"
            style={{ fontSize: 13 }}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
        </div>

        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--gold, #D4A853)' : 'var(--border, #E0DDD5)'}`,
                  borderRadius: 10,
                  padding: '32px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragOver ? 'rgba(212, 168, 83, 0.06)' : 'transparent',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <Upload size={28} style={{ color: 'var(--muted, #8A8680)', marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink, #1A1A1A)' }}>
                  Drag and drop your Excel file here
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted, #8A8680)', marginTop: 4 }}>
                  or click to browse — .xlsx files only
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            </motion.div>
          )}

          {status === 'parsing' && (
            <motion.div
              key="parsing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: 'center', padding: '24px 0' }}
            >
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--gold, #D4A853)' }} />
              <div style={{ fontSize: 13, color: 'var(--muted, #8A8680)', marginTop: 8 }}>Reading {fileName}…</div>
            </motion.div>
          )}

          {status === 'validating' && parsedRows.length > 0 && validationErrors.length === 0 && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 14px', background: 'rgba(39, 174, 96, 0.08)', borderRadius: 8, border: '1px solid rgba(39, 174, 96, 0.2)' }}>
                <CheckCircle size={16} style={{ color: '#27AE60', flexShrink: 0 }} />
                <div style={{ fontSize: 13 }}>
                  <strong>{parsedRows.length}</strong> rows read from <strong>{fileName}</strong> — all valid
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="button" style={{ flex: 1, fontSize: 13 }} onClick={handleUpload} type="button">
                  Upload {parsedRows.length} Submissions
                </button>
                <button className="button ghost" style={{ fontSize: 13 }} onClick={reset} type="button">
                  Choose another file
                </button>
              </div>
            </motion.div>
          )}

          {status === 'validating' && validationErrors.length > 0 && (
            <motion.div
              key="errors"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 14px', background: 'rgba(192, 57, 43, 0.08)', borderRadius: 8, border: '1px solid rgba(192, 57, 43, 0.2)' }}>
                <AlertCircle size={16} style={{ color: '#C0392B', flexShrink: 0 }} />
                <div style={{ fontSize: 13 }}>
                  <strong>{validationErrors.length}</strong> validation issue{validationErrors.length > 1 ? 's' : ''} found
                </div>
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12, border: '1px solid var(--border, #E0DDD5)', borderRadius: 8 }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--mist, #F5F3EE)' }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Row</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Field</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationErrors.slice(0, 30).map((e, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--border, #E0DDD5)' }}>
                        <td style={{ padding: '5px 10px' }}>{e.row}</td>
                        <td style={{ padding: '5px 10px', fontWeight: 500 }}>{e.field}</td>
                        <td style={{ padding: '5px 10px', color: 'var(--muted, #8A8680)' }}>{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {validationErrors.length > 30 && (
                  <div style={{ padding: '6px 10px', fontSize: 11, color: 'var(--muted, #8A8680)', textAlign: 'center' }}>
                    …and {validationErrors.length - 30} more
                  </div>
                )}
              </div>
              <button className="button ghost" style={{ width: '100%', fontSize: 13 }} onClick={reset} type="button">
                Fix and try again
              </button>
            </motion.div>
          )}

          {status === 'uploading' && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: 'center', padding: '24px 0' }}
            >
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--gold, #D4A853)' }} />
              <div style={{ fontSize: 13, color: 'var(--muted, #8A8680)', marginTop: 8 }}>
                Uploading {parsedRows.length} submissions…
              </div>
            </motion.div>
          )}

          {status === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 14px', background: 'rgba(39, 174, 96, 0.08)', borderRadius: 8, border: '1px solid rgba(39, 174, 96, 0.2)' }}>
                <CheckCircle size={16} style={{ color: '#27AE60', flexShrink: 0 }} />
                <div style={{ fontSize: 13 }}>
                  <strong>{createdCount}</strong> submission{createdCount !== 1 ? 's' : ''} created and added to the verification queue
                </div>
              </div>
              {serverErrors.length > 0 && (
                <div style={{ maxHeight: 150, overflowY: 'auto', marginBottom: 12, border: '1px solid var(--border, #E0DDD5)', borderRadius: 8 }}>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--mist, #F5F3EE)' }}>
                        <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Row</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serverErrors.map((e, i) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--border, #E0DDD5)' }}>
                          <td style={{ padding: '5px 10px' }}>{e.row}</td>
                          <td style={{ padding: '5px 10px', color: 'var(--muted, #8A8680)' }}>{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="button outline" style={{ flex: 1, fontSize: 13 }} onClick={reset} type="button">
                  Upload more
                </button>
                <button className="button" style={{ fontSize: 13 }} onClick={onClose} type="button">
                  Done
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
