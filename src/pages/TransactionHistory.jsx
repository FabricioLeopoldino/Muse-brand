import { useState, useEffect } from 'react'
import { Download, Search } from 'lucide-react'
import axios from 'axios'
import { useToast } from '../App.jsx'

function api() { return { headers: { Authorization: `Bearer ${localStorage.getItem('sm_token')}` } } }

const TYPE_META = {
  add:                      { label: 'Add Stock',         color: '#4ade80' },
  remove:                   { label: 'Remove Stock',       color: '#f87171' },
  adjust:                   { label: 'Adjustment',         color: '#60a5fa' },
  production_debit:         { label: 'Production Debit',   color: '#f472b6' },
  po_received:              { label: 'PO Received',        color: '#34d399' },
  ready_formula_in:         { label: 'Ready Formula In',   color: '#fb923c' },
  ready_formula_used:       { label: 'Ready Formula Used', color: '#fbbf24' },
  stock_reserved:           { label: 'Reserved',           color: '#a78bfa' },
  stock_reservation_released: { label: 'Reservation Released', color: 'rgba(232,234,242,0.4)' },
  return:                   { label: 'Return',             color: '#a78bfa' },
}

const PRESETS = [
  { key: 'today',      label: 'Today' },
  { key: 'yesterday',  label: 'Yesterday' },
  { key: '7days',      label: '7 Days' },
  { key: 'thismonth',  label: 'This Month' },
  { key: 'lastmonth',  label: 'Last Month' },
  { key: 'all',        label: 'All Time' },
]

function getPresetRange(key) {
  const now = new Date()
  const pad = d => String(d).padStart(2, '0')
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
  switch (key) {
    case 'today':      return { from: fmt(now), to: fmt(now) }
    case 'yesterday':  { const d = new Date(now); d.setDate(d.getDate()-1); return { from: fmt(d), to: fmt(d) } }
    case '7days':      { const d = new Date(now); d.setDate(d.getDate()-7); return { from: fmt(d), to: fmt(now) } }
    case 'thismonth':  return { from: `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`, to: fmt(now) }
    case 'lastmonth':  { const d = new Date(now.getFullYear(), now.getMonth()-1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { from: fmt(d), to: fmt(e) } }
    default:           return { from: '', to: '' }
  }
}

const CATEGORIES = ['ALL','FRAGRANCE','RAW_MATERIALS','COMPONENTS','FINISHED_GOODS','READY_FORMULA']
const CAT_COLORS = { FRAGRANCE:'#a78bfa', RAW_MATERIALS:'#fbbf24', COMPONENTS:'#60a5fa', FINISHED_GOODS:'#4ade80', READY_FORMULA:'#fb923c' }

function isPositive(type) { return ['add','po_received','ready_formula_in','return','stock_reserved'].includes(type) }
function isNegative(type) { return ['remove','production_debit','ready_formula_used','stock_reservation_released'].includes(type) }

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(false)
  const [preset, setPreset]             = useState('7days')
  const [from, setFrom]                 = useState('')
  const [to, setTo]                     = useState('')
  const [typeFilter, setTypeFilter]     = useState('')
  const [catFilter, setCatFilter]       = useState('ALL')
  const [search, setSearch]             = useState('')
  const { addToast } = useToast()

  useEffect(() => {
    const range = getPresetRange(preset)
    setFrom(range.from)
    setTo(range.to)
  }, [preset])

  useEffect(() => { if (from !== undefined) loadTransactions() }, [from, to, typeFilter, catFilter])

  async function loadTransactions() {
    setLoading(true)
    try {
      const params = {}
      if (from) params.from = from + 'T00:00:00'
      if (to) params.to = to + 'T23:59:59'
      if (typeFilter) params.type = typeFilter
      const res = await axios.get('/api/transactions', { ...api(), params })
      setTransactions(res.data)
    } catch { addToast('Failed to load transactions', 'error') }
    finally { setLoading(false) }
  }

  function exportExcel() {
    try {
      const XLSX = window.XLSX
      if (!XLSX) { addToast('Excel export not available', 'error'); return }
      const rows = displayed.map(t => ({
        Date: new Date(t.created_at).toLocaleDateString('en-AU'),
        Time: new Date(t.created_at).toLocaleTimeString('en-AU'),
        Type: TYPE_META[t.type]?.label || t.type,
        Product: t.product_name,
        Code: t.product_code,
        Category: t.category,
        Quantity: t.quantity,
        Unit: t.unit,
        'Balance After': t.balance_after,
        Notes: t.notes || '',
        User: t.user_name || '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions')
      const label = preset === 'all' ? 'AllTime' : preset
      XLSX.writeFile(wb, `SM_Transactions_${label}_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (e) { addToast('Export failed: ' + e.message, 'error') }
  }

  const displayed = transactions.filter(t =>
    (catFilter === 'ALL' || t.category === catFilter) &&
    (!search || (t.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.product_code || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.notes || '').toLowerCase().includes(search.toLowerCase()))
  )

  const allTypes = [...new Set(transactions.map(t => t.type))]

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 22, color: '#e8eaf2' }}>Transaction History</h1>
        <button onClick={exportExcel} style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, padding: '8px 16px', color: '#4ade80', fontSize: 13, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Download size={14} /> Export Excel
        </button>
      </div>

      {/* Date presets */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {PRESETS.map(p => (
          <button key={p.key} onClick={() => setPreset(p.key)} style={{
            background: preset === p.key ? '#2563eb' : 'rgba(255,255,255,0.05)',
            color: preset === p.key ? 'white' : 'rgba(232,234,242,0.6)',
            border: preset === p.key ? 'none' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
          }}>{p.label}</button>
        ))}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 6 }}>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPreset('') }} style={inp2} />
          <span style={{ color: 'rgba(232,234,242,0.4)', fontSize: 12 }}>→</span>
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPreset('') }} style={inp2} />
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCatFilter(c)} style={{
            background: catFilter === c ? (CAT_COLORS[c] || '#22c55e') : 'rgba(255,255,255,0.04)',
            color: catFilter === c ? (c === 'ALL' ? 'white' : '#0e0e1a') : 'rgba(232,234,242,0.5)',
            border: catFilter === c ? 'none' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer'
          }}>{c.replace('_', ' ')}</button>
        ))}
      </div>

      {/* Type + search filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...inp2, minWidth: 180 }}>
          <option value="">All Types</option>
          {allTypes.map(t => <option key={t} value={t}>{TYPE_META[t]?.label || t}</option>)}
        </select>
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(232,234,242,0.4)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product or notes..." style={{ ...inp2, paddingLeft: 30, width: '100%' }} />
        </div>
      </div>

      {/* Summary counts */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <Chip label="Total" value={displayed.length} color="#e8eaf2" />
        <Chip label="Additions" value={displayed.filter(t => isPositive(t.type)).length} color="#4ade80" />
        <Chip label="Removals" value={displayed.filter(t => isNegative(t.type)).length} color="#f87171" />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ color: 'rgba(232,234,242,0.4)', fontSize: 14 }}>Loading...</div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Date', 'Type', 'Product', 'Qty', 'Balance', 'Notes', 'User'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(232,234,242,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '32px 14px', textAlign: 'center', color: 'rgba(232,234,242,0.3)', fontSize: 13 }}>No transactions in this period</td></tr>
              ) : displayed.map(t => {
                const meta = TYPE_META[t.type] || { label: t.type, color: '#e8eaf2' }
                const sign = isPositive(t.type) ? '+' : isNegative(t.type) ? '-' : '~'
                const qtyColor = isPositive(t.type) ? '#4ade80' : isNegative(t.type) ? '#f87171' : '#60a5fa'
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '9px 14px', fontSize: 12, color: 'rgba(232,234,242,0.6)', whiteSpace: 'nowrap' }}>
                      {new Date(t.created_at).toLocaleDateString('en-AU')}
                      <div style={{ fontSize: 10, color: 'rgba(232,234,242,0.3)' }}>{new Date(t.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td style={{ padding: '9px 14px' }}>
                      <span style={{ background: `${meta.color}18`, color: meta.color, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{meta.label}</span>
                    </td>
                    <td style={{ padding: '9px 14px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#e8eaf2' }}>{t.product_name || '—'}</div>
                      {t.category && (
                        <span style={{ fontSize: 10, color: CAT_COLORS[t.category] || 'rgba(232,234,242,0.4)' }}>{t.category.replace('_',' ')}</span>
                      )}
                    </td>
                    <td style={{ padding: '9px 14px', fontWeight: 700, color: qtyColor, fontSize: 13 }}>
                      {sign}{Number(t.quantity).toLocaleString()} {t.unit}
                    </td>
                    <td style={{ padding: '9px 14px', fontSize: 12, color: 'rgba(232,234,242,0.6)' }}>
                      {t.balance_after !== null ? `${Number(t.balance_after).toLocaleString()} ${t.unit}` : '—'}
                    </td>
                    <td style={{ padding: '9px 14px', fontSize: 12, color: 'rgba(232,234,242,0.45)', maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.notes || '—'}</div>
                    </td>
                    <td style={{ padding: '9px 14px', fontSize: 12, color: 'rgba(232,234,242,0.4)' }}>{t.user_name || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: 'rgba(232,234,242,0.35)' }}>
            {displayed.length} transaction{displayed.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}

function Chip({ label, value, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 14px', fontSize: 12 }}>
      <span style={{ color: 'rgba(232,234,242,0.45)' }}>{label}: </span>
      <strong style={{ color }}>{value}</strong>
    </div>
  )
}

const inp2 = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 10px', color: '#e8eaf2', fontSize: 12, outline: 'none' }
