import { useState } from 'react'
import { useAuth } from '../App.jsx'
import axios from 'axios'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/login', { email, password })
      login(res.data.token, res.data.user)
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' }}>
      {/* Animated dot background */}
      <div className="login-bg" />

      <div className="login-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 24, color: '#e8eaf2', letterSpacing: 3, lineHeight: 1.1 }}>
            SCENTED
          </div>
          <div style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 24, color: '#2563eb', letterSpacing: 3, lineHeight: 1.1 }}>
            MERCHANDISE
          </div>
          <div style={{ fontSize: 11, color: 'rgba(232,234,242,0.3)', marginTop: 8, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>
            Production & Inventory
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(232,234,242,0.5)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Email
            </label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              required autoFocus
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, padding: '11px 14px',
                color: '#e8eaf2', fontSize: 14, outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(37,99,235,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)' }}
              onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(232,234,242,0.5)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Password
            </label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, padding: '11px 14px',
                color: '#e8eaf2', fontSize: 14, outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(37,99,235,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)' }}
              onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: 8, padding: '10px 14px', color: '#f87171',
              fontSize: 13, marginBottom: 18, textAlign: 'center', fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', background: loading ? 'rgba(37,99,235,0.6)' : '#2563eb',
              color: 'white', border: 'none', borderRadius: 10,
              padding: '12px 18px', fontWeight: 700, fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(37,99,235,0.35)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { if (!loading) { e.target.style.background = '#1d4ed8'; e.target.style.boxShadow = '0 6px 24px rgba(37,99,235,0.5)'; e.target.style.transform = 'translateY(-1px)' }}}
            onMouseLeave={e => { e.target.style.background = '#2563eb'; e.target.style.boxShadow = '0 4px 16px rgba(37,99,235,0.35)'; e.target.style.transform = 'none' }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
