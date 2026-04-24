import { useState, useEffect } from 'react'
import { Plus, X, CheckCircle, Truck, Search } from 'lucide-react'
import axios from 'axios'
import { useToast } from '../App.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'

function api() { return { headers: { Authorization: `Bearer ${localStorage.getItem('sm_token')}` } } }

const CAT_COLORS = { FRAGRANCE:'#a78bfa', RAW_MATERIALS:'#fbbf24', COMPONENTS:'#60a5fa', FINISHED_GOODS:'#4ade80', READY_FORMULA:'#fb923c' }

function fmt(d) { return d ? new Date(d).toLocaleDateString('en-AU') : '—' }

const STATUS_META = {
  pending:  { label: 'Pending',  color: '#fbbf24', bg: 'rgba(245,158,11,0.12)' },
  partial:  { label: 'Partial',  color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  received: { label: 'Received', color: '#4ade80', bg: 'rgba(34,197,94,0.12)' },
}

export default function IncomingOrders() {
  const [pos, setPos]               = useState([])
  const [products, setProducts]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [statusFilter, setStatusFilter] = useState('active') // active | received | all
  const [search, setSearch]         = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [receiveModal, setReceiveModal] = useState(null) // po record
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [receiveQty, setReceiveQty] = useState('')
  const [saving, setSaving]         = useState(false)
  // Create form
  const [createForm, setCreateForm] = useState({ product_id: '', order_number: '', quantity: '', supplier: '', estimated_delivery_date: '', notes: '' })
  const [productSearch, setProductSearch] = useState('')
  const [showProductDrop, setShowProductDrop] = useState(false)
  const { addToast } = useToast()

  useEffect(() => { loadPOs(); loadProducts() }, [])

  async function loadPOs() {
    setLoading(true)
    try {
      const res = await axios.get('/api/purchase-orders', api())
      setPos(res.data)
    } catch { addToast('Failed to load POs', 'error') }
    finally { setLoading(false) }
  }

  async function loadProducts() {
    const res = await axios.get('/api/products', api())
    setProducts(res.data)
  }

  async function handleCreate() {
    if (!createForm.product_id || !createForm.quantity) { addToast('Product and quantity required', 'error'); return }
    setSaving(true)
    try {
      await axios.post(`/api/products/${createForm.product_id}/incoming`, {
        order_number: createForm.order_number || null,
        quantity: parseFloat(createForm.quantity),
        supplier: createForm.supplier || null,
        estimated_delivery_date: createForm.estimated_delivery_date || null,
        notes: createForm.notes || null,
      }, api())
      addToast('Purchase order created')
      setShowCreate(false)
      setCreateForm({ product_id: '', order_number: '', quantity: '', supplier: '', estimated_delivery_date: '', notes: '' })
      setProductSearch('')
      loadPOs()
    } catch (e) { addToast(e.response?.data?.error || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  async function handleReceive() {
    if (!receiveQty || parseFloat(receiveQty) <= 0) { addToast('Enter quantity', 'error'); return }
    setSaving(true)
    try {
      await axios.post(`/api/purchase-orders/${receiveModal.id}/receive`, { quantity_received: parseFloat(receiveQty) }, api())
      addToast('Stock received')
      setReceiveModal(null)
      setReceiveQty('')
      loadPOs()
    } catch (e) { addToast(e.response?.data?.error || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    try {
      await axios.delete(`/api/purchase-orders/${deleteTarget.id}`, api())
      addToast('PO cancelled')
      setDeleteTarget(null)
      loadPOs()
    } catch (e) { addToast(e.response?.data?.error || 'Failed', 'error') }
  }

  function selectProduct(p) {
    setCreateForm(f => ({ ...f, product_id: p.id, supplier: p.supplier || '' }))
    setProductSearch(p.name)
    setShowProductDrop(false)
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.product_code.toLowerCase().includes(productSearch.toLowerCase())
  )

  const displayed = pos.filter(po => {
    const matchSearch = !search || (po.product_name || '').toLowerCase().includes(search.toLowerCase()) || (po.order_number || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? po.status !== 'received' : po.status === 'received')
    return matchSearch && matchStatus
  })

  const pending = pos.filter(p => p.status !== 'received').length

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 22, color: '#e8eaf2' }}>Incoming Orders</h1>
          {pending > 0 && <p style={{ fontSize: 13, color: '#fbbf24', marginTop: 4 }}>{pending} pending order{pending !== 1 ? 's' : ''}</p>}
        </div>
        <button onClick={() => setShowCreate(true)} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> New PO
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['active','Active'],['received','Received'],['all','All']].map(([k,l]) => (
          <button key={k} onClick={() => setStatusFilter(k)} style={{
            background: statusFilter === k ? '#2563eb' : 'rgba(255,255,255,0.05)',
            color: statusFilter === k ? 'white' : 'rgba(232,234,242,0.6)',
            border: statusFilter === k ? 'none' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: '5px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
          }}>{l}</button>
        ))}
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'rgba(232,234,242,0.4)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 12px 6px 28px', color: '#e8eaf2', fontSize: 12, outline: 'none', width: 200 }} />
        </div>
      </div>

      {/* PO Cards */}
      {loading ? (
        <div style={{ color: 'rgba(232,234,242,0.4)', fontSize: 14 }}>Loading...</div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'rgba(232,234,242,0.3)', fontSize: 14 }}>No purchase orders</div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Product', 'PO #', 'Ordered', 'Received', 'Status', 'Supplier', 'ETA', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(232,234,242,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map(po => {
                const sm = STATUS_META[po.status] || STATUS_META.pending
                const remaining = po.quantity - po.quantity_received
                return (
                  <tr key={po.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf2' }}>{po.product_name}</div>
                      <span style={{ fontSize: 10, color: CAT_COLORS[po.category] || '#e8eaf2' }}>{po.product_code}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(232,234,242,0.55)', fontFamily: 'monospace' }}>{po.order_number || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#e8eaf2' }}>{Number(po.quantity).toLocaleString()} {po.unit}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: po.quantity_received > 0 ? '#4ade80' : 'rgba(232,234,242,0.4)' }}>
                      {Number(po.quantity_received).toLocaleString()} {po.unit}
                      {po.status === 'partial' && <div style={{ fontSize: 10, color: '#fb923c' }}>({Number(remaining).toLocaleString()} remaining)</div>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: sm.bg, color: sm.color, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{sm.label}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(232,234,242,0.5)' }}>{po.supplier || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: po.estimated_delivery_date ? '#10b981' : 'rgba(232,234,242,0.3)' }}>
                      {po.estimated_delivery_date ? `📅 ${fmt(po.estimated_delivery_date)}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {po.status !== 'received' && (
                          <button onClick={() => { setReceiveModal(po); setReceiveQty('') }} style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: '#4ade80', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={12} /> Receive
                          </button>
                        )}
                        {po.status !== 'received' && (
                          <button onClick={() => setDeleteTarget(po)} style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#f87171' }}>
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: 'rgba(232,234,242,0.35)' }}>
            {displayed.length} order{displayed.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8000 }}>
          <div style={{ background: '#13132b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 32, width: '100%', maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 17, color: '#e8eaf2' }}>New Purchase Order</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,234,242,0.5)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Product search */}
              <F label="Product *" full>
                <div style={{ position: 'relative' }}>
                  <input value={productSearch} onChange={e => { setProductSearch(e.target.value); setCreateForm(f => ({ ...f, product_id: '' })); setShowProductDrop(true) }} onFocus={() => setShowProductDrop(true)} onBlur={() => setTimeout(() => setShowProductDrop(false), 150)} placeholder="Search product..." style={inp} />
                  {showProductDrop && filteredProducts.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e1e3a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, zIndex: 100, maxHeight: 180, overflowY: 'auto' }}>
                      {filteredProducts.slice(0, 20).map(p => (
                        <div key={p.id} onMouseDown={() => selectProduct(p)} style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 12, color: '#e8eaf2', display: 'flex', justifyContent: 'space-between' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <span>{p.name}</span>
                          <span style={{ color: CAT_COLORS[p.category], fontSize: 10, fontWeight: 700 }}>{p.category.replace('_',' ')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </F>
              <F label="PO Number">
                <input value={createForm.order_number} onChange={e => setCreateForm(f => ({ ...f, order_number: e.target.value }))} placeholder="PO-001..." style={inp} />
              </F>
              <F label="Quantity *">
                <input type="number" min={0.01} step="any" value={createForm.quantity} onChange={e => setCreateForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" style={inp} />
              </F>
              <F label="Supplier">
                <input value={createForm.supplier} onChange={e => setCreateForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Supplier name" style={inp} />
              </F>
              <F label="ETA">
                <input type="date" value={createForm.estimated_delivery_date} onChange={e => setCreateForm(f => ({ ...f, estimated_delivery_date: e.target.value }))} style={inp} />
              </F>
              <F label="Notes">
                <input value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" style={inp} />
              </F>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
              <Btn onClick={() => setShowCreate(false)}>Cancel</Btn>
              <Btn primary onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create PO'}</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {receiveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8000 }}>
          <div style={{ background: '#13132b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 16, color: '#e8eaf2' }}>Receive Stock</h2>
              <button onClick={() => setReceiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,234,242,0.5)' }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eaf2' }}>{receiveModal.product_name}</div>
              <div style={{ fontSize: 12, color: 'rgba(232,234,242,0.5)', marginTop: 3 }}>
                Ordered: {Number(receiveModal.quantity).toLocaleString()} · Received so far: {Number(receiveModal.quantity_received).toLocaleString()} · Remaining: {Number(receiveModal.quantity - receiveModal.quantity_received).toLocaleString()} {receiveModal.unit}
              </div>
              {receiveModal.estimated_delivery_date && (
                <div style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>ETA was {fmt(receiveModal.estimated_delivery_date)}</div>
              )}
            </div>
            <F label={`Quantity to receive (${receiveModal.unit})`}>
              <input type="number" min={0.01} step="any" value={receiveQty} onChange={e => setReceiveQty(e.target.value)} autoFocus placeholder="0" style={inp} />
            </F>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <Btn onClick={() => setReceiveModal(null)}>Cancel</Btn>
              <Btn primary onClick={handleReceive} disabled={saving}>{saving ? 'Saving...' : 'Receive'}</Btn>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Cancel PO"
          message={`Cancel this purchase order for ${deleteTarget.product_name}? It will be removed.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

function F({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(232,234,242,0.5)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      {children}
    </div>
  )
}
function Btn({ children, onClick, primary, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: primary ? '#2563eb' : 'rgba(255,255,255,0.06)', border: primary ? 'none' : '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 20px', color: primary ? 'white' : '#e8eaf2', fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: disabled ? 0.7 : 1 }}>{children}</button>
  )
}
const inp = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px', color: '#e8eaf2', fontSize: 13, outline: 'none' }
