import { useState, useEffect } from 'react'
import { Plus, X, RotateCcw, Shield, User, Crown } from 'lucide-react'
import axios from 'axios'
import { useToast } from '../App.jsx'
import { useAuth } from '../App.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'

function api() { return { headers: { Authorization: `Bearer ${localStorage.getItem('sm_token')}` } } }

const ROLE_META = {
  root:  { label: 'Root',  color: '#f87171', bg: 'rgba(220,38,38,0.12)',  icon: Crown },
  admin: { label: 'Admin', color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', icon: Shield },
  user:  { label: 'User',  color: '#60a5fa', bg: 'rgba(37,99,235,0.12)',  icon: User },
}

const EMPTY_FORM = { name: '', email: '', role: 'user' }

export default function UserManagement() {
  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [resetTarget, setResetTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { addToast } = useToast()
  const { user: currentUser } = useAuth()

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await axios.get('/api/users', api())
      setUsers(res.data)
    } catch { addToast('Failed to load users', 'error') }
    finally { setLoading(false) }
  }

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  function openEdit(u)  { setEditing(u); setForm({ name: u.name, email: u.email, role: u.role }); setShowModal(true) }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) { addToast('Name and email required', 'error'); return }
    setSaving(true)
    try {
      if (editing) {
        await axios.put(`/api/users/${editing.id}`, form, api())
        addToast('User updated')
      } else {
        await axios.post('/api/users', form, api())
        addToast(`User created — default password: #scent2026`)
      }
      setShowModal(false)
      loadUsers()
    } catch (e) { addToast(e.response?.data?.error || 'Save failed', 'error') }
    finally { setSaving(false) }
  }

  async function handleReset() {
    try {
      await axios.post(`/api/users/${resetTarget.id}/reset-password`, {}, api())
      addToast(`Password reset to #scent2026 — user will be prompted to change`)
      setResetTarget(null)
    } catch (e) { addToast(e.response?.data?.error || 'Failed', 'error') }
  }

  async function handleDelete() {
    try {
      await axios.delete(`/api/users/${deleteTarget.id}`, api())
      addToast('User deleted')
      setDeleteTarget(null)
      loadUsers()
    } catch (e) { addToast(e.response?.data?.error || 'Failed', 'error') }
  }

  function fmt(d) { return d ? new Date(d).toLocaleDateString('en-AU') : '—' }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 22, color: '#e8eaf2' }}>User Management</h1>
          <p style={{ fontSize: 13, color: 'rgba(232,234,242,0.4)', marginTop: 4 }}>Root access only</p>
        </div>
        <button onClick={openCreate} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> New User
        </button>
      </div>

      {/* Role legend */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {Object.entries(ROLE_META).map(([key, m]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: m.bg, border: `1px solid ${m.color}30`, borderRadius: 8, fontSize: 12 }}>
            <m.icon size={12} color={m.color} />
            <span style={{ color: m.color, fontWeight: 700 }}>{m.label}</span>
            <span style={{ color: 'rgba(232,234,242,0.4)', fontSize: 11 }}>
              {key === 'root' ? '— Full access' : key === 'admin' ? '— No user mgmt' : '— Basic access'}
            </span>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'rgba(232,234,242,0.4)', fontSize: 14 }}>Loading...</div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['User', 'Email', 'Role', 'Status', 'Created', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(232,234,242,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const rm = ROLE_META[u.role] || ROLE_META.user
                const isMe = u.id === currentUser?.id
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: rm.bg, border: `1px solid ${rm.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <rm.icon size={14} color={rm.color} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eaf2' }}>
                            {u.name}
                            {isMe && <span style={{ fontSize: 10, color: '#60a5fa', marginLeft: 6, fontWeight: 700 }}>YOU</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'rgba(232,234,242,0.6)' }}>{u.email}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: rm.bg, color: rm.color, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{rm.label}</span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {u.must_change_password
                        ? <span style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>Must change password</span>
                        : <span style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>Active</span>
                      }
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'rgba(232,234,242,0.4)' }}>{fmt(u.created_at)}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(u)} style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: '#60a5fa', fontSize: 11, fontWeight: 700 }}>
                          Edit
                        </button>
                        <button onClick={() => setResetTarget(u)} style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#fbbf24' }} title="Reset password">
                          <RotateCcw size={12} />
                        </button>
                        {!isMe && (
                          <button onClick={() => setDeleteTarget(u)} style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#f87171' }}>
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: 'rgba(232,234,242,0.35)' }}>
            {users.length} user{users.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8000 }}>
          <div style={{ background: '#13132b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 32, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 17, color: '#e8eaf2' }}>{editing ? 'Edit User' : 'New User'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,234,242,0.5)' }}><X size={18} /></button>
            </div>

            {!editing && (
              <div style={{ marginBottom: 18, padding: '10px 14px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 8, fontSize: 12, color: '#60a5fa' }}>
                Default password: <strong>#scent2026</strong> — user will be prompted to change on first login
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <F label="Full Name *">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" style={inp} autoFocus />
              </F>
              <F label="Email *">
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@..." style={inp} />
              </F>
              <F label="Role">
                <div style={{ display: 'flex', gap: 8 }}>
                  {Object.entries(ROLE_META).map(([key, m]) => (
                    <button key={key} onClick={() => setForm(f => ({ ...f, role: key }))} style={{
                      flex: 1, background: form.role === key ? m.bg : 'rgba(255,255,255,0.04)',
                      border: form.role === key ? `1px solid ${m.color}60` : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8, padding: '8px 0', cursor: 'pointer',
                      color: form.role === key ? m.color : 'rgba(232,234,242,0.45)',
                      fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                    }}>
                      <m.icon size={12} /> {m.label}
                    </button>
                  ))}
                </div>
              </F>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <Btn onClick={() => setShowModal(false)}>Cancel</Btn>
              <Btn primary onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create User'}</Btn>
            </div>
          </div>
        </div>
      )}

      {resetTarget && (
        <ConfirmModal
          title="Reset Password"
          message={`Reset ${resetTarget.name}'s password to #scent2026? They will be prompted to change it on next login.`}
          onConfirm={handleReset}
          onCancel={() => setResetTarget(null)}
          danger={false}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete User"
          message={`Delete user "${deleteTarget.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

function F({ label, children }) {
  return (
    <div>
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
