import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, ChevronDown, ChevronRight, Tag, Package, Star } from 'lucide-react'
import axios from 'axios'
import ConfirmModal from '../components/ConfirmModal.jsx'
import { useToast } from '../App.jsx'

function api() { return { headers: { Authorization: `Bearer ${localStorage.getItem('sm_token')}` } } }

const EMPTY_FORM = { name: '', email: '', phone: '', address: '', is_large_client: false, notes: '' }
const EMPTY_LABEL_FORM = { label_name: '', artwork_version: 'v1', supplier: '', quantity: '', notes: '' }

export default function Clients() {
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL') // ALL | STANDARD | LARGE_CLIENT
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [labels, setLabels] = useState({})
  const [clientStock, setClientStock] = useState({})
  const [showLabelModal, setShowLabelModal] = useState(null)
  const [labelForm, setLabelForm] = useState(EMPTY_LABEL_FORM)
  const [labelSaving, setLabelSaving] = useState(false)
  const { addToast } = useToast()

  useEffect(() => { loadClients() }, [filter, search])

  async function loadClients() {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (filter === 'LARGE_CLIENT') params.is_large_client = 'true'
      if (filter === 'STANDARD') params.is_large_client = 'false'
      const res = await axios.get('/api/clients', { ...api(), params })
      setClients(res.data)
    } catch { addToast('Failed to load clients', 'error') }
    finally { setLoading(false) }
  }

  async function loadClientDetail(clientId) {
    try {
      const [lblRes, stkRes] = await Promise.all([
        axios.get(`/api/clients/${clientId}/labels`, api()),
        axios.get(`/api/clients/${clientId}/stock`, api()),
      ])
      setLabels(prev => ({ ...prev, [clientId]: lblRes.data }))
      setClientStock(prev => ({ ...prev, [clientId]: stkRes.data }))
    } catch {}
  }

  function toggleExpand(id) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    loadClientDetail(id)
  }

  function openCreate() {
    setEditing(null); setForm(EMPTY_FORM); setShowModal(true)
  }

  function openEdit(client) {
    setEditing(client)
    setForm({ name: client.name, email: client.email || '', phone: client.phone || '', address: client.address || '', is_large_client: client.is_large_client, notes: client.notes || '' })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { addToast('Name is required', 'error'); return }
    setSaving(true)
    try {
      if (editing) {
        await axios.put(`/api/clients/${editing.id}`, form, api())
        addToast('Client updated')
      } else {
        await axios.post('/api/clients', form, api())
        addToast('Client created')
      }
      setShowModal(false); loadClients()
    } catch (e) { addToast(e.response?.data?.error || 'Save failed', 'error') }
    finally { setSaving(false) }
  }

  async function handleSaveLabel() {
    if (!labelForm.label_name.trim()) { addToast('Label name required', 'error'); return }
    setLabelSaving(true)
    try {
      await axios.post(`/api/clients/${showLabelModal}/labels`, {
        ...labelForm, quantity: parseFloat(labelForm.quantity) || 0
      }, api())
      addToast('Label created')
      setShowLabelModal(null)
      setLabelForm(EMPTY_LABEL_FORM)
      loadClientDetail(showLabelModal)
    } catch (e) { addToast(e.response?.data?.error || 'Failed', 'error') }
    finally { setLabelSaving(false) }
  }

  async function toggleObsolete(clientId, label) {
    try {
      await axios.put(`/api/clients/${clientId}/labels/${label.id}/obsolete`, { is_obsolete: !label.is_obsolete }, api())
      addToast(label.is_obsolete ? 'Label restored' : 'Label marked obsolete')
      loadClientDetail(clientId)
    } catch { addToast('Failed', 'error') }
  }

  const displayed = clients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.email || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 22, color: '#e8eaf2' }}>Clients</h1>
        <button onClick={openCreate} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> New Client
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['ALL','All'], ['STANDARD','Standard'], ['LARGE_CLIENT','Large Client']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            background: filter === k ? '#2563eb' : 'rgba(255,255,255,0.05)',
            color: filter === k ? 'white' : 'rgba(232,234,242,0.6)',
            border: filter === k ? 'none' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: '5px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
          }}>{l}</button>
        ))}
        <input
          value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..."
          style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 12px', color: '#e8eaf2', fontSize: 13, outline: 'none', width: 240 }}
        />
      </div>

      {/* Client list */}
      {loading ? (
        <div style={{ color: 'rgba(232,234,242,0.4)', fontSize: 14 }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayed.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'rgba(232,234,242,0.3)', fontSize: 13 }}>No clients found</div>
          )}
          {displayed.map(client => (
            <div key={client.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
              {/* Client row */}
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <button onClick={() => toggleExpand(client.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,234,242,0.5)', padding: 0, display: 'flex' }}>
                  {expanded === client.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#e8eaf2' }}>{client.name}</span>
                    {client.is_large_client && (
                      <span style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
                        LARGE CLIENT
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(232,234,242,0.45)', marginTop: 2 }}>
                    {[client.email, client.phone].filter(Boolean).join(' · ') || 'No contact info'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setShowLabelModal(client.id); setLabelForm(EMPTY_LABEL_FORM) }} style={{ background: 'rgba(232,121,249,0.1)', border: '1px solid rgba(232,121,249,0.25)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: '#e879f9', fontSize: 11, fontWeight: 700 }}>
                    + Label
                  </button>
                  <button onClick={() => openEdit(client)} style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#60a5fa' }}>
                    <Edit2 size={13} />
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {expanded === client.id && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '16px 18px', background: 'rgba(0,0,0,0.15)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: client.is_large_client ? '1fr 1fr' : '1fr', gap: 20 }}>
                    {/* Labels */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#e879f9', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Tag size={12} /> Labels
                      </div>
                      {(labels[client.id] || []).length === 0 ? (
                        <div style={{ fontSize: 12, color: 'rgba(232,234,242,0.3)', padding: '8px 0' }}>No labels yet</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {(labels[client.id] || []).map(lbl => (
                            <div key={lbl.id} style={{
                              padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)',
                              border: lbl.is_obsolete ? '1px solid rgba(220,38,38,0.2)' : '1px solid rgba(232,121,249,0.15)',
                              opacity: lbl.is_obsolete ? 0.6 : 1
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: '#e8eaf2' }}>
                                    {lbl.label_name}
                                    <span style={{ fontSize: 10, color: '#e879f9', marginLeft: 6, fontWeight: 700 }}>{lbl.artwork_version}</span>
                                    {lbl.is_obsolete && <span style={{ fontSize: 10, color: '#f87171', marginLeft: 6, fontWeight: 700 }}>OBSOLETE</span>}
                                  </div>
                                  <div style={{ fontSize: 11, color: 'rgba(232,234,242,0.4)', marginTop: 2 }}>
                                    <strong style={{ color: lbl.quantity > 0 ? '#4ade80' : '#f87171' }}>{Number(lbl.quantity).toLocaleString()} units</strong>
                                    {lbl.supplier && ` · ${lbl.supplier}`}
                                  </div>
                                </div>
                                <button onClick={() => toggleObsolete(client.id, lbl)} style={{
                                  background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
                                  padding: '3px 8px', cursor: 'pointer', color: 'rgba(232,234,242,0.5)', fontSize: 10
                                }}>
                                  {lbl.is_obsolete ? 'Restore' : 'Obsolete'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Client Stock (Large Client only) */}
                    {client.is_large_client && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Package size={12} /> Reserved Stock
                        </div>
                        {(clientStock[client.id] || []).length === 0 ? (
                          <div style={{ fontSize: 12, color: 'rgba(232,234,242,0.3)', padding: '8px 0' }}>No reserved stock</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {(clientStock[client.id] || []).map(s => (
                              <div key={s.id} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(167,139,250,0.15)' }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#e8eaf2' }}>{s.product_name}</div>
                                <div style={{ fontSize: 11, color: 'rgba(232,234,242,0.4)', marginTop: 2 }}>
                                  <strong style={{ color: s.quantity > 0 ? '#4ade80' : '#f87171' }}>{Number(s.quantity).toLocaleString()} {s.unit}</strong>
                                  {s.barcode && ` · ${s.barcode}`}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {client.notes && (
                    <div style={{ marginTop: 14, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 12, color: 'rgba(232,234,242,0.5)' }}>
                      {client.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Client Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8000 }}>
          <div style={{ background: '#13132b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 32, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 17, color: '#e8eaf2' }}>{editing ? 'Edit Client' : 'New Client'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,234,242,0.5)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <F label="Name *" full><Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Client name" /></F>
              <F label="Email"><Input value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="email@..." /></F>
              <F label="Phone"><Input value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="+61..." /></F>
              <F label="Address" full><Input value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} placeholder="Address" /></F>
              <F label="Notes" full>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...iStyle, resize: 'vertical', width: '100%' }} />
              </F>
              <F label="Client Type" full>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[false, true].map(v => (
                    <button key={String(v)} onClick={() => setForm(f => ({ ...f, is_large_client: v }))} style={{
                      background: form.is_large_client === v ? (v ? 'rgba(167,139,250,0.2)' : 'rgba(37,99,235,0.2)') : 'rgba(255,255,255,0.05)',
                      border: form.is_large_client === v ? `1px solid ${v ? '#a78bfa' : '#2563eb'}` : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      color: form.is_large_client === v ? (v ? '#a78bfa' : '#60a5fa') : 'rgba(232,234,242,0.5)'
                    }}>{v ? '⭐ Large Client' : 'Standard'}</button>
                  ))}
                </div>
              </F>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <Btn onClick={() => setShowModal(false)}>Cancel</Btn>
              <Btn primary onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Client'}</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Add Label Modal */}
      {showLabelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8000 }}>
          <div style={{ background: '#13132b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 16, color: '#e8eaf2' }}>Add Label Stock</h2>
              <button onClick={() => setShowLabelModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,234,242,0.5)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <F label="Label Name *" full><Input value={labelForm.label_name} onChange={v => setLabelForm(f => ({ ...f, label_name: v }))} placeholder="e.g. Clean Skin Black — Travel Spray 10ml" /></F>
              <F label="Artwork Version"><Input value={labelForm.artwork_version} onChange={v => setLabelForm(f => ({ ...f, artwork_version: v }))} placeholder="v1" /></F>
              <F label="Supplier"><Input value={labelForm.supplier} onChange={v => setLabelForm(f => ({ ...f, supplier: v }))} placeholder="Print Express..." /></F>
              <F label="Initial Qty (units)"><Input type="number" value={labelForm.quantity} onChange={v => setLabelForm(f => ({ ...f, quantity: v }))} placeholder="0" /></F>
              <F label="Notes" full>
                <textarea value={labelForm.notes} onChange={e => setLabelForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...iStyle, resize: 'none', width: '100%' }} />
              </F>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <Btn onClick={() => setShowLabelModal(null)}>Cancel</Btn>
              <Btn primary onClick={handleSaveLabel} disabled={labelSaving}>{labelSaving ? 'Saving...' : 'Add Label'}</Btn>
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
function Input({ value, onChange, placeholder, type = 'text' }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={iStyle} />
}
function Btn({ children, onClick, primary, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: primary ? '#2563eb' : 'rgba(255,255,255,0.06)',
      border: primary ? 'none' : '1px solid rgba(255,255,255,0.12)',
      borderRadius: 8, padding: '9px 20px', color: primary ? 'white' : '#e8eaf2',
      fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: disabled ? 0.7 : 1
    }}>{children}</button>
  )
}
const iStyle = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px', color: '#e8eaf2', fontSize: 13, outline: 'none' }
