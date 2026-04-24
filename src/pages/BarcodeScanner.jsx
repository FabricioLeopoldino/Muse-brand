import { useState, useEffect, useRef } from 'react'
import { ScanBarcode, Plus, Minus, SlidersHorizontal, Search } from 'lucide-react'
import axios from 'axios'
import { useToast } from '../App.jsx'

function api() { return { headers: { Authorization: `Bearer ${localStorage.getItem('sm_token')}` } } }

const CAT_COLORS = { FRAGRANCE:'#a78bfa', RAW_MATERIALS:'#fbbf24', COMPONENTS:'#60a5fa', FINISHED_GOODS:'#4ade80', READY_FORMULA:'#fb923c' }

export default function BarcodeScanner() {
  const [barcode, setBarcode]       = useState('')
  const [found, setFound]           = useState(null)
  const [notFound, setNotFound]     = useState(false)
  const [action, setAction]         = useState('add') // add | remove | adjust
  const [quantity, setQuantity]     = useState('')
  const [newStock, setNewStock]     = useState('')
  const [notes, setNotes]           = useState('')
  const [saving, setSaving]         = useState(false)
  const [lastActions, setLastActions] = useState([]) // recent scan history
  const barcodeRef = useRef(null)
  const { addToast } = useToast()

  // Auto-focus barcode input on mount
  useEffect(() => { barcodeRef.current?.focus() }, [])

  async function handleScan(e) {
    e.preventDefault()
    if (!barcode.trim()) return
    setNotFound(false)
    setFound(null)
    try {
      const res = await axios.get(`/api/barcode/${barcode.trim()}`, api())
      setFound(res.data)
      setQuantity('')
      setNewStock(res.data.current_stock)
      setNotes('')
    } catch (e) {
      if (e.response?.status === 404) { setNotFound(true) }
      else { addToast('Scan error', 'error') }
    }
  }

  function handleBarcodeKey(e) {
    // Most barcode scanners send Enter after the code
    if (e.key === 'Enter') handleScan(e)
  }

  async function handleAction() {
    if (!found) return
    if (action === 'adjust' && newStock === '') { addToast('Enter new stock value', 'error'); return }
    if (action !== 'adjust' && (!quantity || parseFloat(quantity) <= 0)) { addToast('Enter a valid quantity', 'error'); return }
    setSaving(true)
    try {
      let endpoint, payload
      if (action === 'adjust') {
        endpoint = '/api/stock/adjust'
        payload  = { product_id: found.id, new_stock: parseFloat(newStock), notes: notes || null }
      } else {
        endpoint = `/api/stock/${action}`
        payload  = { product_id: found.id, quantity: parseFloat(quantity), notes: notes || null }
      }
      const res = await axios.post(endpoint, payload, api())
      const delta = action === 'add' ? +parseFloat(quantity) : action === 'remove' ? -parseFloat(quantity) : parseFloat(newStock) - parseFloat(found.current_stock)
      addToast(`${found.name} — stock ${action === 'add' ? 'added' : action === 'remove' ? 'removed' : 'adjusted'}`)

      // Add to recent history
      setLastActions(prev => [{
        product: found.name, code: found.product_code,
        action, delta, newBalance: res.data.current_stock, unit: found.unit,
        time: new Date()
      }, ...prev.slice(0, 9)])

      // Reset for next scan
      setFound(null)
      setBarcode('')
      setQuantity('')
      setNotes('')
      setTimeout(() => barcodeRef.current?.focus(), 100)
    } catch (e) {
      addToast(e.response?.data?.error || 'Failed', 'error')
    } finally { setSaving(false) }
  }

  function clearAndRescan() {
    setFound(null); setNotFound(false); setBarcode('')
    setTimeout(() => barcodeRef.current?.focus(), 50)
  }

  return (
    <div style={{ padding: 28, maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 22, color: '#e8eaf2' }}>Barcode Scanner</h1>
        <p style={{ fontSize: 13, color: 'rgba(232,234,242,0.4)', marginTop: 4 }}>Scan a product barcode or type it manually</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: found ? '1fr 1fr' : '1fr', gap: 24 }}>
        {/* Left — scan + action */}
        <div>
          {/* Scan input */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <ScanBarcode size={20} color="#2563eb" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#e8eaf2' }}>Scan / Enter Barcode</span>
            </div>
            <form onSubmit={handleScan} style={{ display: 'flex', gap: 10 }}>
              <input
                ref={barcodeRef}
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                onKeyDown={handleBarcodeKey}
                placeholder="Scan barcode or type manually..."
                style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '2px solid rgba(37,99,235,0.4)', borderRadius: 8, padding: '10px 14px', color: '#e8eaf2', fontSize: 14, outline: 'none', fontFamily: 'monospace' }}
                autoComplete="off"
              />
              <button type="submit" style={{ background: '#2563eb', border: 'none', borderRadius: 8, padding: '10px 18px', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Search
              </button>
            </form>
            {notFound && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 8, fontSize: 13, color: '#f87171' }}>
                ⚠ No product found for barcode: <strong style={{ fontFamily: 'monospace' }}>{barcode}</strong>
              </div>
            )}
          </div>

          {/* Action panel — only shows after scan */}
          {found && (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12, padding: 24 }}>
              {/* Product info */}
              <div style={{ marginBottom: 18, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#e8eaf2', marginBottom: 4 }}>{found.name}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(232,234,242,0.5)' }}>{found.product_code}</span>
                      {found.category && <span style={{ background: `${CAT_COLORS[found.category]}18`, color: CAT_COLORS[found.category], padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{found.category.replace('_',' ')}</span>}
                    </div>
                    {found.bin_location && <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>📍 {found.bin_location}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: Number(found.current_stock) <= 0 ? '#f87171' : '#4ade80' }}>
                      {Number(found.current_stock).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(232,234,242,0.4)' }}>{found.unit} in stock</div>
                  </div>
                </div>
              </div>

              {/* Action selector */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[['add','Add','#22c55e'],['remove','Remove','#f87171'],['adjust','Adjust','#60a5fa']].map(([k,l,c]) => (
                  <button key={k} onClick={() => setAction(k)} style={{ flex: 1, background: action === k ? `${c}20` : 'rgba(255,255,255,0.04)', border: action === k ? `1px solid ${c}60` : '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 0', cursor: 'pointer', color: action === k ? c : 'rgba(232,234,242,0.5)', fontSize: 12, fontWeight: 700 }}>{l}</button>
                ))}
              </div>

              {/* Quantity */}
              {action === 'adjust' ? (
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>New Stock Value ({found.unit})</label>
                  <input type="number" value={newStock} onChange={e => setNewStock(e.target.value)} step="any" style={inp} autoFocus />
                </div>
              ) : (
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Quantity ({found.unit})</label>
                  <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min={0.01} step="any" placeholder="0" style={inp} autoFocus />
                </div>
              )}

              <div style={{ marginBottom: 18 }}>
                <label style={lbl}>Notes (optional)</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Batch, PO number, reason..." style={inp} />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={clearAndRescan} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 16px', color: 'rgba(232,234,242,0.6)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                  ← Scan Another
                </button>
                <button onClick={handleAction} disabled={saving} style={{
                  flex: 1, background: action === 'add' ? '#22c55e' : action === 'remove' ? '#dc2626' : '#2563eb',
                  border: 'none', borderRadius: 8, padding: '9px 0', color: 'white',
                  fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: saving ? 0.7 : 1
                }}>
                  {saving ? 'Saving...' : action === 'add' ? 'Add Stock' : action === 'remove' ? 'Remove Stock' : 'Set Stock'}
                </button>
              </div>
            </div>
          )}

          {/* Hint when nothing scanned */}
          {!found && !notFound && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(232,234,242,0.2)' }}>
              <ScanBarcode size={48} style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 13 }}>Ready to scan</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Point scanner at barcode or type manually above</div>
            </div>
          )}
        </div>

        {/* Right — recent scan history */}
        {lastActions.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(232,234,242,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Recent Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lastActions.map((a, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#e8eaf2' }}>{a.product}</div>
                    <div style={{ fontSize: 11, color: 'rgba(232,234,242,0.4)', marginTop: 2 }}>
                      {a.time.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: a.action === 'add' ? '#4ade80' : a.action === 'remove' ? '#f87171' : '#60a5fa' }}>
                      {a.action === 'add' ? '+' : a.action === 'remove' ? '-' : '~'}{Math.abs(a.delta).toLocaleString()} {a.unit}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(232,234,242,0.4)' }}>→ {Number(a.newBalance).toLocaleString()} {a.unit}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(232,234,242,0.5)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }
const inp = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px', color: '#e8eaf2', fontSize: 13, outline: 'none' }
