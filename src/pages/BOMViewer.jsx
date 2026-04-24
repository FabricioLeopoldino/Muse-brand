import { useState, useEffect } from 'react'
import axios from 'axios'

function api() { return { headers: { Authorization: `Bearer ${localStorage.getItem('sm_token')}` } } }

const PRODUCT_TYPES = [
  { key: 'TRAVEL_SPRAY_10ML', label: 'Travel Spray 10ml', volume: 10, candle: false },
  { key: 'ROOM_SPRAY_50ML', label: 'Room Spray 50ml', volume: 50, candle: false },
  { key: 'ROOM_SPRAY_100ML', label: 'Room Spray 100ml', volume: 100, candle: false },
  { key: 'REED_DIFFUSER_200ML', label: 'Reed Diffuser 200ml', volume: 200, candle: false },
  { key: 'MICRO_OIL_15ML', label: 'Micro Oil 15ml', volume: 15, candle: false, fullOil: true },
  { key: 'CANDLE_240G', label: 'Candle 240G', volume: 240, candle: true },
  { key: 'CANDLE_400G', label: 'Candle 400G', volume: 400, candle: true },
]

const COMP_COLORS = {
  FRAGRANCE: '#a78bfa',
  ETHANOL: '#60a5fa',
  BOTTLE: '#4ade80',
  CANDLE_JAR: '#fbbf24',
  LID_SPRAY: '#fb923c',
  LID_SECOND: '#fb923c',
  LID_TOP: '#fb923c',
  LID_MAGNETIC: '#fb923c',
  LID_PLASTIC: '#fb923c',
  LID_METAL: '#fb923c',
  LID_15ML: '#fb923c',
  INSERT: '#e879f9',
  STICKS: '#e879f9',
}

function calcBOM(rules, productType, qty = 1, oilPct = 25) {
  const pt = PRODUCT_TYPES.find(p => p.key === productType)
  if (!pt) return []
  return rules.map(r => {
    let qtyRequired = r.quantity_per_unit * qty
    if (r.component_type === 'FRAGRANCE' && !pt.candle && !pt.fullOil) {
      qtyRequired = pt.volume * (oilPct / 100) * qty
    } else if (r.component_type === 'ETHANOL') {
      qtyRequired = pt.volume * ((100 - oilPct) / 100) * qty
    }
    return { ...r, qty_for_example: qtyRequired }
  })
}

export default function BOMViewer() {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState('TRAVEL_SPRAY_10ML')
  const [oilPct, setOilPct] = useState(25)
  const [exampleQty, setExampleQty] = useState(100)

  useEffect(() => {
    axios.get('/api/bom-rules', api()).then(r => {
      setRules(r.data)
      setLoading(false)
    })
  }, [])

  const selectedType = PRODUCT_TYPES.find(p => p.key === selected)
  const filteredRules = rules.filter(r => r.product_type === selected)
  const calculated = calcBOM(filteredRules, selected, exampleQty, oilPct)

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 22, color: '#e8eaf2', marginBottom: 4 }}>BOM Viewer</h1>
        <p style={{ fontSize: 13, color: 'rgba(232,234,242,0.4)' }}>Default Bill of Materials per product type. Packaging and Labels are selected dynamically per order.</p>
      </div>

      {/* Product type selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {PRODUCT_TYPES.map(pt => (
          <button key={pt.key} onClick={() => setSelected(pt.key)} style={{
            background: selected === pt.key ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.05)',
            border: selected === pt.key ? '1px solid #2563eb' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            color: selected === pt.key ? '#60a5fa' : 'rgba(232,234,242,0.6)'
          }}>{pt.label}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* BOM Rules */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(232,234,242,0.45)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Components per unit
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 24, color: 'rgba(232,234,242,0.4)', fontSize: 13 }}>Loading...</div>
            ) : filteredRules.length === 0 ? (
              <div style={{ padding: 24, color: 'rgba(232,234,242,0.3)', fontSize: 13, textAlign: 'center' }}>No BOM rules found</div>
            ) : filteredRules.map((r, i) => (
              <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: COMP_COLORS[r.component_type] || '#e8eaf2', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf2' }}>{r.component_type.replace(/_/g, ' ')}</div>
                    {r.component_type === 'FRAGRANCE' && !selectedType?.candle && !selectedType?.fullOil && (
                      <div style={{ fontSize: 11, color: 'rgba(232,234,242,0.4)' }}>Dynamic — based on oil %</div>
                    )}
                    {r.component_type === 'ETHANOL' && (
                      <div style={{ fontSize: 11, color: 'rgba(232,234,242,0.4)' }}>Dynamic — based on oil %</div>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {r.component_type === 'FRAGRANCE' && !selectedType?.candle && !selectedType?.fullOil ? (
                    <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 700 }}>{selectedType?.volume * oilPct / 100} {r.unit} @ {oilPct}%</span>
                  ) : r.component_type === 'ETHANOL' ? (
                    <span style={{ fontSize: 12, color: '#60a5fa', fontWeight: 700 }}>{selectedType ? selectedType.volume * (100 - oilPct) / 100 : 0} {r.unit} @ {100 - oilPct}%</span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#e8eaf2', fontWeight: 700 }}>{r.quantity_per_unit} {r.unit}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 8, fontSize: 12, color: 'rgba(232,234,242,0.5)' }}>
            📦 <strong style={{ color: '#e8eaf2' }}>Packaging</strong> and <strong style={{ color: '#e8eaf2' }}>Labels</strong> are not in the default BOM — they are selected dynamically when creating a Production Order.
          </div>
        </div>

        {/* Formula Calculator */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(232,234,242,0.45)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Formula Calculator
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Quantity</label>
                <input type="number" value={exampleQty} onChange={e => setExampleQty(parseInt(e.target.value) || 1)} min={1}
                  style={inputStyle} />
              </div>
              {!selectedType?.candle && !selectedType?.fullOil && (
                <div>
                  <label style={labelStyle}>Oil % (default 25%)</label>
                  <input type="number" value={oilPct} onChange={e => setOilPct(Math.min(100, Math.max(1, parseInt(e.target.value) || 25)))} min={1} max={100}
                    style={inputStyle} />
                </div>
              )}
            </div>

            {selectedType && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(232,234,242,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  Total for {exampleQty} × {selectedType.label}
                </div>
                {calculated.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: COMP_COLORS[r.component_type] || '#e8eaf2' }} />
                      <span style={{ fontSize: 13, color: 'rgba(232,234,242,0.7)' }}>{r.component_type.replace(/_/g, ' ')}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: COMP_COLORS[r.component_type] || '#e8eaf2' }}>
                      {r.qty_for_example % 1 === 0 ? r.qty_for_example.toLocaleString() : r.qty_for_example.toFixed(1)} {r.unit}
                      {r.unit === 'ml' && r.qty_for_example >= 1000 && (
                        <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(232,234,242,0.4)', marginLeft: 4 }}>({(r.qty_for_example / 1000).toFixed(2)}L)</span>
                      )}
                    </span>
                  </div>
                ))}

                {!selectedType.candle && !selectedType.fullOil && (
                  <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(232,234,242,0.5)', marginBottom: 4 }}>TOTAL FORMULA</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#a78bfa' }}>
                      {(exampleQty * selectedType.volume).toLocaleString()} ml
                      {exampleQty * selectedType.volume >= 1000 && (
                        <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(232,234,242,0.4)', marginLeft: 6 }}>({(exampleQty * selectedType.volume / 1000).toFixed(2)}L)</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(232,234,242,0.4)', marginTop: 2 }}>
                      Oil: {(exampleQty * selectedType.volume * oilPct / 100).toFixed(1)}ml · Ethanol: {(exampleQty * selectedType.volume * (100 - oilPct) / 100).toFixed(1)}ml
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(232,234,242,0.5)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }
const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px', color: '#e8eaf2', fontSize: 13, outline: 'none' }
