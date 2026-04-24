import { useState, useEffect } from 'react'
import { useLocation } from 'wouter'
import { AlertTriangle, Clock, Package, Layers, Beaker, RotateCcw, ChevronRight, ShoppingCart, TrendingDown, Users } from 'lucide-react'
import { useAuth } from '../App.jsx'
import axios from 'axios'
import GlowingEffect from '../components/GlowingEffect.jsx'

function api() { return { headers: { Authorization: `Bearer ${localStorage.getItem('sm_token')}` } } }

const STATUS_COLORS = {
  draft: { bg: 'rgba(255,255,255,0.08)', text: '#cbd5e1', label: 'Draft' },
  confirmed: { bg: 'rgba(37,99,235,0.18)', text: '#60a5fa', label: 'Confirmed' },
  queued: { bg: 'rgba(245,158,11,0.18)', text: '#fbbf24', label: 'Queued' },
  in_production: { bg: 'rgba(244,114,182,0.18)', text: '#f472b6', label: 'In Production' },
  waiting_external: { bg: 'rgba(167,139,250,0.18)', text: '#a78bfa', label: 'Waiting External' },
  completed: { bg: 'rgba(34,197,94,0.18)', text: '#4ade80', label: 'Completed' },
  ready_to_ship: { bg: 'rgba(16,185,129,0.18)', text: '#34d399', label: 'Ready to Ship' },
  fulfilled: { bg: 'rgba(255,255,255,0.06)', text: 'rgba(232,234,242,0.4)', label: 'Fulfilled' },
  cancelled: { bg: 'rgba(220,38,38,0.1)', text: '#f87171', label: 'Cancelled' },
}

const CATEGORY_ICONS = {
  FRAGRANCE: <Beaker size={14} />,
  RAW_MATERIALS: <Package size={14} />,
  COMPONENTS: <Layers size={14} />,
  FINISHED_GOODS: <Package size={14} />,
  READY_FORMULA: <Beaker size={14} />,
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.draft
  return (
    <span style={{ background: s.bg, color: s.text, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  )
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU')
}

function isOverdue(dueDate) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

export default function Dashboard() {
  const [watchlist, setWatchlist] = useState([])
  const [activeOrders, setActiveOrders] = useState([])
  const [labelsPending, setLabelsPending] = useState([])
  const [candlesInProgress, setCandlesInProgress] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [, navigate] = useLocation()
  const { user } = useAuth()

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [w, a, l, c, s] = await Promise.all([
        axios.get('/api/dashboard/priority-watchlist', api()),
        axios.get('/api/dashboard/active-orders', api()),
        axios.get('/api/dashboard/labels-pending', api()),
        axios.get('/api/dashboard/candles-in-progress', api()),
        axios.get('/api/dashboard/stats', api()),
      ])
      setWatchlist(w.data)
      setActiveOrders(a.data)
      setLabelsPending(l.data)
      setCandlesInProgress(c.data)
      setStats(s.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 28, maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 22, color: '#e8eaf2', marginBottom: 4 }}>
          Dashboard
        </h1>
        <p style={{ color: 'rgba(232,234,242,0.45)', fontSize: 13 }}>
          {new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {loading ? (
        <div style={{ color: 'rgba(232,234,242,0.4)', fontSize: 14 }}>Loading...</div>
      ) : (
        <>
        {/* Stats Cards */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
            {[
              { label: 'Total Products', value: stats.total_products, icon: <Package size={18} />, color: '#60a5fa', path: '/products' },
              { label: 'Active Orders', value: stats.active_orders, icon: <Clock size={18} />, color: '#a78bfa', path: '/production-orders' },
              { label: 'Low Stock Items', value: stats.low_stock, icon: <TrendingDown size={18} />, color: stats.low_stock > 0 ? '#f59e0b' : '#4ade80', path: '/stock' },
              { label: 'Pending POs', value: stats.pending_pos, icon: <ShoppingCart size={18} />, color: stats.pending_pos > 0 ? '#fb923c' : '#4ade80', path: '/incoming-orders' },
            ].map(card => (
              <div key={card.label} onClick={() => navigate(card.path)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px', cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s', position: 'relative', overflow: 'visible' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${card.color}50`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 24px rgba(0,0,0,0.4)` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <GlowingEffect spread={25} proximity={60} inactiveZone={0.15} borderWidth={1} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 28, fontFamily: 'Archivo Black, sans-serif', color: card.color, lineHeight: 1 }}>{card.value}</div>
                    <div style={{ fontSize: 11, color: 'rgba(232,234,242,0.45)', marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>{card.label}</div>
                  </div>
                  <div style={{ color: card.color, opacity: 0.6 }}>{card.icon}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Priority Watchlist */}
          <div>
            <SectionHeader
              title="Priority Watchlist"
              subtitle="Stock at or below minimum level"
              icon={<AlertTriangle size={15} color="#f59e0b" />}
              badge={watchlist.length > 0 ? { text: `${watchlist.length} items`, color: '#f59e0b' } : null}
            />
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
              {watchlist.length === 0 ? (
                <EmptyState icon={<AlertTriangle size={20} />} text="All stock levels are healthy" />
              ) : (
                watchlist.map(item => (
                  <div key={item.id} style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ color: 'rgba(232,234,242,0.4)' }}>{CATEGORY_ICONS[item.category]}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf2' }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: 'rgba(232,234,242,0.4)' }}>{item.product_code} · {item.category}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: 13, fontWeight: 700,
                        color: item.current_stock <= 0 ? '#f87171' : '#fbbf24'
                      }}>
                        {Number(item.current_stock).toLocaleString()} {item.unit}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(232,234,242,0.4)' }}>
                        min: {Number(item.min_stock_level).toLocaleString()}
                      </div>
                      {item.pending_po_qty > 0 && (
                        <div style={{ fontSize: 11, color: '#10b981' }}>+{Number(item.pending_po_qty).toLocaleString()} on order</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Production Orders */}
          <div>
            <SectionHeader
              title="Active Production Orders"
              subtitle="All non-fulfilled orders"
              icon={<Clock size={15} color="#60a5fa" />}
              badge={activeOrders.length > 0 ? { text: `${activeOrders.length}`, color: '#60a5fa' } : null}
              action={{ label: 'View all', onClick: () => navigate('/production-orders') }}
            />
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
              {activeOrders.length === 0 ? (
                <EmptyState icon={<Clock size={20} />} text="No active orders" />
              ) : (
                activeOrders.map(order => (
                  <div key={order.id} style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    transition: 'background 0.1s'
                  }}
                    onClick={() => navigate('/production-orders')}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#e8eaf2' }}>{order.order_number}</span>
                          <StatusBadge status={order.status} />
                          {order.order_type === 'LARGE_CLIENT' && (
                            <span style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
                              LARGE CLIENT
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(232,234,242,0.55)' }}>{order.client_name || 'No client'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {order.due_date && (
                          <div style={{ fontSize: 12, color: isOverdue(order.due_date) ? '#f87171' : 'rgba(232,234,242,0.45)' }}>
                            {isOverdue(order.due_date) ? '⚠️ ' : ''}Due {formatDate(order.due_date)}
                          </div>
                        )}
                        {order.shopify_order_number && (
                          <div style={{ fontSize: 11, color: '#60a5fa', marginTop: 2 }}>{order.shopify_order_number}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Labels Pending */}
          {labelsPending.length > 0 && (
            <div>
              <SectionHeader
                title="Labels Pending"
                subtitle="Labels ordered but not yet received"
                icon={<Package size={15} color="#e879f9" />}
                badge={{ text: `${labelsPending.length}`, color: '#e879f9' }}
              />
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                {labelsPending.map((item, i) => (
                  <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf2' }}>{item.order_number}</div>
                      <div style={{ fontSize: 11, color: 'rgba(232,234,242,0.45)' }}>{item.client_name} · {item.labels_supplier || 'Supplier TBD'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {item.labels_eta ? (
                        <div style={{ fontSize: 12, color: '#10b981' }}>ETA: {formatDate(item.labels_eta)}</div>
                      ) : (
                        <div style={{ fontSize: 12, color: '#f59e0b' }}>No ETA</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Candles in Progress */}
          {candlesInProgress.length > 0 && (
            <div>
              <SectionHeader
                title="Candles in Progress"
                subtitle="Active candle orders"
                icon={<Beaker size={15} color="#fbbf24" />}
                badge={{ text: `${candlesInProgress.length}`, color: '#fbbf24' }}
              />
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                {candlesInProgress.map(item => (
                  <div key={item.id} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf2' }}>{item.order_number}</div>
                      <div style={{ fontSize: 11, color: 'rgba(232,234,242,0.45)' }}>{item.client_name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <StatusBadge status={item.status} />
                      {item.candle_status && (
                        <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 4 }}>{item.candle_status.replace(/_/g, ' ')}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Large Client Tracker */}
        {stats?.large_clients?.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <SectionHeader
              title="Large Client Reserved Stock"
              subtitle="Components reserved per large client"
              icon={<Users size={15} color="#a78bfa" />}
              action={{ label: 'Manage clients', onClick: () => navigate('/clients') }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {stats.large_clients.map(c => (
                <div key={c.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eaf2' }}>{c.name}</div>
                    <span style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>LARGE</span>
                  </div>
                  <div style={{ display: 'flex', gap: 20 }}>
                    <div>
                      <div style={{ fontSize: 20, fontFamily: 'Archivo Black, sans-serif', color: '#a78bfa' }}>{c.reserved_count || 0}</div>
                      <div style={{ fontSize: 10, color: 'rgba(232,234,242,0.4)', textTransform: 'uppercase', letterSpacing: 0.4 }}>SKU types</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 20, fontFamily: 'Archivo Black, sans-serif', color: '#c4b5fd' }}>{Number(c.total_reserved || 0).toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: 'rgba(232,234,242,0.4)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Total reserved</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </>
      )}
    </div>
  )
}

function SectionHeader({ title, subtitle, icon, badge, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          {icon}
          <h2 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 14, color: '#e8eaf2' }}>{title}</h2>
          {badge && (
            <span style={{ background: `rgba(${badge.color === '#f59e0b' ? '245,158,11' : badge.color === '#60a5fa' ? '96,165,250' : badge.color === '#e879f9' ? '232,121,249' : '251,191,36'},0.15)`, color: badge.color, padding: '1px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
              {badge.text}
            </span>
          )}
        </div>
        {subtitle && <p style={{ fontSize: 11, color: 'rgba(232,234,242,0.4)' }}>{subtitle}</p>}
      </div>
      {action && (
        <button onClick={action.onClick} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
          {action.label} <ChevronRight size={12} />
        </button>
      )}
    </div>
  )
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ padding: '28px 16px', textAlign: 'center', color: 'rgba(232,234,242,0.3)' }}>
      <div style={{ marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13 }}>{text}</div>
    </div>
  )
}
