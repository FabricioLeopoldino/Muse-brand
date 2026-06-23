import { useState } from 'react'
import { useAuth } from '../App.jsx'
import axios from 'axios'

// Editorial palette — hardcoded so the login renders as a fixed parchment
// "cover" regardless of the app theme (which defaults to dark). See the
// .login-ed token scope + editorial atoms in index.css.
const WINE = '#612428', WINE_DEEP = '#4d1c20', INK = '#1b0905', INK_SOFT = '#5a3a36'
const PAPER_CARD = '#fbf9f1', WINE_LINE = 'rgba(97,36,40,0.16)'

export default function Login() {
  const { login } = useAuth()
  const [name, setName]         = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/login', { name, password })
      login(res.data.token, res.data.user)
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '13px 16px', borderRadius: 10,
    border: `1px solid ${WINE_LINE}`, background: '#ffffff', color: INK,
    fontFamily: 'Inter, sans-serif', fontSize: 14, outline: 'none',
    boxShadow: 'inset 0 1px 2px rgba(27,9,5,0.04)', transition: 'border-color .2s, box-shadow .2s',
  }
  const labelStyle = {
    display: 'block', fontSize: 10.5, fontWeight: 600, color: INK_SOFT,
    marginBottom: 9, textTransform: 'uppercase', letterSpacing: '0.2em',
  }

  return (
    <div className="login-ed">
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, textAlign: 'center' }}>

        {/* Editorial flourish */}
        <div className="ornament" style={{ marginBottom: 30 }}><span>Est. MMXXVI</span></div>

        {/* MU:SE editorial mark (hero) + Scented Merchandise as the system name below.
            Both brands kept together — one unified system, no split. */}
        <img src="/logos/muse-logo-wine.svg" alt="MU:SE"
          style={{ height: 'clamp(54px, 11vw, 78px)', width: 'auto', display: 'block', margin: '0 auto 22px' }} />
        <div className="gold-rule" style={{ width: 210, margin: '0 auto 16px' }} />
        <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: WINE, letterSpacing: '0.02em' }}>
          Scented Merchandise
        </div>
        <p className="eyebrow" style={{ letterSpacing: '0.34em', marginTop: 9, marginBottom: 36 }}>
          Production &amp; Inventory
        </p>

        {/* Card */}
        <div className="card" style={{ background: PAPER_CARD, padding: '38px 40px 32px', textAlign: 'left', borderRadius: 18 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Name</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                required autoFocus style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'rgba(97,36,40,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(97,36,40,0.1), 0 0 16px rgba(200,168,94,0.14)' }}
                onBlur={e  => { e.target.style.borderColor = WINE_LINE; e.target.style.boxShadow = 'inset 0 1px 2px rgba(27,9,5,0.04)' }}
              />
            </div>

            <div style={{ marginBottom: 26 }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'rgba(97,36,40,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(97,36,40,0.1), 0 0 16px rgba(200,168,94,0.14)' }}
                onBlur={e  => { e.target.style.borderColor = WINE_LINE; e.target.style.boxShadow = 'inset 0 1px 2px rgba(27,9,5,0.04)' }}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(160,27,27,0.08)', border: '1px solid rgba(160,27,27,0.28)',
                borderRadius: 8, padding: '10px 14px', color: '#a01b1b',
                fontSize: 13, marginBottom: 18, textAlign: 'center', fontWeight: 600,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '14px 18px', borderRadius: 10, border: '1px solid rgba(97,36,40,0.4)',
                fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, letterSpacing: '0.02em',
                color: '#f4ead6', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? WINE : `linear-gradient(135deg, ${WINE_DEEP}, ${WINE})`,
                boxShadow: loading ? 'none' : '0 2px 10px rgba(97,36,40,0.22), inset 0 1px 0 rgba(200,168,94,0.25)',
                transition: 'all .2s ease', opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(97,36,40,0.3), inset 0 1px 0 rgba(200,168,94,0.4)' } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(97,36,40,0.22), inset 0 1px 0 rgba(200,168,94,0.25)' }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="serif" style={{ marginTop: 32, fontStyle: 'italic', color: '#8a7a72', fontSize: 14 }}>
          An editorial house of scent.
        </p>
      </div>
    </div>
  )
}
