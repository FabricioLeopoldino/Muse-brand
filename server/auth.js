const { query } = require('./db')

function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return res.status(403).json({ error: 'Forbidden' })
    next()
  }
}

function makeToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64')
  const payload = Buffer.from(JSON.stringify({
    id: user.id, name: user.name, email: user.email,
    role: user.role, must_change_password: user.must_change_password
  })).toString('base64')
  return `${header}.${payload}.sig`
}

async function auditLog(userId, action, entityType, entityId, entityName, details) {
  try {
    await query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, entity_name, details) VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId || null, action, entityType || null, entityId || null, entityName || null, details ? JSON.stringify(details) : null]
    )
  } catch (e) {
    console.error('[audit]', e.message)
  }
}

module.exports = { auth, requireRole, makeToken, auditLog }
