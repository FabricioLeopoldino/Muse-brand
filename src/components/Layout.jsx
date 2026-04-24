import { useState } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../App.jsx'
import {
  LayoutDashboard, ShoppingBag, Factory, Package, Archive,
  BookOpen, Users, ScanBarcode, Truck, RotateCcw,
  History, ScrollText, UserCog, LogOut, ChevronLeft, ChevronRight,
  Beaker
} from 'lucide-react'

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['root','admin','user'] },
  { path: '/production-orders', label: 'Production Orders', icon: ShoppingBag, roles: ['root','admin','user'] },
  { path: '/manufacturing-queue', label: 'Manufacturing Queue', icon: Factory, roles: ['root','admin','user'] },
  { divider: true },
  { path: '/products', label: 'Products', icon: Package, roles: ['root','admin','user'] },
  { path: '/stock', label: 'Stock Management', icon: Archive, roles: ['root','admin','user'] },
  { path: '/bom', label: 'BOM Viewer', icon: BookOpen, roles: ['root','admin','user'] },
  { divider: true },
  { path: '/clients', label: 'Clients', icon: Users, roles: ['root','admin','user'] },
  { path: '/barcode', label: 'Barcode Scanner', icon: ScanBarcode, roles: ['root','admin','user'] },
  { path: '/incoming-orders', label: 'Incoming Orders', icon: Truck, roles: ['root','admin','user'] },
  { path: '/returns', label: 'Returns', icon: RotateCcw, roles: ['root','admin','user'] },
  { divider: true },
  { path: '/transactions', label: 'Transaction History', icon: History, roles: ['root','admin','user'] },
  { path: '/activity-log', label: 'Activity Log', icon: ScrollText, roles: ['root','admin'] },
  { path: '/users', label: 'User Management', icon: UserCog, roles: ['root'] },
]

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [location, navigate] = useLocation()
  const { user, logout } = useAuth()

  const sidebarWidth = collapsed ? 64 : 220

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0e0e1a' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarWidth, minHeight: '100vh',
        background: 'rgba(10,10,22,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s ease',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
        overflowX: 'hidden'
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? '20px 0' : '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: 64
        }}>
          {!collapsed && (
            <div>
              <div style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 13, color: '#e8eaf2', letterSpacing: 1 }}>
                SCENTED
              </div>
              <div style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 13, color: '#2563eb', letterSpacing: 1 }}>
                MERCHANDISE
              </div>
            </div>
          )}
          {collapsed && <Beaker size={20} color="#2563eb" />}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: '#e8eaf2',
              display: 'flex', alignItems: 'center'
            }}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {NAV_ITEMS.map((item, idx) => {
            if (item.divider) return (
              <div key={idx} style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />
            )
            if (!item.roles.includes(user?.role)) return null

            const isActive = location === item.path || (item.path !== '/' && location.startsWith(item.path))
            const Icon = item.icon

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
                className={isActive ? 'nav-active-glow' : undefined}
                style={{
                  width: '100%',
                  background: isActive ? 'rgba(37,99,235,0.16)' : 'transparent',
                  border: 'none',
                  borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent',
                  color: isActive ? '#e8eaf2' : 'rgba(232,234,242,0.5)',
                  padding: collapsed ? '10px 0' : '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer', fontSize: 13, fontWeight: isActive ? 700 : 400,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? 'inset 3px 0 12px rgba(37,99,235,0.08)' : 'none',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <Icon size={16} style={{ flexShrink: 0, color: isActive ? '#60a5fa' : undefined }} />
                {!collapsed && item.label}
              </button>
            )
          })}
        </nav>

        {/* User / Logout */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: collapsed ? '12px 0' : '12px 16px'
        }}>
          {!collapsed && (
            <div style={{ fontSize: 12, color: 'rgba(232,234,242,0.45)', marginBottom: 8 }}>
              <div style={{ color: '#e8eaf2', fontWeight: 600 }}>{user?.name}</div>
              <div style={{ textTransform: 'uppercase', fontSize: 10, color: '#2563eb', fontWeight: 700, letterSpacing: 1 }}>{user?.role}</div>
            </div>
          )}
          <button
            onClick={logout}
            title={collapsed ? 'Logout' : undefined}
            style={{
              width: '100%', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)',
              borderRadius: 6, color: '#f87171', padding: collapsed ? '8px 0' : '8px 12px',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8, justifyContent: collapsed ? 'center' : 'flex-start'
            }}
          >
            <LogOut size={14} />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, marginLeft: sidebarWidth, transition: 'margin-left 0.2s ease', minHeight: '100vh' }}>
        {children}
      </div>
    </div>
  )
}
