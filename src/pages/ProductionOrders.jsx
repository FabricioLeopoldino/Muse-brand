import { useState, useEffect } from 'react'
import { Plus, X, ChevronDown, ChevronRight, Trash2, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import axios from 'axios'
import { useToast } from '../App.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'

function api() { return { headers: { Authorization: `Bearer ${localStorage.getItem('sm_token')}` } } }

const PRODUCT_TYPES = [
  { key: 'TRAVEL_SPRAY_10ML', label: 'Travel Spray 10ml', volume: 10 },
  { key: 'ROOM_SPRAY_50ML',   label: 'Room Spray 50ml',   volume: 50 },
  { key: 'ROOM_SPRAY_100ML',  label: 'Room Spray 100ml',  volume: 100 },
  { key: 'REED_DIFFUSER_200ML', label: 'Reed Diffuser 200ml', volume: 200 },
  { key: 'MICRO_OIL_15ML',    label: 'Micro Oil 15ml',    volume: 15, fullOil: true },
  { key: 'CANDLE_240G',       label: 'Candle 240G',       volume: 240, candle: true, oilPct: 12 },
  { key: 'CANDLE_400G',       label: 'Candle 400G',       volume: 400, candle: true, oilPct: 12 },
]

const STATUS_META = {
  draft:            { label: 'Draft',            color: 'rgba(232,234,242,0.5)',  bg: 'rgba(255,255,255,0.07)' },
  confirmed:        { label: 'Confirmed',         color: '#60a5fa',  bg: 'rgba(37,99,235,0.15)' },
  queued:           { label: 'Queued',            color: '#fbbf24',  bg: 'rgba(245,158,11,0.15)' },
  in_production:    { label: 'In Production',     color: '#f472b6',  bg: 'rgba(244,114,182,0.15)' },
  waiting_external: { label: 'Waiting External',  color: '#a78bfa',  bg: 'rgba(167,139,250,0.15)' },
  completed:        { label: 'Completed',         color: '#4ade80',  bg: 'rgba(34,197,94,0.15)' },
  ready_to_ship:    { label: 'Ready to Ship',     color: '#34d399',  bg: 'rgba(16,185,129,0.15)' },
  fulfilled:        { label: 'Fulfilled',          color: 'rgba(232,234,242,0.35)', bg: 'rgba(255,255,255,0.04)' },
  cancelled:        { label: 'Cancelled',         color: '#f87171',  bg: 'rgba(220,38,38,0.1)' },
}

const EMPTY_LINE = { product_type: 'TRAVEL_SPRAY_10ML', fragrance_id: '', oil_pct: 25, quantity: '', packaging_component_id: '', label_client_label_id: '', use_ready_formula: false, ready_formula_id: '' }

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.draft
  return <span style={{ background: m.bg, color: m.color, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{m.label}</span>
}

function fmt(d) { return d ? new Date(d).toLocaleDateString('en-AU') : '—' }
function isOverdue(d) { return d && new Date(d) < new Date() }

export default function ProductionOrders() {
  const [orders, setOrders]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showCreate, setShowCreate]   = useState(false)
  const [expanded, setExpanded]       = useState(null)
  const [orderDetail, setOrderDetail] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { addToast } = useToast()

  useEffect(() => { loadOrders() }, [statusFilter])

  async function loadOrders() {
    setLoading(true)
    try {
      const params = statusFilter !== 'ALL' ? { status: statusFilter } : {}
      const res = await axios.get('/api/production-orders', { ...api(), params })
      setOrders(res.data)
    } catch { addToast('Failed to load orders', 'error') }
    finally { setLoading(false) }
  }

  async function loadDetail(id) {
    try {
      const res = await axios.get(`/api/production-orders/${id}`, api())
      setOrderDetail(prev => ({ ...prev, [id]: res.data }))
    } catch {}
  }

  function toggleExpand(id) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    loadDetail(id)
  }

  async function handleDelete() {
    try {
      await axios.delete(`/api/production-orders/${deleteTarget.id}`, api())
      addToast('Order deleted')
      setDeleteTarget(null)
      loadOrders()
    } catch (e) { addToast(e.response?.data?.error || 'Delete failed', 'error') }
  }

  async function sendToShopify(order) {
    try {
      const res = await axios.post('/api/shopify/draft-order', { production_order_id: order.id }, api())
      addToast('Draft order sent to Shopify')
      loadOrders()
    } catch (e) { addToast(e.response?.data?.error || 'Shopify error', 'error') }
  }

  const STATUSES = ['ALL','draft','confirmed','queued','in_production','waiting_external','completed','ready_to_ship','fulfilled','cancelled']

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 22, color: '#e8eaf2' }}>Production Orders</h1>
        <button onClick={() => setShowCreate(true)} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> New Order
        </button>
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUSES.map(s => {
          const m = STATUS_META[s]
          const active = statusFilter === s
          return (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              background: active ? (m?.bg || 'rgba(255,255,255,0.12)') : 'rgba(255,255,255,0.04)',
              border: active ? `1px solid ${m?.color || 'rgba(255,255,255,0.3)'}` : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              color: active ? (m?.color || '#e8eaf2') : 'rgba(232,234,242,0.5)'
            }}>{s === 'ALL' ? 'All' : m?.label || s}</button>
          )
        })}
      </div>

      {/* Orders list */}
      {loading ? (
        <div style={{ color: 'rgba(232,234,242,0.4)', fontSize: 14 }}>Loading...</div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'rgba(232,234,242,0.3)', fontSize: 14, padding: 48 }}>No orders found</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orders.map(order => (
            <div key={order.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
              {/* Order row */}
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <button onClick={() => toggleExpand(order.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,234,242,0.5)', padding: 0 }}>
                  {expanded === order.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#e8eaf2', fontFamily: 'monospace' }}>{order.order_number}</span>
                    <StatusBadge status={order.status} />
                    {order.order_type === 'LARGE_CLIENT' && (
                      <span style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>LARGE CLIENT</span>
                    )}
                    {order.shopify_order_number && (
                      <span style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{order.shopify_order_number}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(232,234,242,0.45)', marginTop: 3 }}>
                    {order.client_name || 'No client'} · {order.lines?.length || 0} line{order.lines?.length !== 1 ? 's' : ''}
                    {order.due_date && (
                      <span style={{ marginLeft: 8, color: isOverdue(order.due_date) && !['fulfilled','cancelled'].includes(order.status) ? '#f87171' : 'rgba(232,234,242,0.4)' }}>
                        · Due {fmt(order.due_date)}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {order.status === 'draft' && !order.shopify_draft_order_id && (
                    <button onClick={() => sendToShopify(order)} style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: '#60a5fa', fontSize: 11, fontWeight: 700 }}>
                      → Shopify
                    </button>
                  )}
                  {['draft','cancelled'].includes(order.status) && (
                    <button onClick={() => setDeleteTarget(order)} style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#f87171' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === order.id && (
                <OrderDetail order={orderDetail[order.id] || order} onRefresh={() => { loadOrders(); loadDetail(order.id) }} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Order Modal */}
      {showCreate && (
        <CreateOrderModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { loadOrders(); setShowCreate(false) }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Order"
          message={`Delete order ${deleteTarget.order_number}? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// ORDER DETAIL (expanded view)
// ─────────────────────────────────────────
function OrderDetail({ order, onRefresh }) {
  if (!order.lines) return <div style={{ padding: '12px 18px', color: 'rgba(232,234,242,0.4)', fontSize: 13 }}>Loading...</div>

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '16px 18px', background: 'rgba(0,0,0,0.12)' }}>
      {order.lines.map((line, i) => (
        <div key={line.id} style={{ marginBottom: i < order.lines.length - 1 ? 16 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(232,234,242,0.4)', textTransform: 'uppercase' }}>Line {line.line_number}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#e8eaf2' }}>{PRODUCT_TYPES.find(p => p.key === line.product_type)?.label}</span>
            <span style={{ fontSize: 12, color: 'rgba(232,234,242,0.5)' }}>× {line.quantity}</span>
            {line.fragrance_name && <span style={{ fontSize: 12, color: '#a78bfa' }}>— {line.fragrance_name}</span>}
            {!PRODUCT_TYPES.find(p => p.key === line.product_type)?.candle && !PRODUCT_TYPES.find(p => p.key === line.product_type)?.fullOil && (
              <span style={{ fontSize: 11, color: 'rgba(232,234,242,0.4)' }}>@ {line.oil_pct}% oil</span>
            )}
          </div>
          {line.components && line.components.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {line.components.map((comp, ci) => (
                <div key={ci} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11,
                  background: comp.current_stock !== undefined && comp.product_id && comp.current_stock < comp.quantity_required
                    ? 'rgba(220,38,38,0.1)' : 'rgba(255,255,255,0.06)',
                  border: comp.current_stock !== undefined && comp.product_id && comp.current_stock < comp.quantity_required
                    ? '1px solid rgba(220,38,38,0.25)' : '1px solid rgba(255,255,255,0.08)',
                  color: comp.current_stock !== undefined && comp.product_id && comp.current_stock < comp.quantity_required
                    ? '#f87171' : 'rgba(232,234,242,0.7)'
                }}>
                  {comp.product_name} — <strong>{Number(comp.quantity_required).toLocaleString()} {comp.unit}</strong>
                  {comp.current_stock !== undefined && comp.product_id && comp.current_stock < comp.quantity_required && (
                    <span style={{ marginLeft: 4 }}>⚠ need {(comp.quantity_required - comp.current_stock).toFixed(1)} more</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {order.notes && (
        <div style={{ marginTop: 14, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 12, color: 'rgba(232,234,242,0.5)' }}>
          Notes: {order.notes}
        </div>
      )}
      <div style={{ marginTop: 12, fontSize: 11, color: 'rgba(232,234,242,0.3)' }}>
        Created {fmt(order.created_at)} · ID #{order.id}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// CREATE ORDER MODAL
// ─────────────────────────────────────────
function CreateOrderModal({ onClose, onCreated }) {
  const [clients, setClients]       = useState([])
  const [fragrances, setFragrances] = useState([])
  const [components, setComponents] = useState([])
  const [labels, setLabels]         = useState({}) // clientId → labels[]
  const [readyFormulas, setReadyFormulas] = useState({}) // fragranceId → rf[]

  const [clientId, setClientId]     = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDrop, setShowClientDrop] = useState(false)
  const [orderType, setOrderType]   = useState('STANDARD')
  const [dueDate, setDueDate]       = useState('')
  const [notes, setNotes]           = useState('')
  const [lines, setLines]           = useState([{ ...EMPTY_LINE, _id: Date.now() }])
  const [saving, setSaving]         = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    loadClients()
    loadFragrances()
    loadComponents()
  }, [])

  async function loadClients() {
    const res = await axios.get('/api/clients', api())
    setClients(res.data)
  }
  async function loadFragrances() {
    const res = await axios.get('/api/products', { ...api(), params: { category: 'FRAGRANCE' } })
    setFragrances(res.data)
  }
  async function loadComponents() {
    const res = await axios.get('/api/products', { ...api(), params: { category: 'COMPONENTS' } })
    setComponents(res.data)
  }
  async function loadLabels(cId) {
    if (!cId || labels[cId]) return
    const res = await axios.get(`/api/clients/${cId}/labels`, api())
    setLabels(prev => ({ ...prev, [cId]: res.data.filter(l => !l.is_obsolete) }))
  }
  async function loadReadyFormula(fragId) {
    if (!fragId || readyFormulas[fragId] !== undefined) return
    const res = await axios.get('/api/ready-formula/available', { ...api(), params: { fragrance_id: fragId } })
    setReadyFormulas(prev => ({ ...prev, [fragId]: res.data }))
  }

  function setLine(idx, updates) {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, ...updates } : l))
  }

  function addLine() { setLines(prev => [...prev, { ...EMPTY_LINE, _id: Date.now() }]) }
  function removeLine(idx) { setLines(prev => prev.filter((_, i) => i !== idx)) }

  // When fragrance changes on a line, load ready formula
  function onFragranceChange(idx, fragId) {
    setLine(idx, { fragrance_id: fragId, use_ready_formula: false, ready_formula_id: '' })
    if (fragId) loadReadyFormula(fragId)
  }

  // When client changes, load their labels
  function onClientChange(client) {
    setClientId(client.id)
    setClientSearch(client.name)
    setShowClientDrop(false)
    if (client.is_large_client) setOrderType('LARGE_CLIENT')
    else setOrderType('STANDARD')
    loadLabels(client.id)
  }

  // Formula calc for a line
  function calcFormula(line) {
    const pt = PRODUCT_TYPES.find(p => p.key === line.product_type)
    if (!pt) return null
    const qty = parseInt(line.quantity) || 0
    if (qty === 0) return null

    if (pt.candle) {
      const oilMl = pt.volume * 0.12
      return { oilMl: oilMl * qty, ethanolMl: 0, totalMl: oilMl * qty, isCandle: true }
    }
    if (pt.fullOil) {
      return { oilMl: pt.volume * qty, ethanolMl: 0, totalMl: pt.volume * qty, fullOil: true }
    }
    const oilPct = parseFloat(line.oil_pct) || 25
    const oilMl = pt.volume * (oilPct / 100) * qty
    const ethanolMl = pt.volume * ((100 - oilPct) / 100) * qty

    // Subtract ready formula if used
    let rf = null
    if (line.use_ready_formula && line.ready_formula_id) {
      const rfList = readyFormulas[line.fragrance_id] || []
      rf = rfList.find(r => r.id === parseInt(line.ready_formula_id))
    }
    const rfMl = rf ? Math.min(rf.current_stock, oilMl + ethanolMl) : 0
    const remainingTotal = (oilMl + ethanolMl) - rfMl
    const remainingOil = remainingTotal * (oilPct / 100)
    const remainingEthanol = remainingTotal * ((100 - oilPct) / 100)

    return { oilMl, ethanolMl, totalMl: oilMl + ethanolMl, rfMl, remainingOil, remainingEthanol, remainingTotal }
  }

  // Group lines by fragrance to show combined formula
  function getCombinedFormula() {
    const byFrag = {}
    for (const line of lines) {
      if (!line.fragrance_id || !line.quantity) continue
      const pt = PRODUCT_TYPES.find(p => p.key === line.product_type)
      if (!pt || pt.candle) continue
      const qty = parseInt(line.quantity) || 0
      const oilPct = pt.fullOil ? 100 : (parseFloat(line.oil_pct) || 25)
      const oilMl = pt.volume * (oilPct / 100) * qty
      const ethanolMl = pt.fullOil ? 0 : pt.volume * ((100 - oilPct) / 100) * qty
      if (!byFrag[line.fragrance_id]) byFrag[line.fragrance_id] = { oilMl: 0, ethanolMl: 0, fragName: fragrances.find(f => f.id === parseInt(line.fragrance_id))?.name }
      byFrag[line.fragrance_id].oilMl += oilMl
      byFrag[line.fragrance_id].ethanolMl += ethanolMl
    }
    return byFrag
  }

  async function handleSave() {
    if (!lines.length) { addToast('Add at least one line item', 'error'); return }
    for (const l of lines) {
      if (!l.product_type || !l.quantity || parseInt(l.quantity) < 1) {
        addToast('All lines need a product type and quantity', 'error'); return
      }
    }
    setSaving(true)
    try {
      const payload = {
        client_id: clientId || null,
        order_type: orderType,
        due_date: dueDate || null,
        notes: notes || null,
        lines: lines.map(l => ({
          product_type: l.product_type,
          fragrance_id: l.fragrance_id ? parseInt(l.fragrance_id) : null,
          oil_pct: parseFloat(l.oil_pct) || 25,
          quantity: parseInt(l.quantity),
          packaging_component_id: l.packaging_component_id ? parseInt(l.packaging_component_id) : null,
          label_client_label_id: l.label_client_label_id ? parseInt(l.label_client_label_id) : null,
          use_client_stock: orderType === 'LARGE_CLIENT',
        }))
      }
      await axios.post('/api/production-orders', payload, api())
      addToast('Production order created')
      onCreated()
    } catch (e) {
      addToast(e.response?.data?.error || 'Failed to create order', 'error')
    } finally { setSaving(false) }
  }

  const selectedClient = clients.find(c => c.id === parseInt(clientId))
  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
  const combined = getCombinedFormula()

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 8000, overflowY: 'auto', paddingTop: 40, paddingBottom: 40 }}>
      <div style={{ background: '#13132b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 32, width: '100%', maxWidth: 760 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 18, color: '#e8eaf2' }}>New Production Order</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,234,242,0.5)' }}><X size={20} /></button>
        </div>

        {/* Order info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
          {/* Client search */}
          <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
            <label style={lbl}>Client</label>
            <input
              value={clientSearch}
              onChange={e => { setClientSearch(e.target.value); setClientId(''); setShowClientDrop(true) }}
              onFocus={() => setShowClientDrop(true)}
              onBlur={() => setTimeout(() => setShowClientDrop(false), 150)}
              placeholder="Search client..."
              style={inp}
            />
            {showClientDrop && filteredClients.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e1e3a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, zIndex: 100, maxHeight: 200, overflowY: 'auto' }}>
                {filteredClients.map(c => (
                  <div key={c.id} onMouseDown={() => onClientChange(c)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: '#e8eaf2', display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {c.name}
                    {c.is_large_client && <span style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700 }}>LARGE</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={lbl}>Order Type</label>
            <select value={orderType} onChange={e => setOrderType(e.target.value)} style={sel}>
              <option value="STANDARD">Standard</option>
              <option value="LARGE_CLIENT">Large Client</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" style={inp} />
          </div>
        </div>

        {/* Line Items */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(232,234,242,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>Line Items</div>

          {lines.map((line, idx) => {
            const pt = PRODUCT_TYPES.find(p => p.key === line.product_type)
            const formula = calcFormula(line)
            const rfList = line.fragrance_id ? (readyFormulas[line.fragrance_id] || []) : []
            const clientLabels = clientId ? (labels[clientId] || []) : []

            return (
              <div key={line._id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(232,234,242,0.4)', textTransform: 'uppercase' }}>Line {idx + 1}</span>
                  {lines.length > 1 && (
                    <button onClick={() => removeLine(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}><X size={14} /></button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={lbl}>Product Type</label>
                    <select value={line.product_type} onChange={e => setLine(idx, { product_type: e.target.value, oil_pct: PRODUCT_TYPES.find(p => p.key === e.target.value)?.fullOil ? 100 : 25 })} style={sel}>
                      {PRODUCT_TYPES.map(pt => <option key={pt.key} value={pt.key}>{pt.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Fragrance</label>
                    <select value={line.fragrance_id} onChange={e => onFragranceChange(idx, e.target.value)} style={sel}>
                      <option value="">— None —</option>
                      {fragrances.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Qty</label>
                    <input type="number" min={1} value={line.quantity} onChange={e => setLine(idx, { quantity: e.target.value })} placeholder="0" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Oil %</label>
                    <input type="number" min={1} max={100} value={line.oil_pct} onChange={e => setLine(idx, { oil_pct: e.target.value })}
                      disabled={pt?.candle || pt?.fullOil} style={{ ...inp, opacity: (pt?.candle || pt?.fullOil) ? 0.5 : 1 }} />
                  </div>
                </div>

                {/* Packaging + Label */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={lbl}>Packaging (optional)</label>
                    <select value={line.packaging_component_id} onChange={e => setLine(idx, { packaging_component_id: e.target.value })} style={sel}>
                      <option value="">— None —</option>
                      {components.map(c => <option key={c.id} value={c.id}>{c.name} ({Number(c.current_stock).toLocaleString()} in stock)</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Label (optional)</label>
                    <select value={line.label_client_label_id} onChange={e => setLine(idx, { label_client_label_id: e.target.value })} style={sel}>
                      <option value="">— None —</option>
                      {clientLabels.map(l => <option key={l.id} value={l.id}>{l.label_name} {l.artwork_version} — {Number(l.quantity).toLocaleString()} units</option>)}
                    </select>
                    {!clientId && <div style={{ fontSize: 10, color: 'rgba(232,234,242,0.35)', marginTop: 4 }}>Select a client to see labels</div>}
                  </div>
                </div>

                {/* Ready Formula suggestion */}
                {line.fragrance_id && rfList.length > 0 && !pt?.candle && !pt?.fullOil && (
                  <div style={{ padding: '10px 12px', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: 8, marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: '#fb923c', fontWeight: 700, marginBottom: 6 }}>
                      ⚡ Ready Formula available — {rfList[0].name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(232,234,242,0.7)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={line.use_ready_formula} onChange={e => setLine(idx, { use_ready_formula: e.target.checked })} />
                        Use Ready Formula
                      </label>
                      {line.use_ready_formula && (
                        <select value={line.ready_formula_id} onChange={e => setLine(idx, { ready_formula_id: e.target.value })} style={{ ...sel, flex: 1 }}>
                          <option value="">Select...</option>
                          {rfList.map(rf => <option key={rf.id} value={rf.id}>{rf.name} — {Number(rf.current_stock).toLocaleString()} ml available</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                )}

                {/* Formula preview */}
                {formula && line.quantity > 0 && (
                  <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 12 }}>
                    {formula.isCandle ? (
                      <span style={{ color: 'rgba(232,234,242,0.6)' }}>Fragrance needed: <strong style={{ color: '#a78bfa' }}>{formula.oilMl.toFixed(1)} ml</strong> · Candle jar × {line.quantity}</span>
                    ) : formula.fullOil ? (
                      <span style={{ color: 'rgba(232,234,242,0.6)' }}>Oil (100%): <strong style={{ color: '#a78bfa' }}>{formula.oilMl.toFixed(1)} ml</strong></span>
                    ) : (
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span style={{ color: 'rgba(232,234,242,0.6)' }}>Total formula: <strong style={{ color: '#a78bfa' }}>{formula.totalMl.toFixed(1)} ml</strong></span>
                        {formula.rfMl > 0 && <span style={{ color: '#fb923c' }}>Ready Formula: {formula.rfMl.toFixed(1)} ml</span>}
                        <span style={{ color: 'rgba(232,234,242,0.6)' }}>Oil: <strong style={{ color: '#a78bfa' }}>{(formula.rfMl > 0 ? formula.remainingOil : formula.oilMl).toFixed(1)} ml</strong></span>
                        <span style={{ color: 'rgba(232,234,242,0.6)' }}>Ethanol: <strong style={{ color: '#60a5fa' }}>{(formula.rfMl > 0 ? formula.remainingEthanol : formula.ethanolMl).toFixed(1)} ml</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          <button onClick={addLine} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 0', cursor: 'pointer', color: 'rgba(232,234,242,0.5)', fontSize: 13, fontWeight: 600 }}>
            + Add Line Item
          </button>
        </div>

        {/* Combined formula summary */}
        {Object.keys(combined).length > 0 && (
          <div style={{ marginBottom: 20, padding: 16, background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Formula Summary</div>
            {Object.entries(combined).map(([fragId, data]) => (
              <div key={fragId} style={{ marginBottom: 8, fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: '#e8eaf2' }}>{data.fragName || `Fragrance #${fragId}`}</span>
                <span style={{ color: 'rgba(232,234,242,0.5)', marginLeft: 8 }}>
                  Total: <strong style={{ color: '#a78bfa' }}>{(data.oilMl + data.ethanolMl).toFixed(1)} ml</strong>
                  {' · '}Oil: <strong style={{ color: '#a78bfa' }}>{data.oilMl.toFixed(1)} ml</strong>
                  {data.ethanolMl > 0 && <>{' · '}Ethanol: <strong style={{ color: '#60a5fa' }}>{data.ethanolMl.toFixed(1)} ml</strong></>}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 22px', color: '#e8eaf2', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ background: '#2563eb', border: 'none', borderRadius: 8, padding: '10px 22px', color: 'white', fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Creating...' : 'Create Order'}
          </button>
        </div>
      </div>
    </div>
  )
}

const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(232,234,242,0.5)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }
const inp = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px', color: '#e8eaf2', fontSize: 13, outline: 'none' }
const sel = { ...inp, cursor: 'pointer' }
