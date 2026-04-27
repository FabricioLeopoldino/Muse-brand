import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Edit2, Trash2, X, ChevronDown, Package, Beaker, Layers, FlaskConical, TrendingUp, Printer } from 'lucide-react'
import axios from 'axios'
import JsBarcode from 'jsbarcode'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import ConfirmModal from '../components/ConfirmModal.jsx'
import { useToast } from '../App.jsx'

function api() { return { headers: { Authorization: `Bearer ${localStorage.getItem('sm_token')}` } } }

const CATEGORIES = [
  { key: 'ALL', label: 'All' },
  { key: 'FRAGRANCE', label: 'Fragrance', unit: 'ml', barcode: false },
  { key: 'RAW_MATERIALS', label: 'Raw Materials', barcode: true },
  { key: 'COMPONENTS', label: 'Components', unit: 'units', barcode: true },
  { key: 'FINISHED_GOODS', label: 'Finished Goods', unit: 'units', barcode: true },
  { key: 'READY_FORMULA', label: 'Ready Formula', unit: 'ml', barcode: false },
]

const CAT_COLORS = {
  FRAGRANCE: '#a78bfa',
  RAW_MATERIALS: '#fbbf24',
  COMPONENTS: '#60a5fa',
  FINISHED_GOODS: '#4ade80',
  READY_FORMULA: '#fb923c',
}

const EMPTY_FORM = {
  name: '', product_code: '', category: 'FRAGRANCE', sub_category: '',
  unit: 'ml', current_stock: '', min_stock_level: '',
  supplier: '', supplier_code: '', bin_location: '', barcode: '',
  lead_time: '', notes: ''
}

function requiresBarcode(cat) {
  return ['RAW_MATERIALS', 'COMPONENTS', 'FINISHED_GOODS'].includes(cat)
}

function defaultUnit(cat) {
  if (cat === 'FRAGRANCE' || cat === 'READY_FORMULA') return 'ml'
  if (cat === 'RAW_MATERIALS') return 'ml'
  return 'units'
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [strengthTarget, setStrengthTarget] = useState(null)
  const [strengthLog, setStrengthLog] = useState([])
  const [strengthLoading, setStrengthLoading] = useState(false)
  const [barcodeTarget, setBarcodeTarget] = useState(null)
  const [barcodeCopies, setBarcodeCopies] = useState(1)
  const svgRef = useRef(null)
  const { addToast } = useToast()

  useEffect(() => { loadProducts(); loadSuppliers() }, [])

  async function loadProducts() {
    setLoading(true)
    try {
      const params = {}
      if (filter !== 'ALL') params.category = filter
      if (search) params.search = search
      const res = await axios.get('/api/products', { ...api(), params })
      setProducts(res.data)
    } catch { addToast('Failed to load products', 'error') }
    finally { setLoading(false) }
  }

  async function loadSuppliers() {
    try {
      const res = await axios.get('/api/suppliers', api())
      setSuppliers(res.data)
    } catch {}
  }

  function openBarcode(product) {
    setBarcodeTarget(product)
    setBarcodeCopies(1)
  }

  function printBarcode() {
    if (!barcodeTarget) return
    const copies = Math.max(1, Math.min(parseInt(barcodeCopies) || 1, 100))
    const win = window.open('', '_blank', 'width=600,height=500')

    // Build one barcode SVG
    const tmpSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    JsBarcode(tmpSvg, barcodeTarget.barcode, {
      format: 'CODE128', lineColor: '#000', background: '#fff',
      width: 2, height: 60, displayValue: true,
      font: 'monospace', fontSize: 11, margin: 8,
    })
    const svgStr = tmpSvg.outerHTML

    const labels = Array.from({ length: copies }, (_, i) => `
      <div class="label">
        <div class="name">${barcodeTarget.name}</div>
        ${svgStr}
        <div class="code">${barcodeTarget.product_code}</div>
      </div>`).join('')

    win.document.write(`<!DOCTYPE html><html><head><title>Barcode — ${barcodeTarget.name}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: monospace; background: #fff; padding: 12px; }
        .grid { display: flex; flex-wrap: wrap; gap: 8px; }
        .label { border: 1px dashed #ccc; border-radius: 4px; padding: 8px 12px;
                 text-align: center; width: 200px; page-break-inside: avoid; }
        .name { font-size: 11px; font-weight: bold; margin-bottom: 4px;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .code { font-size: 10px; color: #666; margin-top: 2px; }
        svg { max-width: 100%; height: auto; }
        @media print { body { padding: 0; } }
      </style></head>
      <body><div class="grid">${labels}</div>
      <script>window.onload = () => { window.print(); }<\/script>
      </body></html>`)
    win.document.close()
  }

  async function openStrengthLog(product) {
    setStrengthTarget(product)
    setStrengthLog([])
    setStrengthLoading(true)
    try {
      const res = await axios.get(`/api/fragrances/${product.id}/strength-log`, api())
      setStrengthLog(res.data)
    } catch { addToast('Failed to load strength log', 'error') }
    finally { setStrengthLoading(false) }
  }

  useEffect(() => { loadProducts() }, [filter, search])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(product) {
    setEditing(product)
    setForm({
      name: product.name || '',
      product_code: product.product_code || '',
      category: product.category || 'FRAGRANCE',
      sub_category: product.sub_category || '',
      unit: product.unit || 'ml',
      current_stock: product.current_stock ?? '',
      min_stock_level: product.min_stock_level ?? '',
      supplier: product.supplier || '',
      supplier_code: product.supplier_code || '',
      bin_location: product.bin_location || '',
      barcode: product.barcode || '',
      lead_time: product.lead_time || '',
      notes: product.notes || '',
    })
    setShowModal(true)
  }

  function handleCategoryChange(cat) {
    setForm(f => ({ ...f, category: cat, unit: defaultUnit(cat) }))
  }

  async function handleSave() {
    if (!form.name.trim()) { addToast('Name is required', 'error'); return }
    if (!form.product_code.trim()) { addToast('Product code is required', 'error'); return }
    if (requiresBarcode(form.category) && !form.barcode.trim()) {
      addToast(`Barcode is required for ${form.category}`, 'error'); return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        current_stock: parseFloat(form.current_stock) || 0,
        min_stock_level: parseFloat(form.min_stock_level) || 0,
        lead_time: parseInt(form.lead_time) || null,
      }
      if (editing) {
        await axios.put(`/api/products/${editing.id}`, payload, api())
        addToast('Product updated')
      } else {
        await axios.post('/api/products', payload, api())
        addToast('Product created')
      }
      setShowModal(false)
      loadProducts()
    } catch (e) {
      addToast(e.response?.data?.error || 'Save failed', 'error')
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    try {
      await axios.delete(`/api/products/${deleteTarget.id}`, api())
      addToast('Product deleted')
      setDeleteTarget(null)
      loadProducts()
    } catch (e) {
      addToast(e.response?.data?.error || 'Delete failed', 'error')
    }
  }

  const displayed = products.filter(p =>
    (filter === 'ALL' || p.category === filter) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.product_code.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode || '').toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 22, color: '#e8eaf2' }}>Products</h1>
        <button onClick={openCreate} style={{
          background: '#2563eb', color: 'white', border: 'none', borderRadius: 8,
          padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          <Plus size={15} /> New Product
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => setFilter(c.key)} style={{
            background: filter === c.key ? (CAT_COLORS[c.key] || '#22c55e') : 'rgba(255,255,255,0.05)',
            color: filter === c.key ? (c.key === 'ALL' ? 'white' : '#0e0e1a') : 'rgba(232,234,242,0.6)',
            border: filter === c.key ? 'none' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: '5px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
          }}>{c.label}</button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 360 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(232,234,242,0.4)' }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, code or barcode..."
          style={{
            width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '8px 12px 8px 34px', color: '#e8eaf2', fontSize: 13, outline: 'none'
          }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ color: 'rgba(232,234,242,0.4)', fontSize: 14 }}>Loading...</div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Category', 'Name', 'Code', 'Stock', 'Min Level', 'Bin', 'Barcode', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(232,234,242,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '32px 14px', textAlign: 'center', color: 'rgba(232,234,242,0.3)', fontSize: 13 }}>No products found</td></tr>
              ) : displayed.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      background: `${CAT_COLORS[p.category]}20`, color: CAT_COLORS[p.category],
                      padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700
                    }}>{p.category.replace('_', ' ')}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf2' }}>{p.name}</div>
                    {p.supplier && <div style={{ fontSize: 11, color: 'rgba(232,234,242,0.4)' }}>{p.supplier}</div>}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(232,234,242,0.6)', fontFamily: 'monospace' }}>{p.product_code}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: p.current_stock <= 0 ? '#f87171' : p.current_stock <= p.min_stock_level ? '#fbbf24' : '#4ade80'
                    }}>
                      {Number(p.current_stock).toLocaleString()} {p.unit === 'ml' && Number(p.current_stock) >= 1000 ? `(${(p.current_stock / 1000).toFixed(2)}L)` : p.unit}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(232,234,242,0.5)' }}>
                    {p.min_stock_level > 0 ? `${Number(p.min_stock_level).toLocaleString()} ${p.unit}` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(232,234,242,0.5)' }}>{p.bin_location || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: 'rgba(232,234,242,0.5)', fontFamily: 'monospace' }}>
                    {p.barcode || (requiresBarcode(p.category) ? <span style={{ color: '#f87171' }}>⚠ Missing</span> : '—')}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {p.category === 'FRAGRANCE' && (
                        <button onClick={() => openStrengthLog(p)} title="Oil % History" style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#a78bfa' }}>
                          <TrendingUp size={13} />
                        </button>
                      )}
                      {p.barcode && (
                        <button onClick={() => openBarcode(p)} title="Print Barcode" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#10b981' }}>
                          <Printer size={13} />
                        </button>
                      )}
                      <button onClick={() => openEdit(p)} style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#60a5fa' }}>
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => setDeleteTarget(p)} style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#f87171' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: 'rgba(232,234,242,0.35)' }}>
            {displayed.length} product{displayed.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8000 }}>
          <div style={{
            background: '#13132b', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14, padding: 32, width: '100%', maxWidth: 560,
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 17, color: '#e8eaf2' }}>
                {editing ? 'Edit Product' : 'New Product'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,234,242,0.5)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Category" full>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {CATEGORIES.filter(c => c.key !== 'ALL').map(c => (
                    <button key={c.key} onClick={() => handleCategoryChange(c.key)} style={{
                      background: form.category === c.key ? `${CAT_COLORS[c.key]}25` : 'rgba(255,255,255,0.05)',
                      border: form.category === c.key ? `1px solid ${CAT_COLORS[c.key]}` : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      color: form.category === c.key ? CAT_COLORS[c.key] : 'rgba(232,234,242,0.55)'
                    }}>{c.label}</button>
                  ))}
                </div>
              </Field>

              <Field label="Name *" full>
                <Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Santal Black" />
              </Field>

              <Field label="Product Code *">
                <Input value={form.product_code} onChange={v => setForm(f => ({ ...f, product_code: v.toUpperCase() }))} placeholder="e.g. FRAG-001" mono />
              </Field>

              <Field label="Unit">
                <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={selectStyle}>
                  <option value="ml">ml</option>
                  <option value="units">units</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                </select>
              </Field>

              {!editing && (
                <Field label="Initial Stock">
                  <Input type="number" value={form.current_stock} onChange={v => setForm(f => ({ ...f, current_stock: v }))} placeholder="0" />
                </Field>
              )}

              <Field label="Min Stock Level">
                <Input type="number" value={form.min_stock_level} onChange={v => setForm(f => ({ ...f, min_stock_level: v }))} placeholder="0" />
              </Field>

              <Field label={`Barcode${requiresBarcode(form.category) ? ' *' : ''}`}>
                <Input value={form.barcode} onChange={v => setForm(f => ({ ...f, barcode: v }))} placeholder="Scan or type..." mono />
              </Field>

              <Field label="Bin Location">
                <Input value={form.bin_location} onChange={v => setForm(f => ({ ...f, bin_location: v }))} placeholder="e.g. A1-B3" />
              </Field>

              <Field label="Supplier">
                <Input value={form.supplier} onChange={v => setForm(f => ({ ...f, supplier: v }))} placeholder="Supplier name" />
              </Field>

              <Field label="Supplier Code">
                <Input value={form.supplier_code} onChange={v => setForm(f => ({ ...f, supplier_code: v }))} placeholder="Supplier's SKU" mono />
              </Field>

              <Field label="Lead Time (days)">
                <Input type="number" value={form.lead_time} onChange={v => setForm(f => ({ ...f, lead_time: v }))} placeholder="e.g. 14" />
              </Field>

              <Field label="Sub-category">
                <Input value={form.sub_category} onChange={v => setForm(f => ({ ...f, sub_category: v }))} placeholder="Optional" />
              </Field>

              <Field label="Notes" full>
                <textarea
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Optional notes..."
                  style={{ ...inputStyle, resize: 'vertical', width: '100%' }}
                />
              </Field>
            </div>

            {requiresBarcode(form.category) && !form.barcode && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, fontSize: 12, color: '#f87171' }}>
                ⚠ Barcode is required for {form.category.replace('_', ' ')}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 20px', color: '#e8eaf2', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} style={{ background: '#2563eb', border: 'none', borderRadius: 8, padding: '9px 20px', color: 'white', fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Print Modal */}
      {barcodeTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8000 }}>
          <div style={{ background: '#13132b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 17, color: '#e8eaf2' }}>Print Barcode</h2>
                <div style={{ fontSize: 12, color: '#10b981', marginTop: 2 }}>{barcodeTarget.name}</div>
              </div>
              <button onClick={() => setBarcodeTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,234,242,0.5)' }}><X size={18} /></button>
            </div>

            {/* Barcode preview */}
            <div style={{ background: '#fff', borderRadius: 8, padding: '16px 12px', marginBottom: 18, textAlign: 'center' }}>
              <BarcodePreview value={barcodeTarget.barcode} />
              <div style={{ fontSize: 10, color: '#666', marginTop: 4, fontFamily: 'monospace' }}>{barcodeTarget.product_code}</div>
            </div>

            {/* Barcode string info */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', marginBottom: 18 }}>
              <div style={{ fontSize: 10, color: 'rgba(232,234,242,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Barcode Value (CODE128)</div>
              <div style={{ fontSize: 13, fontFamily: 'monospace', color: '#e8eaf2', fontWeight: 700 }}>{barcodeTarget.barcode}</div>
            </div>

            {/* Copies */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(232,234,242,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Copies</label>
              <input
                type="number" min={1} max={100} value={barcodeCopies}
                onChange={e => setBarcodeCopies(e.target.value)}
                style={{ width: 80, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '7px 10px', color: '#e8eaf2', fontSize: 13, outline: 'none', textAlign: 'center' }}
              />
              <span style={{ fontSize: 11, color: 'rgba(232,234,242,0.4)' }}>labels per sheet</span>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setBarcodeTarget(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 0', color: '#e8eaf2', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={printBarcode} style={{ flex: 2, background: '#10b981', border: 'none', borderRadius: 8, padding: '9px 0', color: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Printer size={14} /> Print {barcodeCopies > 1 ? `${barcodeCopies} Labels` : 'Label'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strength Log Modal */}
      {strengthTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8000 }}>
          <div style={{ background: '#13132b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 640, maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 17, color: '#e8eaf2' }}>Oil % History</h2>
                <div style={{ fontSize: 12, color: '#a78bfa', marginTop: 2 }}>{strengthTarget.name}</div>
              </div>
              <button onClick={() => setStrengthTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,234,242,0.5)' }}><X size={18} /></button>
            </div>

            {strengthLoading ? (
              <div style={{ color: 'rgba(232,234,242,0.4)', fontSize: 13, padding: '32px 0', textAlign: 'center' }}>Loading...</div>
            ) : strengthLog.length === 0 ? (
              <div style={{ color: 'rgba(232,234,242,0.3)', fontSize: 13, padding: '32px 0', textAlign: 'center' }}>No usage history yet — log entries are created automatically when production orders are completed.</div>
            ) : (
              <>
                {/* Summary chips */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Uses', value: strengthLog.length },
                    { label: 'Avg %', value: (strengthLog.reduce((s, r) => s + parseFloat(r.actual_pct_used), 0) / strengthLog.length).toFixed(1) + '%' },
                    { label: 'Adjusted', value: strengthLog.filter(r => r.was_adjusted).length, warn: true },
                  ].map(c => (
                    <div key={c.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: c.warn && c.value > 0 ? '#fbbf24' : '#e8eaf2' }}>{c.value}</div>
                      <div style={{ fontSize: 10, color: 'rgba(232,234,242,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.label}</div>
                    </div>
                  ))}
                </div>

                {/* Sparkline chart */}
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '16px 8px', marginBottom: 20 }}>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={[...strengthLog].reverse().map((r, i) => ({ i: i + 1, pct: parseFloat(r.actual_pct_used), date: r.date_used }))}>
                      <XAxis dataKey="i" hide />
                      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: 'rgba(232,234,242,0.4)' }} width={28} />
                      <Tooltip
                        contentStyle={{ background: '#1e1e3a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                        labelFormatter={i => `Batch #${i}`}
                        formatter={v => [`${v}%`, 'Oil %']}
                      />
                      <ReferenceLine y={25} stroke="rgba(167,139,250,0.3)" strokeDasharray="3 3" />
                      <Line type="monotone" dataKey="pct" stroke="#a78bfa" strokeWidth={2} dot={{ fill: '#a78bfa', r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{ fontSize: 10, color: 'rgba(232,234,242,0.25)', textAlign: 'center', marginTop: 4 }}>Dashed line = 25% standard</div>
                </div>

                {/* History table */}
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        {['Date', 'Standard %', 'Actual %', 'Adjusted', 'PO', 'Reason', 'By'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(232,234,242,0.4)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {strengthLog.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '7px 12px', fontSize: 11, color: 'rgba(232,234,242,0.5)' }}>{r.date_used ? new Date(r.date_used).toLocaleDateString('en-AU') : '—'}</td>
                          <td style={{ padding: '7px 12px', fontSize: 12, color: 'rgba(232,234,242,0.6)' }}>{r.standard_pct}%</td>
                          <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: 700, color: r.was_adjusted ? '#fbbf24' : '#a78bfa' }}>{r.actual_pct_used}%</td>
                          <td style={{ padding: '7px 12px' }}>
                            {r.was_adjusted
                              ? <span style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>Yes</span>
                              : <span style={{ color: 'rgba(232,234,242,0.3)', fontSize: 11 }}>—</span>}
                          </td>
                          <td style={{ padding: '7px 12px', fontSize: 11, color: 'rgba(232,234,242,0.4)', fontFamily: 'monospace' }}>{r.production_order_id ? `#${r.production_order_id}` : '—'}</td>
                          <td style={{ padding: '7px 12px', fontSize: 11, color: 'rgba(232,234,242,0.45)', maxWidth: 140 }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.adjustment_reason || '—'}</div>
                          </td>
                          <td style={{ padding: '7px 12px', fontSize: 11, color: 'rgba(232,234,242,0.4)' }}>{r.created_by_name || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Product"
          message={`Delete "${deleteTarget.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ─── Barcode Preview ───
function BarcodePreview({ value }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current || !value) return
    try {
      JsBarcode(ref.current, value, {
        format: 'CODE128', lineColor: '#000', background: '#fff',
        width: 2, height: 60, displayValue: true,
        font: 'monospace', fontSize: 11, margin: 6,
      })
    } catch (e) {
      // invalid barcode value — leave empty
    }
  }, [value])
  return <svg ref={ref} style={{ maxWidth: '100%' }} />
}

// ─── Helpers ───
function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(232,234,242,0.5)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8, padding: '8px 12px', color: '#e8eaf2', fontSize: 13, outline: 'none', width: '100%'
}
const selectStyle = { ...inputStyle, cursor: 'pointer' }

function Input({ value, onChange, placeholder, type = 'text', mono }) {
  return (
    <input
      type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{ ...inputStyle, fontFamily: mono ? 'monospace' : 'inherit' }}
    />
  )
}
