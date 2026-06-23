import { useState, useEffect, createContext, useContext } from 'react'
import { Router, Route, Switch, useLocation } from 'wouter'
import { Check, AlertTriangle, X } from 'lucide-react'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import ChangePassword from './pages/ChangePassword.jsx'
import Dashboard from './pages/Dashboard.jsx'
import StockManagement from './pages/StockManagement.jsx'
import Clients from './pages/Clients.jsx'
import ProductionOrders from './pages/ProductionOrders.jsx'
import ManufacturingQueue from './pages/ManufacturingQueue.jsx'
import TransactionHistory from './pages/TransactionHistory.jsx'
import IncomingOrders from './pages/IncomingOrders.jsx'
import ActivityLog from './pages/ActivityLog.jsx'
import UserManagement from './pages/UserManagement.jsx'
import Returns from './pages/Returns.jsx'
import BarcodeScanner from './pages/BarcodeScanner.jsx'
import PackingRecords from './pages/PackingRecords.jsx'
import Suppliers from './pages/Suppliers.jsx'
import MuseStock from './pages/MuseStock.jsx'
import MuseProducts from './pages/MuseProducts.jsx'
import MuseDashboard from './pages/MuseDashboard.jsx'
import StandardCatalog from './pages/StandardCatalog.jsx'
import ContainerTypes from './pages/ContainerTypes.jsx'
import MajorClients from './pages/MajorClients.jsx'
import MajorClientDetail from './pages/MajorClientDetail.jsx'
import BOMScentedMerchandise from './pages/BOMScentedMerchandise.jsx'
import StockScentedMerchandise from './pages/StockScentedMerchandise.jsx'
import BOMMuse from './pages/BOMMuse.jsx'
import ExternalProcessing from './pages/ExternalProcessing.jsx'

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

  function addToast(message, type = 'success', duration = 4000) {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
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
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column-reverse', gap: 8 }}>
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
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {t.type === 'error' ? <X size={15} /> : t.type === 'warning' ? <AlertTriangle size={15} /> : <Check size={15} />}
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
                <Route path="/products" component={StockManagement} />
                <Route path="/stock" component={StockManagement} />
                <Route path="/customers" component={Clients} />
                <Route path="/barcode" component={BarcodeScanner} />
                <Route path="/incoming-orders" component={IncomingOrders} />
                <Route path="/external-processing" component={ExternalProcessing} />
                <Route path="/returns" component={Returns} />
                <Route path="/transactions" component={TransactionHistory} />
                <Route path="/activity-log" component={ActivityLog} />
                <Route path="/users" component={UserManagement} />
                <Route path="/packing-records" component={PackingRecords} />
                <Route path="/suppliers" component={Suppliers} />
                <Route path="/muse-stock" component={MuseStock} />
                <Route path="/muse" component={MuseDashboard} />
                <Route path="/muse/products" component={MuseProducts} />
                <Route path="/container-types" component={ContainerTypes} />
                <Route path="/fragrances" component={StockManagement} />
                <Route path="/standard/catalog" component={StandardCatalog} />
                <Route path="/major-clients" component={MajorClients} />
                <Route path="/major-clients/:id" component={MajorClientDetail} />
                <Route path="/bom-sm" component={BOMScentedMerchandise} />
                <Route path="/sm-stock" component={StockScentedMerchandise} />
                <Route path="/bom-muse" component={BOMMuse} />
                <Route component={() => <PlaceholderPage title="Page Not Found" />} />
              </Switch>
            </Layout>
          </Router>
        )}
      </ToastContext.Provider>
    </AuthContext.Provider>
  )
}

function PlaceholderPage({ title, subtitle }) {
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 24, color: '#e8eaf2', marginBottom: 12 }}>{title}</h1>
      <p style={{ color: 'rgba(232,234,242,0.45)', fontSize: 14 }}>{subtitle || 'This page is under construction.'}</p>
    </div>
  )
}
