import { useState, useEffect } from 'react'
import { Search, Plus, Minus, SlidersHorizontal, X, History } from 'lucide-react'
import axios from 'axios'
import { useToast } from '../App.jsx'

function api() { return { headers: { Authorization: `Bearer ${localStorage.getItem('sm_token')}` } } }

const CATEGORIES = [
  { key: 'ALL', label: 'All' },
  { key: 'FRAGRANCE', label: 'Fragrance' },
  { key: 'RAW_MATERIALS', label: 'Raw Materials' },
  { key: 'COMPONENTS', label: 'Components' },
  { key: 'FINISHED_GOODS', label: 'Finished Goods' },
  { key: 'READY_FORMULA', label: 'Ready Formula' },
]

const CAT_COLORS = {
  FRAGRANCE: '#a78bfa',
  RAW_MATERIALS: '#fbbf24',
  COMPONENTS: '#60a5fa',
  FINISHED_GOODS: '#4ade80',
  READY_FORMULA: '#fb923c',
}

function stockColor(current, min) {
  if (current <= 0) return '#f87171'
  if (min > 0 && current <= min) return '#fbbf24'
  return '#4ade80'
}

function formatStock(qty, unit) {
  const n = Number(qty)
  if (unit === 'ml' && n >= 1000) return `${n.toLocaleString()} ml (${(n / 1000).toFixed(2)} L)`
  return `${n.toLocaleString()} ${unit}`
}

export default function StockManagement() {
  const [products, setProducts] = useState([])
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionModal, setActionModal] = useState(null) // { product, type: 'add'|'remove'|'adjust' }
  const [qty, setQty] = useState('')
  const [newStock, setNewStock] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [historyModal, setHistoryModal] = useState(null)
  const [history, setHistory] = useState([])
  const { addToast } = useToast()

  useEffect(() => { loadProducts() }, [filter, search])

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

  async function handleAction() {
    if (!actionModal) return
    setSaving(true)
    try {
      const { product, type } = actionModal
      if (type === 'adjust') {
        if (newStock === '') { addToast('Enter new stock value', 'error'); return }
        await axios.post('/api/stock/adjust', { product_id: product.id, new_stock: parseFloat(newStock), notes: notes || null }, api())
      } else {
        if (!qty || parseFloat(qty) <= 0) { addToast('Enter a valid quantity', 'error'); return }
        await axios.post(`/api/stock/${type}`, { product_id: product.id, quantity: parseFloat(qty), notes: notes || null }, api())
      }
      addToast(`Stock ${type === 'add' ? 'added' : type === 'remove' ? 'removed' : 'adjusted'} successfully`)
      setActionModal(null)
      setQty(''); setNewStock(''); setNotes('')
      loadProducts()
    } catch (e) {
      addToast(e.response?.data?.error || 'Failed', 'error')
    } finally { setSaving(false) }
  }

  async function openHistory(product) {
    setHistoryModal(product)
    try {
      const res = await axios.get(`/api/products/${product.id}/transactions`, api())
      setHistory(res.data)
    } catch { setHistory([]) }
  }

  const displayed = products.filter(p =>
    (filter === 'ALL' || p.category === filter) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.product_code.toLowerCase().includes(search.toLowerCase()))
  )

  const TYPE_COLORS = {
    add: '#4ade80', remove: '#f87171', adjust: '#60a5fa',
    production_debit: '#f472b6', po_received: '#34d399',
    ready_formula_in: '#fb923c', ready_formula_used: '#fbbf24',
    stock_reserved: '#a78bfa', stock_reservation_released: 'rgba(232,234,242,0.4)',
    return: '#a78bfa'
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 22, color: '#e8eaf2' }}>Stock Management</h1>
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
          value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
          style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px 8px 34px', color: '#e8eaf2', fontSize: 13, outline: 'none' }}
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
                {['Product', 'Code', 'Current Stock', 'Min Level', 'Bin Location', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(232,234,242,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '32px 14px', textAlign: 'center', color: 'rgba(232,234,242,0.3)', fontSize: 13 }}>No products found</td></tr>
              ) : displayed.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf2' }}>{p.name}</div>
                    <span style={{ background: `${CAT_COLORS[p.category]}20`, color: CAT_COLORS[p.category], padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
                      {p.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(232,234,242,0.5)', fontFamily: 'monospace' }}>{p.product_code}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: stockColor(p.current_stock, p.min_stock_level) }}>
                      {formatStock(p.current_stock, p.unit)}
                    </span>
                    {p.current_stock <= p.min_stock_level && p.min_stock_level > 0 && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: '#fbbf24' }}>⚠ LOW</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(232,234,242,0.5)' }}>
                    {p.min_stock_level > 0 ? formatStock(p.min_stock_level, p.unit) : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(232,234,242,0.5)', fontFamily: 'monospace' }}>{p.bin_location || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <ActionBtn label="Add" color="#22c55e" onClick={() => { setActionModal({ product: p, type: 'add' }); setQty(''); setNotes('') }} />
                      <ActionBtn label="Remove" color="#f87171" onClick={() => { setActionModal({ product: p, type: 'remove' }); setQty(''); setNotes('') }} />
                      <ActionBtn label="Adjust" color="#60a5fa" onClick={() => { setActionModal({ product: p, type: 'adjust' }); setNewStock(p.current_stock); setNotes('') }} />
                      <button onClick={() => openHistory(p)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '5px 7px', cursor: 'pointer', color: 'rgba(232,234,242,0.5)' }}>
                        <History size={13} />
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

      {/* Action Modal */}
      {actionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8000 }}>
          <div style={{ background: '#13132b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 16, color: '#e8eaf2' }}>
                {actionModal.type === 'add' ? 'Add Stock' : actionModal.type === 'remove' ? 'Remove Stock' : 'Adjust Stock'}
              </h2>
              <button onClick={() => setActionModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,234,242,0.5)' }}><X size={18} /></button>
            </div>

            <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eaf2' }}>{actionModal.product.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(232,234,242,0.45)', marginTop: 2 }}>
                Current: <strong style={{ color: stockColor(actionModal.product.current_stock, actionModal.product.min_stock_level) }}>
                  {formatStock(actionModal.product.current_stock, actionModal.product.unit)}
                </strong>
              </div>
            </div>

            {actionModal.type === 'adjust' ? (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>New Stock Value ({actionModal.product.unit})</label>
                <input
                  type="number" value={newStock} onChange={e => setNewStock(e.target.value)}
                  autoFocus step="any"
                  style={inputStyle}
                />
                {newStock !== '' && actionModal.product.current_stock !== undefined && (
                  <div style={{ marginTop: 6, fontSize: 12, color: parseFloat(newStock) >= parseFloat(actionModal.product.current_stock) ? '#4ade80' : '#f87171' }}>
                    {parseFloat(newStock) >= parseFloat(actionModal.product.current_stock) ? '+' : ''}
                    {(parseFloat(newStock) - parseFloat(actionModal.product.current_stock)).toFixed(2)} {actionModal.product.unit}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Quantity ({actionModal.product.unit})</label>
                <input
                  type="number" value={qty} onChange={e => setQty(e.target.value)}
                  autoFocus min="0" step="any" placeholder="0"
                  style={inputStyle}
                />
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Notes (optional)</label>
              <input
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Reason, PO number, batch..."
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setActionModal(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 20px', color: '#e8eaf2', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={handleAction} disabled={saving} style={{
                background: actionModal.type === 'add' ? '#22c55e' : actionModal.type === 'remove' ? '#dc2626' : '#2563eb',
                border: 'none', borderRadius: 8, padding: '9px 20px', color: 'white',
                fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: saving ? 0.7 : 1
              }}>
                {saving ? 'Saving...' : actionModal.type === 'add' ? 'Add Stock' : actionModal.type === 'remove' ? 'Remove Stock' : 'Set Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8000 }}>
          <div style={{ background: '#13132b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 16, color: '#e8eaf2' }}>Stock History</h2>
                <div style={{ fontSize: 12, color: 'rgba(232,234,242,0.45)', marginTop: 2 }}>{historyModal.name}</div>
              </div>
              <button onClick={() => setHistoryModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,234,242,0.5)' }}><X size={18} /></button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {history.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'rgba(232,234,242,0.3)', fontSize: 13, padding: 24 }}>No transactions yet</div>
              ) : history.map(t => (
                <div key={t.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        background: `${TYPE_COLORS[t.type] || '#60a5fa'}20`, color: TYPE_COLORS[t.type] || '#60a5fa',
                        padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700
                      }}>{t.type.replace(/_/g, ' ')}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: ['add','po_received','ready_formula_in','return'].includes(t.type) ? '#4ade80' : '#f87171' }}>
                        {['add','po_received','ready_formula_in','return'].includes(t.type) ? '+' : ['remove','production_debit','ready_formula_used'].includes(t.type) ? '-' : ''}
                        {Number(t.quantity).toLocaleString()} {t.unit}
                      </span>
                    </div>
                    {t.notes && <div style={{ fontSize: 11, color: 'rgba(232,234,242,0.4)', marginTop: 3 }}>{t.notes}</div>}
                    {t.user_name && <div style={{ fontSize: 11, color: 'rgba(232,234,242,0.3)', marginTop: 1 }}>by {t.user_name}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                    <div style={{ fontSize: 12, color: '#e8eaf2', fontWeight: 600 }}>→ {Number(t.balance_after).toLocaleString()} {t.unit}</div>
                    <div style={{ fontSize: 11, color: 'rgba(232,234,242,0.35)' }}>{new Date(t.created_at).toLocaleDateString('en-AU')} {new Date(t.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const TYPE_COLORS = {
  add: '#4ade80', remove: '#f87171', adjust: '#60a5fa',
  production_debit: '#f472b6', po_received: '#34d399',
  ready_formula_in: '#fb923c', ready_formula_used: '#fbbf24',
  stock_reserved: '#a78bfa', return: '#a78bfa'
}

function ActionBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: `${color}15`, border: `1px solid ${color}40`,
      borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
      color: color, fontSize: 11, fontWeight: 700
    }}>{label}</button>
  )
}

const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(232,234,242,0.5)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }
const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px', color: '#e8eaf2', fontSize: 13, outline: 'none' }
