import { useState } from 'react'
import { useAuth } from '../App.jsx'
import axios from 'axios'

export default function ChangePassword() {
  const { user, login, logout } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (newPassword !== confirm) { setError('Passwords do not match'); return }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const token = localStorage.getItem('sm_token')
      await axios.post('/api/auth/change-password', { new_password: newPassword }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const updatedUser = { ...user, must_change_password: false }
      localStorage.setItem('sm_user', JSON.stringify(updatedUser))
      login(token, updatedUser)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0e0e1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 40, width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 18, color: '#e8eaf2' }}>Set New Password</div>
          <div style={{ fontSize: 12, color: 'rgba(232,234,242,0.45)', marginTop: 6 }}>You must change your password before continuing.</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(232,234,242,0.6)', marginBottom: 6 }}>NEW PASSWORD</label>
            <input
              type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required autoFocus
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '10px 12px', color: '#e8eaf2', fontSize: 14, outline: 'none' }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(232,234,242,0.6)', marginBottom: 6 }}>CONFIRM PASSWORD</label>
            <input
              type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '10px 12px', color: '#e8eaf2', fontSize: 14, outline: 'none' }}
            />
          </div>

          {error && (
            <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '10px 12px', color: '#f87171', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ width: '100%', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '11px 18px', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Saving...' : 'Set Password'}
          </button>
          <button type="button" onClick={logout}
            style={{ width: '100%', background: 'transparent', border: 'none', color: 'rgba(232,234,242,0.35)', fontSize: 12, cursor: 'pointer', marginTop: 12, padding: '6px 0' }}>
            Cancel & Logout
          </button>
        </form>
      </div>
    </div>
  )
}
