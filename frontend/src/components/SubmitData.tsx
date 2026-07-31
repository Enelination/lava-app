import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { submissions as submissionsApi } from '../lib/api'
import { useAuth } from '../store/authStore'

const regions = [
  'Greater Accra', 'Ashanti', 'Eastern', 'Western', 'Central', 'Northern',
  'Upper East', 'Upper West', 'Volta', 'Bono',
]

function Field({ label, select, options = [], full, ...rest }: any) {
  return (
    <label className={`field ${full ? 'full' : ''}`}>
      <span>{label}</span>
      {select ? (
        <select {...rest}>
          {options.map((o: string) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input {...rest} />
      )}
    </label>
  )
}

export function SubmitData() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    property_type: 'Land',
    region: '',
    district: '',
    community: '',
    gps_coordinates: '',
    land_size: '',
    unit: 'Acres',
    land_use: '',
    tenure_type: '',
    description: '',
    bedrooms: '',
    bathrooms: '',
    storeys: '',
    floor_area: '',
    building_age: '',
    condition: '',
    transaction_type: 'Sale',
    price: '',
    transaction_date: '',
    source: 'Direct transaction',
  })

  const isDev = form.property_type === 'Developed'

  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async () => {
    if (!form.region || !form.community || !form.land_use || !form.tenure_type || !form.price) {
      toast.error('Fill in all required fields.')
      return
    }
    setLoading(true)
    try {
      await submissionsApi.create({
        ...form,
        property_type: form.property_type as 'Land' | 'Developed',
        land_size: form.land_size ? parseFloat(form.land_size) : null,
        price: parseFloat(form.price),
        floor_area: form.floor_area ? parseFloat(form.floor_area) : null,
        building_age: form.building_age ? parseInt(form.building_age) : null,
        surveyor_name: user?.name || '',
        licence_number: user?.licence_number || '',
        organisation: user?.organisation || '',
        email: user?.email || '',
      })
      toast.success('Submission saved! Now in the verification queue.')
      setForm({
        property_type: 'Land', region: '', district: '', community: '', gps_coordinates: '',
        land_size: '', unit: 'Acres', land_use: '', tenure_type: '', description: '',
        bedrooms: '', bathrooms: '', storeys: '', floor_area: '', building_age: '', condition: '',
        transaction_type: 'Sale', price: '', transaction_date: '', source: 'Direct transaction',
      })
    } catch (err: any) {
      toast.error(err.message || 'Error saving submission.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="pageHead">
        <div className="welcome">
          <div className="crumb">Contribute to LAVA</div>
          <h1>Submit <em>transaction data.</em></h1>
          <p>Every submission enters a professional verification workflow before it supports valuation research.</p>
        </div>
      </div>

      <form
        className="panel formCard"
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
      >
        <div className="formSection">
          <div className="sectionTitle">
            <span className="sectionNum">01</span>
            <div>
              <h3 style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'none', letterSpacing: '0.02em' }}>
                Property details
              </h3>
              <p className="font-sans text-[11px] text-muted mt-0.5" style={{ textTransform: 'none' }}>
                Describe the asset and its location.
              </p>
            </div>
          </div>

          <div className="typeSwitch mb-6">
            <button
              type="button"
              className={form.property_type === 'Land' ? 'selected' : ''}
              onClick={() => update('property_type', 'Land')}
            >
              ◫ Undeveloped land
            </button>
            <button
              type="button"
              className={form.property_type === 'Developed' ? 'selected' : ''}
              onClick={() => update('property_type', 'Developed')}
            >
              ▦ Developed property
            </button>
          </div>

          <div className="fields">
            <Field label="Region *" select options={regions} value={form.region} onChange={(e: any) => update('region', e.target.value)} />
            <Field label="District" placeholder="e.g. Tema West" value={form.district} onChange={(e: any) => update('district', e.target.value)} />
            <Field label="Community *" placeholder="e.g. Community 25" value={form.community} onChange={(e: any) => update('community', e.target.value)} />
            <Field label="GPS coordinates" placeholder="e.g. 5.6037, -0.1870" value={form.gps_coordinates} onChange={(e: any) => update('gps_coordinates', e.target.value)} />
            <Field label="Land size" type="number" step="0.01" placeholder="0.25" value={form.land_size} onChange={(e: any) => update('land_size', e.target.value)} />
            <Field label="Unit" select options={['Acres', 'Hectares', 'Square metres']} value={form.unit} onChange={(e: any) => update('unit', e.target.value)} />
            <Field label="Land use *" select options={['Residential', 'Commercial', 'Agricultural', 'Industrial', 'Mixed use']} value={form.land_use} onChange={(e: any) => update('land_use', e.target.value)} />
            <Field label="Tenure type *" select options={['Stool land', 'Family land', 'State / vested', 'Freehold', 'Leasehold']} value={form.tenure_type} onChange={(e: any) => update('tenure_type', e.target.value)} />
            <Field label="Neighbourhood description" full textarea placeholder="Road access, utilities, landmarks…" value={form.description} onChange={(e: any) => update('description', e.target.value)} />
          </div>

          {isDev && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
              <div className="sectionTitle mt-6" style={{ color: 'var(--ink)' }}>
                <span className="sectionNum">·</span>
                <div>
                  <h3 style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink)', textTransform: 'none', letterSpacing: '0.02em' }}>
                    Building details
                  </h3>
                </div>
              </div>
              <div className="fields">
                <Field label="Bedrooms" select options={['Studio', '1', '2', '3', '4', '5', '6+']} value={form.bedrooms} onChange={(e: any) => update('bedrooms', e.target.value)} />
                <Field label="Bathrooms" select options={['1', '2', '3', '4+']} value={form.bathrooms} onChange={(e: any) => update('bathrooms', e.target.value)} />
                <Field label="Storeys" select options={['Single storey', 'Two storey', 'Three storey', 'Four storeys+']} value={form.storeys} onChange={(e: any) => update('storeys', e.target.value)} />
                <Field label="Floor area (sq.m)" type="number" step="0.1" placeholder="e.g. 128.5" value={form.floor_area} onChange={(e: any) => update('floor_area', e.target.value)} />
                <Field label="Age of building (years)" type="number" placeholder="e.g. 5" value={form.building_age} onChange={(e: any) => update('building_age', e.target.value)} />
                <Field label="Condition" select options={['Excellent', 'Good', 'Fair', 'Poor']} value={form.condition} onChange={(e: any) => update('condition', e.target.value)} />
              </div>
            </motion.div>
          )}
        </div>

        <div className="formSection">
          <div className="sectionTitle">
            <span className="sectionNum">02</span>
            <div>
              <h3 style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'none', letterSpacing: '0.02em' }}>
                Transaction details
              </h3>
              <p className="font-sans text-[11px] text-muted mt-0.5" style={{ textTransform: 'none' }}>
                Help reviewers establish a reliable market record.
              </p>
            </div>
          </div>

          <div className="fields">
            <Field label="Transaction type" select options={['Sale', 'Lease', 'Rent', 'Asking price']} value={form.transaction_type} onChange={(e: any) => update('transaction_type', e.target.value)} />
            <Field label="Price (GHS) *" type="number" placeholder="250000" value={form.price} onChange={(e: any) => update('price', e.target.value)} />
            <Field label="Transaction date" type="date" value={form.transaction_date} onChange={(e: any) => update('transaction_date', e.target.value)} />
            <Field label="Source" select options={['Direct transaction', 'Client instruction', 'Field observation', 'Asking price', 'Agent']} value={form.source} onChange={(e: any) => update('source', e.target.value)} />
          </div>

          {user && (
            <div className="autoBox mt-6">
              <div className="font-mono text-[9px] uppercase tracking-[0.09em] text-muted mb-3">
                Surveyor details (auto-filled)
              </div>
              <div className="autoRow">
                <span>Name: <strong>{user.name}</strong></span>
                <span>Licence: <strong>{user.licence_number || 'N/A'}</strong></span>
                {user.organisation && <span>Organisation: <strong>{user.organisation}</strong></span>}
              </div>
            </div>
          )}
        </div>

        <div className="submitBar">
          <p className="text-[11px] text-muted max-w-md">
            By submitting, you confirm that this information is accurate to the best of your professional knowledge.
          </p>
          <button type="submit" disabled={loading} className="button">
            {loading ? 'Submitting…' : <>Submit for verification <span>→</span></>}
          </button>
        </div>
      </form>
    </div>
  )
}
