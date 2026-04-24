import { useState, useEffect, createContext, useContext } from 'react'
import { Router, Route, Switch, useLocation } from 'wouter'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import ChangePassword from './pages/ChangePassword.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Products from './pages/Products.jsx'
import StockManagement from './pages/StockManagement.jsx'
import BOMViewer from './pages/BOMViewer.jsx'
import Clients from './pages/Clients.jsx'
import ProductionOrders from './pages/ProductionOrders.jsx'
import ManufacturingQueue from './pages/ManufacturingQueue.jsx'
import TransactionHistory from './pages/TransactionHistory.jsx'
import IncomingOrders from './pages/IncomingOrders.jsx'
import ActivityLog from './pages/ActivityLog.jsx'
import UserManagement from './pages/UserManagement.jsx'
import Returns from './pages/Returns.jsx'
import BarcodeScanner from './pages/BarcodeScanner.jsx'

// ─────────────────────────────────────────
// AUTH CONTEXT
// ─────────────────────────────────────────
export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

// ─────────────────────────────────────────
// TOAST CONTEXT
// ─────────────────────────────────────────
export const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

// ─────────────────────────────────────────
// APP
// ─────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('sm_token')
    const savedUser = localStorage.getItem('sm_user')
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {}
    }
    setLoading(false)
  }, [])

  function login(token, userData) {
    localStorage.setItem('sm_token', token)
    localStorage.setItem('sm_user', JSON.stringify(userData))
    setUser(userData)
  }

  function logout() {
    localStorage.removeItem('sm_token')
    localStorage.removeItem('sm_user')
    setUser(null)
  }

  function addToast(message, type = 'success') {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0e0e1a' }}>
        <div style={{ color: '#e8eaf2', fontSize: 14 }}>Loading...</div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <ToastContext.Provider value={{ addToast }}>
        {/* Toast container */}
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {toasts.map(t => (
            <div key={t.id} style={{
              background:
                t.type === 'error'   ? 'rgba(20,4,4,0.95)' :
                t.type === 'warning' ? 'rgba(20,14,4,0.95)' :
                'rgba(4,18,10,0.95)',
              border: `1px solid ${t.type === 'error' ? 'rgba(220,38,38,0.4)' : t.type === 'warning' ? 'rgba(245,158,11,0.4)' : 'rgba(34,197,94,0.4)'}`,
              color: t.type === 'error' ? '#f87171' : t.type === 'warning' ? '#fbbf24' : '#4ade80',
              padding: '11px 16px', borderRadius: 10, fontSize: 13,
              fontWeight: 700,
              boxShadow: `0 6px 24px rgba(0,0,0,0.6), 0 0 12px ${t.type === 'error' ? 'rgba(220,38,38,0.15)' : t.type === 'warning' ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)'}`,
              backdropFilter: 'blur(12px)',
              animation: 'slideIn 0.22s ease', maxWidth: 320,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 15 }}>
                {t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠' : '✓'}
              </span>
              {t.message}
            </div>
          ))}
        </div>

        {!user ? (
          <Login />
        ) : user.must_change_password ? (
          <ChangePassword />
        ) : (
          <Router>
            <Layout>
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/production-orders" component={ProductionOrders} />
                <Route path="/manufacturing-queue" component={ManufacturingQueue} />
                <Route path="/products" component={Products} />
                <Route path="/stock" component={StockManagement} />
                <Route path="/bom" component={BOMViewer} />
                <Route path="/clients" component={Clients} />
                <Route path="/barcode" component={BarcodeScanner} />
                <Route path="/incoming-orders" component={IncomingOrders} />
                <Route path="/returns" component={Returns} />
                <Route path="/transactions" component={TransactionHistory} />
                <Route path="/activity-log" component={ActivityLog} />
                <Route path="/users" component={UserManagement} />
                <Route component={() => <PlaceholderPage title="Page Not Found" />} />
              </Switch>
            </Layout>
          </Router>
        )}
      </ToastContext.Provider>
    </AuthContext.Provider>
  )
}

function PlaceholderPage({ title }) {
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 24, color: '#e8eaf2', marginBottom: 12 }}>{title}</h1>
      <p style={{ color: 'rgba(232,234,242,0.45)', fontSize: 14 }}>This page is under construction.</p>
    </div>
  )
}
