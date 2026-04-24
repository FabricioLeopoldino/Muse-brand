import { useState, useEffect } from 'react'
import { Play, CheckCircle, Clock, X, AlertTriangle, ChevronDown, ChevronRight, Package } from 'lucide-react'
import axios from 'axios'
import { useToast } from '../App.jsx'

function api() { return { headers: { Authorization: `Bearer ${localStorage.getItem('sm_token')}` } } }

const PRODUCT_TYPE_LABELS = {
  TRAVEL_SPRAY_10ML: 'Travel Spray 10ml', ROOM_SPRAY_50ML: 'Room Spray 50ml',
  ROOM_SPRAY_100ML: 'Room Spray 100ml', REED_DIFFUSER_200ML: 'Reed Diffuser 200ml',
  MICRO_OIL_15ML: 'Micro Oil 15ml', CANDLE_240G: 'Candle 240G', CANDLE_400G: 'Candle 400G',
}

function fmt(d) { return d ? new Date(d).toLocaleDateString('en-AU') : '—' }
function fmtTime(d) { return d ? new Date(d).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : '' }
function isOverdue(d) { return d && new Date(d) < new Date() }

export default function ManufacturingQueue() {
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [expanded, setExpanded]   = useState(null)
  const [details, setDetails]     = useState({})
  const [modal, setModal]         = useState(null) // { type: 'complete'|'waiting', order }
  const [completeForm, setCompleteForm] = useState({ leftover_formula_ml: '', leftover_formula_oil_pct: 25, leftover_labels_qty: '', notes: '', oil_adjusted: false, actual_oil_pct: 25 })
  const [waitingForm, setWaitingForm]   = useState({ external_type: 'filling', external_supplier: '', external_expected_at: '' })
  const [saving, setSaving]       = useState(false)
  const { addToast } = useToast()

  useEffect(() => { loadQueue() }, [typeFilter])

  async function loadQueue() {
    setLoading(true)
    try {
      const params = typeFilter !== 'ALL' ? { order_type: typeFilter } : {}
      const res = await axios.get('/api/manufacturing/queue', { ...api(), params })
      setOrders(res.data)
    } catch { addToast('Failed to load queue', 'error') }
    finally { setLoading(false) }
  }

  async function loadDetail(id) {
    try {
      const res = await axios.get(`/api/production-orders/${id}`, api())
      setDetails(prev => ({ ...prev, [id]: res.data }))
    } catch {}
  }

  function toggleExpand(id) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    loadDetail(id)
  }

  async function startProduction(order) {
    try {
      await axios.post(`/api/manufacturing/${order.id}/start`, {}, api())
      addToast(`Production started — ${order.order_number}`)
      loadQueue()
      if (expanded === order.id) loadDetail(order.id)
    } catch (e) { addToast(e.response?.data?.error || 'Failed', 'error') }
  }

  async function handleComplete() {
    setSaving(true)
    try {
      await axios.post(`/api/manufacturing/${modal.order.id}/complete`, {
        leftover_formula_ml: parseFloat(completeForm.leftover_formula_ml) || null,
        leftover_formula_oil_pct: completeForm.oil_adjusted ? parseFloat(completeForm.actual_oil_pct) : parseFloat(completeForm.leftover_formula_oil_pct),
        leftover_labels_qty: parseInt(completeForm.leftover_labels_qty) || null,
        notes_on_completion: completeForm.notes || null,
      }, api())
      addToast(`Order completed — ${modal.order.order_number}`)
      setModal(null)
      loadQueue()
    } catch (e) { addToast(e.response?.data?.error || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  async function handleMarkWaiting() {
    setSaving(true)
    try {
      await axios.put(`/api/production-orders/${modal.order.id}/status`, { status: 'waiting_external' }, api())
      addToast('Marked as Waiting External')
      setModal(null)
      loadQueue()
    } catch (e) { addToast(e.response?.data?.error || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  const statusLabel = { queued: 'Queued', in_production: 'In Production', waiting_external: 'Waiting External' }
  const statusColor = { queued: '#fbbf24', in_production: '#f472b6', waiting_external: '#a78bfa' }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 22, color: '#e8eaf2' }}>Manufacturing Queue</h1>
        <p style={{ fontSize: 13, color: 'rgba(232,234,242,0.4)', marginTop: 4 }}>Orders with reserved stock ready for production</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['ALL','All'],['STANDARD','Standard'],['LARGE_CLIENT','Large Client']].map(([k,l]) => (
          <button key={k} onClick={() => setTypeFilter(k)} style={{
            background: typeFilter === k ? '#2563eb' : 'rgba(255,255,255,0.05)',
            color: typeFilter === k ? 'white' : 'rgba(232,234,242,0.6)',
            border: typeFilter === k ? 'none' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: '5px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
          }}>{l}</button>
        ))}
        <button onClick={loadQueue} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 14px', color: 'rgba(232,234,242,0.6)', fontSize: 12, cursor: 'pointer' }}>↻ Refresh</button>
      </div>

      {loading ? (
        <div style={{ color: 'rgba(232,234,242,0.4)', fontSize: 14 }}>Loading...</div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(232,234,242,0.3)' }}>
          <CheckCircle size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>Queue is empty</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {orders.map(order => {
            const detail = details[order.id]
            const status = order.status
            const sc = statusColor[status] || '#e8eaf2'
            const hasLabelsIssue = order.lines?.some(l => l.labels_required && !l.labels_received)

            return (
              <div key={order.id} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${status === 'in_production' ? 'rgba(244,114,182,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, overflow: 'hidden' }}>
                {/* Main row */}
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <button onClick={() => toggleExpand(order.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,234,242,0.5)', padding: 0 }}>
                    {expanded === order.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#e8eaf2' }}>{order.order_number}</span>
                      <span style={{ background: `${sc}18`, color: sc, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        {statusLabel[status]}
                      </span>
                      {order.order_type === 'LARGE_CLIENT' && (
                        <span style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>LARGE CLIENT</span>
                      )}
                      {hasLabelsIssue && (
                        <span style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>⚠ Labels pending</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(232,234,242,0.5)' }}>
                      {order.client_name || 'No client'}
                      {order.due_date && (
                        <span style={{ marginLeft: 10, color: isOverdue(order.due_date) ? '#f87171' : 'rgba(232,234,242,0.4)' }}>
                          · Due {fmt(order.due_date)}
                        </span>
                      )}
                    </div>
                    {order.lines && (
                      <div style={{ fontSize: 12, color: 'rgba(232,234,242,0.4)', marginTop: 3 }}>
                        {order.lines.map(l => `${PRODUCT_TYPE_LABELS[l.product_type] || l.product_type} ×${l.quantity}`).join(' + ')}
                      </div>
                    )}
                    {order.job && (
                      <div style={{ fontSize: 11, color: 'rgba(232,234,242,0.35)', marginTop: 3 }}>
                        Started {fmt(order.job.started_at)} at {fmtTime(order.job.started_at)}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {status === 'queued' && (
                      <button onClick={() => startProduction(order)} style={{ background: 'rgba(244,114,182,0.15)', border: '1px solid rgba(244,114,182,0.3)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', color: '#f472b6', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Play size={13} /> Start Production
                      </button>
                    )}
                    {status === 'in_production' && (
                      <>
                        <button onClick={() => { setModal({ type: 'waiting', order }); setWaitingForm({ external_type: 'filling', external_supplier: '', external_expected_at: '' }) }} style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', color: '#a78bfa', fontSize: 11, fontWeight: 700 }}>
                          Mark Waiting
                        </button>
                        <button onClick={() => { setModal({ type: 'complete', order }); setCompleteForm({ leftover_formula_ml: '', leftover_formula_oil_pct: 25, leftover_labels_qty: '', notes: '', oil_adjusted: false, actual_oil_pct: 25 }) }} style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', color: '#4ade80', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CheckCircle size={13} /> Complete
                        </button>
                      </>
                    )}
                    {status === 'waiting_external' && (
                      <button onClick={() => { axios.put(`/api/production-orders/${order.id}/status`, { status: 'in_production' }, api()).then(() => { addToast('Back to In Production'); loadQueue() }) }} style={{ background: 'rgba(244,114,182,0.12)', border: '1px solid rgba(244,114,182,0.25)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', color: '#f472b6', fontSize: 11, fontWeight: 700 }}>
                        Resume Production
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded BOM */}
                {expanded === order.id && detail && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '14px 20px', background: 'rgba(0,0,0,0.12)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(232,234,242,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Bill of Materials</div>
                    {detail.lines?.map((line, li) => (
                      <div key={line.id} style={{ marginBottom: li < detail.lines.length - 1 ? 14 : 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#e8eaf2', marginBottom: 6 }}>
                          Line {line.line_number}: {PRODUCT_TYPE_LABELS[line.product_type]} × {line.quantity}
                          {line.fragrance_name && <span style={{ color: '#a78bfa', fontWeight: 400 }}> — {line.fragrance_name}</span>}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {line.components?.map((comp, ci) => {
                            const ok = !comp.product_id || comp.current_stock >= comp.quantity_required
                            return (
                              <div key={ci} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, background: ok ? 'rgba(255,255,255,0.05)' : 'rgba(220,38,38,0.1)', border: ok ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(220,38,38,0.25)', color: ok ? 'rgba(232,234,242,0.7)' : '#f87171' }}>
                                {comp.product_name} <strong>{Number(comp.quantity_required).toLocaleString()} {comp.unit}</strong>
                                {!ok && <span> ⚠</span>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Complete Modal */}
      {modal?.type === 'complete' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000 }}>
          <div style={{ background: '#13132b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 32, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 17, color: '#e8eaf2' }}>Complete Production</h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,234,242,0.5)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 13, color: '#a78bfa', fontWeight: 700, marginBottom: 20 }}>{modal.order.order_number} — {modal.order.client_name}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <F label="Leftover Formula (ml)">
                <input type="number" min={0} value={completeForm.leftover_formula_ml} onChange={e => setCompleteForm(f => ({ ...f, leftover_formula_ml: e.target.value }))} placeholder="0" style={inp} />
              </F>
              <F label="Leftover Labels (units)">
                <input type="number" min={0} value={completeForm.leftover_labels_qty} onChange={e => setCompleteForm(f => ({ ...f, leftover_labels_qty: e.target.value }))} placeholder="0" style={inp} />
              </F>
              <F label="Oil % was standard?" full>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[false, true].map(adj => (
                    <button key={String(adj)} onClick={() => setCompleteForm(f => ({ ...f, oil_adjusted: adj }))} style={{ background: completeForm.oil_adjusted === adj ? (adj ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)') : 'rgba(255,255,255,0.05)', border: `1px solid ${completeForm.oil_adjusted === adj ? (adj ? '#f59e0b' : '#22c55e') : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: completeForm.oil_adjusted === adj ? (adj ? '#fbbf24' : '#4ade80') : 'rgba(232,234,242,0.5)' }}>
                      {adj ? 'Adjusted' : '✓ Standard'}
                    </button>
                  ))}
                </div>
              </F>
              {completeForm.oil_adjusted && (
                <>
                  <F label="Actual Oil % Used">
                    <input type="number" min={1} max={100} value={completeForm.actual_oil_pct} onChange={e => setCompleteForm(f => ({ ...f, actual_oil_pct: e.target.value }))} style={inp} />
                  </F>
                </>
              )}
              <F label="Notes on Completion" full>
                <textarea value={completeForm.notes} onChange={e => setCompleteForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Any issues, observations..." style={{ ...inp, resize: 'vertical', width: '100%' }} />
              </F>
            </div>

            {completeForm.leftover_formula_ml > 0 && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: 8, fontSize: 12, color: '#fb923c' }}>
                {completeForm.leftover_formula_ml} ml will be saved as Ready Formula
              </div>
            )}
            {completeForm.leftover_labels_qty > 0 && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(232,121,249,0.08)', border: '1px solid rgba(232,121,249,0.2)', borderRadius: 8, fontSize: 12, color: '#e879f9' }}>
                {completeForm.leftover_labels_qty} labels will be saved to client stock
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <Btn onClick={() => setModal(null)}>Cancel</Btn>
              <Btn primary onClick={handleComplete} disabled={saving}>{saving ? 'Saving...' : 'Confirm Completion'}</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Mark Waiting Modal */}
      {modal?.type === 'waiting' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000 }}>
          <div style={{ background: '#13132b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 16, color: '#e8eaf2' }}>Mark as Waiting</h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,234,242,0.5)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <F label="Waiting for">
                <select value={waitingForm.external_type} onChange={e => setWaitingForm(f => ({ ...f, external_type: e.target.value }))} style={sel}>
                  <option value="filling">Filling (Candle supplier)</option>
                  <option value="labels">Labels</option>
                  <option value="other">Other</option>
                </select>
              </F>
              <F label="Supplier / Contact">
                <input value={waitingForm.external_supplier} onChange={e => setWaitingForm(f => ({ ...f, external_supplier: e.target.value }))} placeholder="Supplier name..." style={inp} />
              </F>
              <F label="Expected back (ETA)">
                <input type="date" value={waitingForm.external_expected_at} onChange={e => setWaitingForm(f => ({ ...f, external_expected_at: e.target.value }))} style={inp} />
              </F>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <Btn onClick={() => setModal(null)}>Cancel</Btn>
              <Btn primary onClick={handleMarkWaiting} disabled={saving}>{saving ? 'Saving...' : 'Confirm'}</Btn>
            </div>
          </div>
        </div>
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
const sel = { ...inp, cursor: 'pointer' }
