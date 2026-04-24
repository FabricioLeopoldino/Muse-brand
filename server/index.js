process.env.TZ = 'Australia/Sydney'

require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const bcrypt  = require('bcryptjs')
const crypto  = require('crypto')
const { Pool } = require('pg')
const path    = require('path')

const app = express()
const PORT = process.env.PORT || 3001

// ─────────────────────────────────────────
// DB
// ─────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon') ? { rejectUnauthorized: false } : false
})

async function query(text, params) {
  const client = await pool.connect()
  try {
    return await client.query(text, params)
  } finally {
    client.release()
  }
}

// ─────────────────────────────────────────
// MIGRATIONS
// ─────────────────────────────────────────
async function runStartupMigrations() {
  console.log('[DB] Running startup migrations...')

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      must_change_password BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      lead_time INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      product_code VARCHAR(50) UNIQUE NOT NULL,
      category VARCHAR(30) NOT NULL,
      sub_category VARCHAR(50),
      unit VARCHAR(20) NOT NULL DEFAULT 'units',
      current_stock DECIMAL DEFAULT 0,
      min_stock_level DECIMAL DEFAULT 0,
      supplier VARCHAR(150),
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      supplier_code VARCHAR(50),
      bin_location VARCHAR(50),
      barcode VARCHAR(100),
      shopify_variant_id BIGINT,
      lead_time INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      shopify_customer_id BIGINT,
      name VARCHAR(200) NOT NULL,
      email VARCHAR(150),
      phone VARCHAR(50),
      address TEXT,
      is_large_client BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS client_labels (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      label_name VARCHAR(200) NOT NULL,
      artwork_version VARCHAR(50) NOT NULL DEFAULT 'v1',
      supplier VARCHAR(150),
      quantity DECIMAL DEFAULT 0,
      is_obsolete BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS client_label_transactions (
      id SERIAL PRIMARY KEY,
      client_label_id INTEGER NOT NULL REFERENCES client_labels(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      type VARCHAR(30) NOT NULL,
      quantity DECIMAL NOT NULL,
      production_order_id INTEGER,
      notes TEXT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS client_stock (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      product_code VARCHAR(50) NOT NULL,
      product_name VARCHAR(200) NOT NULL,
      category VARCHAR(30) NOT NULL DEFAULT 'COMPONENTS',
      barcode VARCHAR(100),
      unit VARCHAR(20) NOT NULL DEFAULT 'units',
      quantity DECIMAL DEFAULT 0,
      received_date DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS client_stock_transactions (
      id SERIAL PRIMARY KEY,
      client_stock_id INTEGER NOT NULL REFERENCES client_stock(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      type VARCHAR(30) NOT NULL,
      quantity DECIMAL NOT NULL,
      unit VARCHAR(20),
      production_order_id INTEGER,
      notes TEXT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS production_orders (
      id SERIAL PRIMARY KEY,
      order_number VARCHAR(20) UNIQUE NOT NULL,
      shopify_draft_order_id BIGINT,
      shopify_order_id BIGINT,
      shopify_order_number VARCHAR(50),
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      order_type VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
      due_date DATE,
      status VARCHAR(30) NOT NULL DEFAULT 'draft',
      notes TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS production_order_lines (
      id SERIAL PRIMARY KEY,
      production_order_id INTEGER NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
      line_number INTEGER NOT NULL,
      product_type VARCHAR(50) NOT NULL,
      fragrance_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      oil_pct DECIMAL DEFAULT 25.0,
      packaging_component_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      label_client_label_id INTEGER REFERENCES client_labels(id) ON DELETE SET NULL,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL DEFAULT 0,
      is_candle BOOLEAN DEFAULT false,
      candle_status VARCHAR(30),
      sent_for_filling_at TIMESTAMP,
      filling_supplier TEXT,
      received_from_filling_at TIMESTAMP,
      fulfill_from_stock BOOLEAN DEFAULT false,
      labels_required BOOLEAN DEFAULT false,
      labels_ordered_at TIMESTAMP,
      labels_supplier TEXT,
      labels_eta DATE,
      labels_received BOOLEAN DEFAULT false,
      labels_received_at TIMESTAMP,
      line_status VARCHAR(30) DEFAULT 'pending',
      line_started_at TIMESTAMP,
      line_completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS production_order_components (
      id SERIAL PRIMARY KEY,
      production_order_line_id INTEGER NOT NULL REFERENCES production_order_lines(id) ON DELETE CASCADE,
      production_order_id INTEGER NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_code VARCHAR(50),
      product_name VARCHAR(200),
      source VARCHAR(30) NOT NULL DEFAULT 'general_stock',
      quantity_required DECIMAL NOT NULL,
      quantity_debited DECIMAL DEFAULT 0,
      unit VARCHAR(20),
      was_overridden BOOLEAN DEFAULT false,
      override_reason TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS stock_reservations (
      id SERIAL PRIMARY KEY,
      production_order_id INTEGER NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
      production_order_line_id INTEGER REFERENCES production_order_lines(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_code VARCHAR(50),
      source VARCHAR(30) NOT NULL DEFAULT 'general_stock',
      quantity_reserved DECIMAL NOT NULL,
      quantity_consumed DECIMAL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'reserved',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS production_jobs (
      id SERIAL PRIMARY KEY,
      production_order_id INTEGER NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
      started_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP,
      started_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'in_production',
      external_type VARCHAR(30),
      external_supplier TEXT,
      external_sent_at TIMESTAMP,
      external_expected_at DATE,
      external_received_at TIMESTAMP,
      assembly_complete BOOLEAN DEFAULT false,
      labeling_complete BOOLEAN DEFAULT false,
      leftover_formula_ml DECIMAL,
      leftover_formula_oil_pct DECIMAL,
      leftover_labels_qty INTEGER,
      notes_on_completion TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS fragrance_strength_log (
      id SERIAL PRIMARY KEY,
      fragrance_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      fragrance_name VARCHAR(200),
      production_order_id INTEGER REFERENCES production_orders(id) ON DELETE SET NULL,
      standard_pct DECIMAL NOT NULL DEFAULT 25.0,
      actual_pct_used DECIMAL NOT NULL,
      was_adjusted BOOLEAN DEFAULT false,
      adjustment_reason TEXT,
      batch_reference TEXT,
      date_used DATE,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_code VARCHAR(50),
      product_name VARCHAR(200),
      category VARCHAR(30),
      type VARCHAR(30) NOT NULL,
      quantity DECIMAL NOT NULL,
      unit VARCHAR(20),
      balance_after DECIMAL,
      notes TEXT,
      production_order_id INTEGER REFERENCES production_orders(id) ON DELETE SET NULL,
      production_order_line_id INTEGER REFERENCES production_order_lines(id) ON DELETE SET NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      order_number VARCHAR(50),
      quantity DECIMAL NOT NULL,
      quantity_received DECIMAL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      notes TEXT,
      supplier VARCHAR(150),
      estimated_delivery_date DATE,
      added_by VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS bom_rules (
      id SERIAL PRIMARY KEY,
      product_type VARCHAR(50) NOT NULL,
      component_type VARCHAR(30) NOT NULL,
      quantity_per_unit DECIMAL NOT NULL,
      unit VARCHAR(20),
      notes TEXT,
      UNIQUE(product_type, component_type)
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS webhook_processed (
      id SERIAL PRIMARY KEY,
      shopify_order_id BIGINT NOT NULL,
      webhook_type VARCHAR(50) NOT NULL,
      processed_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(shopify_order_id, webhook_type)
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(50) NOT NULL,
      entity_type VARCHAR(50),
      entity_id INTEGER,
      entity_name VARCHAR(200),
      details JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  // Performance indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_prod_orders_status ON production_orders(status)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_prod_orders_client ON production_orders(client_id)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_stock_reservations_order ON stock_reservations(production_order_id)`)

  // Seed default BOM rules if empty
  const bomCheck = await query(`SELECT COUNT(*) FROM bom_rules`)
  if (parseInt(bomCheck.rows[0].count) === 0) {
    await seedBomRules()
  }

  // Seed default root user if no users exist
  const userCheck = await query(`SELECT COUNT(*) FROM users`)
  if (parseInt(userCheck.rows[0].count) === 0) {
    const hash = await bcrypt.hash('#scent2026', 10)
    await query(
      `INSERT INTO users (name, email, password_hash, role, must_change_password) VALUES ($1,$2,$3,$4,$5)`,
      ['Root Admin', 'admin@scentedmerchandise.com', hash, 'root', false]
    )
    console.log('[DB] Default root user created: admin@scentedmerchandise.com / #scent2026')
  }

  console.log('[DB] Migrations complete.')
}

async function seedBomRules() {
  const rules = [
    // Travel Spray 10ml
    { product_type: 'TRAVEL_SPRAY_10ML', component_type: 'FRAGRANCE', quantity_per_unit: 2.5, unit: 'ml' },   // 25% of 10ml
    { product_type: 'TRAVEL_SPRAY_10ML', component_type: 'ETHANOL', quantity_per_unit: 7.5, unit: 'ml' },     // 75% of 10ml
    { product_type: 'TRAVEL_SPRAY_10ML', component_type: 'BOTTLE', quantity_per_unit: 1, unit: 'units' },
    { product_type: 'TRAVEL_SPRAY_10ML', component_type: 'LID_SPRAY', quantity_per_unit: 1, unit: 'units' },
    // Room Spray 50ml
    { product_type: 'ROOM_SPRAY_50ML', component_type: 'FRAGRANCE', quantity_per_unit: 12.5, unit: 'ml' },
    { product_type: 'ROOM_SPRAY_50ML', component_type: 'ETHANOL', quantity_per_unit: 37.5, unit: 'ml' },
    { product_type: 'ROOM_SPRAY_50ML', component_type: 'BOTTLE', quantity_per_unit: 1, unit: 'units' },
    { product_type: 'ROOM_SPRAY_50ML', component_type: 'LID_SPRAY', quantity_per_unit: 1, unit: 'units' },
    { product_type: 'ROOM_SPRAY_50ML', component_type: 'LID_SECOND', quantity_per_unit: 1, unit: 'units' },
    { product_type: 'ROOM_SPRAY_50ML', component_type: 'LID_TOP', quantity_per_unit: 1, unit: 'units' },
    // Room Spray 100ml
    { product_type: 'ROOM_SPRAY_100ML', component_type: 'FRAGRANCE', quantity_per_unit: 25, unit: 'ml' },
    { product_type: 'ROOM_SPRAY_100ML', component_type: 'ETHANOL', quantity_per_unit: 75, unit: 'ml' },
    { product_type: 'ROOM_SPRAY_100ML', component_type: 'BOTTLE', quantity_per_unit: 1, unit: 'units' },
    { product_type: 'ROOM_SPRAY_100ML', component_type: 'LID_SPRAY', quantity_per_unit: 1, unit: 'units' },
    { product_type: 'ROOM_SPRAY_100ML', component_type: 'LID_MAGNETIC', quantity_per_unit: 1, unit: 'units' },
    // Reed Diffuser 200ml
    { product_type: 'REED_DIFFUSER_200ML', component_type: 'FRAGRANCE', quantity_per_unit: 50, unit: 'ml' },
    { product_type: 'REED_DIFFUSER_200ML', component_type: 'ETHANOL', quantity_per_unit: 150, unit: 'ml' },
    { product_type: 'REED_DIFFUSER_200ML', component_type: 'BOTTLE', quantity_per_unit: 1, unit: 'units' },
    { product_type: 'REED_DIFFUSER_200ML', component_type: 'LID_PLASTIC', quantity_per_unit: 1, unit: 'units' },
    { product_type: 'REED_DIFFUSER_200ML', component_type: 'LID_METAL', quantity_per_unit: 1, unit: 'units' },
    { product_type: 'REED_DIFFUSER_200ML', component_type: 'INSERT', quantity_per_unit: 1, unit: 'units' },
    { product_type: 'REED_DIFFUSER_200ML', component_type: 'STICKS', quantity_per_unit: 1, unit: 'units' },
    // Micro Oil 15ml
    { product_type: 'MICRO_OIL_15ML', component_type: 'FRAGRANCE', quantity_per_unit: 15, unit: 'ml' },
    { product_type: 'MICRO_OIL_15ML', component_type: 'BOTTLE', quantity_per_unit: 1, unit: 'units' },
    { product_type: 'MICRO_OIL_15ML', component_type: 'LID_15ML', quantity_per_unit: 1, unit: 'units' },
    // Candle 240G (12% of 240g = 28.8ml)
    { product_type: 'CANDLE_240G', component_type: 'FRAGRANCE', quantity_per_unit: 28.8, unit: 'ml' },
    { product_type: 'CANDLE_240G', component_type: 'CANDLE_JAR', quantity_per_unit: 1, unit: 'units' },
    // Candle 400G (12% of 400g = 48ml)
    { product_type: 'CANDLE_400G', component_type: 'FRAGRANCE', quantity_per_unit: 48, unit: 'ml' },
    { product_type: 'CANDLE_400G', component_type: 'CANDLE_JAR', quantity_per_unit: 1, unit: 'units' },
  ]

  for (const r of rules) {
    await query(
      `INSERT INTO bom_rules (product_type, component_type, quantity_per_unit, unit) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [r.product_type, r.component_type, r.quantity_per_unit, r.unit]
    )
  }
  console.log('[DB] BOM rules seeded.')
}

// ─────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────
app.use(cors())
app.use(express.json())

function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
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
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}

function makeToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64')
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    must_change_password: user.must_change_password
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

// ─────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

    const result = await query(`SELECT * FROM users WHERE email = $1`, [email.toLowerCase()])
    const user = result.rows[0]
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) return res.status(401).json({ error: 'Invalid credentials' })

    const token = makeToken(user)
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, must_change_password: user.must_change_password }
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/auth/change-password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body
    if (!new_password || new_password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

    const result = await query(`SELECT * FROM users WHERE id = $1`, [req.user.id])
    const user = result.rows[0]
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (current_password) {
      const match = await bcrypt.compare(current_password, user.password_hash)
      if (!match) return res.status(401).json({ error: 'Current password incorrect' })
    }

    const hash = await bcrypt.hash(new_password, 10)
    await query(`UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2`, [hash, req.user.id])

    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// ─────────────────────────────────────────
// USER MANAGEMENT (root only)
// ─────────────────────────────────────────
app.get('/api/users', auth, requireRole('root', 'admin'), async (req, res) => {
  try {
    const result = await query(`SELECT id, name, email, role, must_change_password, created_at FROM users ORDER BY name`)
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/users', auth, requireRole('root'), async (req, res) => {
  try {
    const { name, email, role } = req.body
    if (!name || !email || !role) return res.status(400).json({ error: 'Name, email and role required' })

    const hash = await bcrypt.hash('#scent2026', 10)
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, must_change_password) VALUES ($1,$2,$3,$4,true) RETURNING id, name, email, role, must_change_password`,
      [name, email.toLowerCase(), hash, role]
    )
    await auditLog(req.user.id, 'user_created', 'user', result.rows[0].id, name, { email, role })
    res.status(201).json(result.rows[0])
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email already exists' })
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/users/:id', auth, requireRole('root'), async (req, res) => {
  try {
    const { name, email, role } = req.body
    await query(
      `UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), role = COALESCE($3, role) WHERE id = $4`,
      [name, email?.toLowerCase(), role, req.params.id]
    )
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/users/:id/reset-password', auth, requireRole('root'), async (req, res) => {
  try {
    const hash = await bcrypt.hash('#scent2026', 10)
    await query(`UPDATE users SET password_hash = $1, must_change_password = true WHERE id = $2`, [hash, req.params.id])
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/users/:id', auth, requireRole('root'), async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' })
    await query(`DELETE FROM users WHERE id = $1`, [req.params.id])
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────
// SUPPLIERS
// ─────────────────────────────────────────
app.get('/api/suppliers', auth, async (req, res) => {
  try {
    const result = await query(`SELECT * FROM suppliers ORDER BY name`)
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/suppliers', auth, async (req, res) => {
  try {
    const { name, lead_time, notes } = req.body
    if (!name) return res.status(400).json({ error: 'Name required' })
    const result = await query(
      `INSERT INTO suppliers (name, lead_time, notes) VALUES ($1,$2,$3) RETURNING *`,
      [name, lead_time || null, notes || null]
    )
    res.status(201).json(result.rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/suppliers/:id', auth, async (req, res) => {
  try {
    const { name, lead_time, notes } = req.body
    const result = await query(
      `UPDATE suppliers SET name = COALESCE($1, name), lead_time = $2, notes = $3 WHERE id = $4 RETURNING *`,
      [name, lead_time ?? null, notes ?? null, req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' })
    res.json(result.rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/suppliers/:id', auth, async (req, res) => {
  try {
    await query(`DELETE FROM suppliers WHERE id = $1`, [req.params.id])
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────
app.get('/api/products', auth, async (req, res) => {
  try {
    const { category, search } = req.query
    let q = `SELECT p.*, s.name as supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE 1=1`
    const params = []
    if (category && category !== 'ALL') {
      params.push(category)
      q += ` AND p.category = $${params.length}`
    }
    if (search) {
      params.push(`%${search}%`)
      q += ` AND (p.name ILIKE $${params.length} OR p.product_code ILIKE $${params.length} OR p.barcode ILIKE $${params.length})`
    }
    q += ` ORDER BY p.category, p.name`
    const result = await query(q, params)
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/products/:id', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, s.name as supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = $1`,
      [req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' })
    res.json(result.rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/products', auth, async (req, res) => {
  try {
    const {
      name, product_code, category, sub_category, unit, current_stock,
      min_stock_level, supplier, supplier_id, supplier_code,
      bin_location, barcode, shopify_variant_id, lead_time, notes
    } = req.body
    if (!name || !product_code || !category) return res.status(400).json({ error: 'Name, product_code and category required' })

    const result = await query(
      `INSERT INTO products (name, product_code, category, sub_category, unit, current_stock, min_stock_level, supplier, supplier_id, supplier_code, bin_location, barcode, shopify_variant_id, lead_time, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [name, product_code.toUpperCase(), category, sub_category || null, unit || 'units',
       current_stock || 0, min_stock_level || 0, supplier || null, supplier_id || null,
       supplier_code || null, bin_location || null, barcode || null, shopify_variant_id || null,
       lead_time || null, notes || null]
    )
    await auditLog(req.user.id, 'product_created', 'product', result.rows[0].id, name, { product_code, category })
    res.status(201).json(result.rows[0])
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Product code already exists' })
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/products/:id', auth, async (req, res) => {
  try {
    const {
      name, product_code, category, sub_category, unit, min_stock_level,
      supplier, supplier_id, supplier_code, bin_location, barcode,
      shopify_variant_id, lead_time, notes
    } = req.body
    const result = await query(
      `UPDATE products SET
        name = COALESCE($1, name),
        product_code = COALESCE($2, product_code),
        category = COALESCE($3, category),
        sub_category = $4,
        unit = COALESCE($5, unit),
        min_stock_level = COALESCE($6, min_stock_level),
        supplier = $7,
        supplier_id = $8,
        supplier_code = $9,
        bin_location = $10,
        barcode = $11,
        shopify_variant_id = $12,
        lead_time = $13,
        notes = $14
       WHERE id = $15 RETURNING *`,
      [name, product_code?.toUpperCase(), category, sub_category ?? null, unit,
       min_stock_level, supplier ?? null, supplier_id ?? null, supplier_code ?? null,
       bin_location ?? null, barcode ?? null, shopify_variant_id ?? null,
       lead_time ?? null, notes ?? null, req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' })
    res.json(result.rows[0])
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Product code already exists' })
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/products/:id', auth, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.id
    const prod = await query(`SELECT * FROM products WHERE id = $1`, [req.params.id])
    if (!prod.rows[0]) return res.status(404).json({ error: 'Not found' })
    await query(`DELETE FROM products WHERE id = $1`, [req.params.id])
    await auditLog(userId, 'product_deleted', 'product', parseInt(req.params.id), prod.rows[0].name, {})
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────
// STOCK OPERATIONS
// ─────────────────────────────────────────
async function adjustProductStock(productId, delta, type, notes, userId, orderId, lineId) {
  const result = await query(`UPDATE products SET current_stock = current_stock + $1 WHERE id = $2 RETURNING *`, [delta, productId])
  const p = result.rows[0]
  if (!p) throw new Error('Product not found')
  await query(
    `INSERT INTO transactions (product_id, product_code, product_name, category, type, quantity, unit, balance_after, notes, production_order_id, production_order_line_id, user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [p.id, p.product_code, p.name, p.category, type, Math.abs(delta), p.unit, p.current_stock, notes || null, orderId || null, lineId || null, userId || null]
  )
  return p
}

app.post('/api/stock/add', auth, async (req, res) => {
  try {
    const { product_id, quantity, notes } = req.body
    if (!product_id || !quantity || quantity <= 0) return res.status(400).json({ error: 'product_id and positive quantity required' })
    const p = await adjustProductStock(product_id, quantity, 'add', notes, req.user.id)
    res.json(p)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/stock/remove', auth, async (req, res) => {
  try {
    const { product_id, quantity, notes } = req.body
    if (!product_id || !quantity || quantity <= 0) return res.status(400).json({ error: 'product_id and positive quantity required' })
    const p = await adjustProductStock(product_id, -quantity, 'remove', notes, req.user.id)
    res.json(p)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/stock/adjust', auth, async (req, res) => {
  try {
    const { product_id, new_stock, notes } = req.body
    if (product_id === undefined || new_stock === undefined) return res.status(400).json({ error: 'product_id and new_stock required' })
    const current = await query(`SELECT * FROM products WHERE id = $1`, [product_id])
    if (!current.rows[0]) return res.status(404).json({ error: 'Product not found' })
    const delta = new_stock - current.rows[0].current_stock
    const p = await adjustProductStock(product_id, delta, 'adjust', notes, req.user.id)
    res.json(p)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────
// PURCHASE ORDERS
// ─────────────────────────────────────────
app.get('/api/purchase-orders', auth, async (req, res) => {
  try {
    const { product_id } = req.query
    let q = `SELECT po.*, p.name as product_name, p.product_code, p.unit FROM purchase_orders po JOIN products p ON po.product_id = p.id WHERE 1=1`
    const params = []
    if (product_id) {
      params.push(product_id)
      q += ` AND po.product_id = $${params.length}`
    }
    q += ` ORDER BY po.created_at DESC`
    const result = await query(q, params)
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/products/:id/incoming', auth, async (req, res) => {
  try {
    const { order_number, quantity, supplier, estimated_delivery_date, notes } = req.body
    if (!quantity || quantity <= 0) return res.status(400).json({ error: 'Valid quantity required' })
    const prod = await query(`SELECT * FROM products WHERE id = $1`, [req.params.id])
    if (!prod.rows[0]) return res.status(404).json({ error: 'Product not found' })
    const result = await query(
      `INSERT INTO purchase_orders (product_id, order_number, quantity, supplier, estimated_delivery_date, notes, added_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.id, order_number || null, quantity, supplier || prod.rows[0].supplier || null,
       estimated_delivery_date || null, notes || null, req.user.name]
    )
    await auditLog(req.user.id, 'po_created', 'product', parseInt(req.params.id), prod.rows[0].name, { quantity, supplier })
    res.status(201).json(result.rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/purchase-orders/:poId/receive', auth, async (req, res) => {
  try {
    const { quantity_received } = req.body
    const po = await query(`SELECT po.*, p.name as product_name FROM purchase_orders po JOIN products p ON po.product_id = p.id WHERE po.id = $1`, [req.params.poId])
    if (!po.rows[0]) return res.status(404).json({ error: 'PO not found' })
    const record = po.rows[0]
    const newReceived = parseFloat(record.quantity_received) + parseFloat(quantity_received)
    const newStatus = newReceived >= parseFloat(record.quantity) ? 'received' : 'partial'
    await query(`UPDATE purchase_orders SET quantity_received = $1, status = $2 WHERE id = $3`, [newReceived, newStatus, req.params.poId])
    await adjustProductStock(record.product_id, quantity_received, 'po_received', `PO received: ${record.order_number || 'N/A'}`, req.user.id)
    await auditLog(req.user.id, 'po_received', 'product', record.product_id, record.product_name, { quantity_received, po_id: record.id })
    res.json({ success: true, new_status: newStatus })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/purchase-orders/:poId', auth, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.id
    const po = await query(`SELECT po.*, p.name as product_name FROM purchase_orders po JOIN products p ON po.product_id = p.id WHERE po.id = $1`, [req.params.poId])
    if (!po.rows[0]) return res.status(404).json({ error: 'PO not found' })
    await query(`DELETE FROM purchase_orders WHERE id = $1`, [req.params.poId])
    await auditLog(userId, 'po_cancelled', 'product', po.rows[0].product_id, po.rows[0].product_name, { po_id: req.params.poId })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────
// TRANSACTIONS
// ─────────────────────────────────────────
app.get('/api/transactions', auth, async (req, res) => {
  try {
    const { product_id, type, from, to, limit } = req.query
    let q = `SELECT t.*, u.name as user_name FROM transactions t LEFT JOIN users u ON t.user_id = u.id WHERE 1=1`
    const params = []
    if (product_id) {
      params.push(product_id)
      q += ` AND t.product_id = $${params.length}`
    }
    if (type) {
      params.push(type)
      q += ` AND t.type = $${params.length}`
    }
    if (from) {
      params.push(from)
      q += ` AND t.created_at >= $${params.length}`
    }
    if (to) {
      params.push(to)
      q += ` AND t.created_at <= $${params.length}`
    }
    q += ` ORDER BY t.created_at DESC LIMIT ${parseInt(limit) || 5000}`
    const result = await query(q, params)
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/products/:id/transactions', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT t.*, u.name as user_name FROM transactions t LEFT JOIN users u ON t.user_id = u.id WHERE t.product_id = $1 ORDER BY t.created_at DESC LIMIT 500`,
      [req.params.id]
    )
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────
// BOM RULES
// ─────────────────────────────────────────
app.get('/api/bom-rules', auth, async (req, res) => {
  try {
    const result = await query(`SELECT * FROM bom_rules ORDER BY product_type, component_type`)
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────
// CLIENTS
// ─────────────────────────────────────────
app.get('/api/clients', auth, async (req, res) => {
  try {
    const { search, is_large_client } = req.query
    let q = `SELECT * FROM clients WHERE 1=1`
    const params = []
    if (search) {
      params.push(`%${search}%`)
      q += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length})`
    }
    if (is_large_client !== undefined) {
      params.push(is_large_client === 'true')
      q += ` AND is_large_client = $${params.length}`
    }
    q += ` ORDER BY name`
    const result = await query(q, params)
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/clients/:id', auth, async (req, res) => {
  try {
    const result = await query(`SELECT * FROM clients WHERE id = $1`, [req.params.id])
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' })
    res.json(result.rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/clients', auth, async (req, res) => {
  try {
    const { shopify_customer_id, name, email, phone, address, is_large_client, notes } = req.body
    if (!name) return res.status(400).json({ error: 'Name required' })
    const result = await query(
      `INSERT INTO clients (shopify_customer_id, name, email, phone, address, is_large_client, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [shopify_customer_id || null, name, email || null, phone || null, address || null, is_large_client || false, notes || null]
    )
    await auditLog(req.user.id, 'client_created', 'client', result.rows[0].id, name, {})
    res.status(201).json(result.rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/clients/:id', auth, async (req, res) => {
  try {
    const { name, email, phone, address, is_large_client, notes, shopify_customer_id } = req.body
    const result = await query(
      `UPDATE clients SET name = COALESCE($1, name), email = $2, phone = $3, address = $4, is_large_client = COALESCE($5, is_large_client), notes = $6, shopify_customer_id = $7 WHERE id = $8 RETURNING *`,
      [name, email ?? null, phone ?? null, address ?? null, is_large_client, notes ?? null, shopify_customer_id ?? null, req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' })
    res.json(result.rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────
// CLIENT LABELS
// ─────────────────────────────────────────
app.get('/api/clients/:id/labels', auth, async (req, res) => {
  try {
    const result = await query(`SELECT * FROM client_labels WHERE client_id = $1 ORDER BY label_name, artwork_version`, [req.params.id])
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/clients/:id/labels', auth, async (req, res) => {
  try {
    const { label_name, artwork_version, supplier, quantity, notes } = req.body
    if (!label_name) return res.status(400).json({ error: 'label_name required' })
    const result = await query(
      `INSERT INTO client_labels (client_id, label_name, artwork_version, supplier, quantity, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, label_name, artwork_version || 'v1', supplier || null, quantity || 0, notes || null]
    )
    res.status(201).json(result.rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/clients/:id/labels/receive', auth, async (req, res) => {
  try {
    const { client_label_id, quantity, notes } = req.body
    if (!client_label_id || !quantity) return res.status(400).json({ error: 'client_label_id and quantity required' })
    await query(`UPDATE client_labels SET quantity = quantity + $1 WHERE id = $2 AND client_id = $3`, [quantity, client_label_id, req.params.id])
    await query(
      `INSERT INTO client_label_transactions (client_label_id, client_id, type, quantity, notes, user_id) VALUES ($1,$2,'received',$3,$4,$5)`,
      [client_label_id, req.params.id, quantity, notes || null, req.user.id]
    )
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/clients/:clientId/labels/:labelId/obsolete', auth, async (req, res) => {
  try {
    const { is_obsolete } = req.body
    await query(`UPDATE client_labels SET is_obsolete = $1 WHERE id = $2 AND client_id = $3`, [is_obsolete, req.params.labelId, req.params.clientId])
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────
// CLIENT STOCK (Large Clients)
// ─────────────────────────────────────────
app.get('/api/clients/:id/stock', auth, async (req, res) => {
  try {
    const result = await query(`SELECT * FROM client_stock WHERE client_id = $1 ORDER BY product_name`, [req.params.id])
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/clients/:id/stock/receive', auth, async (req, res) => {
  try {
    const { product_code, product_name, category, barcode, unit, quantity, notes } = req.body
    if (!product_code || !product_name || !quantity) return res.status(400).json({ error: 'product_code, product_name and quantity required' })
    // Upsert
    const existing = await query(`SELECT * FROM client_stock WHERE client_id = $1 AND product_code = $2`, [req.params.id, product_code])
    let record
    if (existing.rows[0]) {
      const r = await query(`UPDATE client_stock SET quantity = quantity + $1 WHERE id = $2 RETURNING *`, [quantity, existing.rows[0].id])
      record = r.rows[0]
    } else {
      const r = await query(
        `INSERT INTO client_stock (client_id, product_code, product_name, category, barcode, unit, quantity, received_date, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8) RETURNING *`,
        [req.params.id, product_code, product_name, category || 'COMPONENTS', barcode || null, unit || 'units', quantity, notes || null]
      )
      record = r.rows[0]
    }
    await query(
      `INSERT INTO client_stock_transactions (client_stock_id, client_id, type, quantity, unit, notes, user_id) VALUES ($1,$2,'received',$3,$4,$5,$6)`,
      [record.id, req.params.id, quantity, unit || 'units', notes || null, req.user.id]
    )
    res.json(record)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────
// PRODUCTION ORDERS
// ─────────────────────────────────────────
async function getNextOrderNumber() {
  const result = await query(`SELECT order_number FROM production_orders ORDER BY id DESC LIMIT 1`)
  if (!result.rows[0]) return 'SM-001'
  const last = result.rows[0].order_number
  const num = parseInt(last.replace('SM-', '')) + 1
  return `SM-${String(num).padStart(3, '0')}`
}

app.get('/api/production-orders', auth, async (req, res) => {
  try {
    const { status, order_type, client_id } = req.query
    let q = `SELECT po.*, c.name as client_name FROM production_orders po LEFT JOIN clients c ON po.client_id = c.id WHERE 1=1`
    const params = []
    if (status) {
      params.push(status)
      q += ` AND po.status = $${params.length}`
    }
    if (order_type) {
      params.push(order_type)
      q += ` AND po.order_type = $${params.length}`
    }
    if (client_id) {
      params.push(client_id)
      q += ` AND po.client_id = $${params.length}`
    }
    q += ` ORDER BY po.created_at DESC`
    const result = await query(q, params)

    // Attach line items
    for (const order of result.rows) {
      const lines = await query(
        `SELECT pol.*, p.name as fragrance_name FROM production_order_lines pol LEFT JOIN products p ON pol.fragrance_id = p.id WHERE pol.production_order_id = $1 ORDER BY pol.line_number`,
        [order.id]
      )
      order.lines = lines.rows
    }

    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/production-orders/:id', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT po.*, c.name as client_name FROM production_orders po LEFT JOIN clients c ON po.client_id = c.id WHERE po.id = $1`,
      [req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' })
    const order = result.rows[0]

    const lines = await query(
      `SELECT pol.*, pf.name as fragrance_name, pp.name as packaging_name FROM production_order_lines pol
       LEFT JOIN products pf ON pol.fragrance_id = pf.id
       LEFT JOIN products pp ON pol.packaging_component_id = pp.id
       WHERE pol.production_order_id = $1 ORDER BY pol.line_number`,
      [order.id]
    )
    order.lines = lines.rows

    for (const line of order.lines) {
      const comps = await query(
        `SELECT poc.*, p.current_stock FROM production_order_components poc LEFT JOIN products p ON poc.product_id = p.id WHERE poc.production_order_line_id = $1`,
        [line.id]
      )
      line.components = comps.rows
    }

    res.json(order)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/production-orders', auth, async (req, res) => {
  try {
    const { client_id, order_type, due_date, notes, lines } = req.body
    if (!lines || lines.length === 0) return res.status(400).json({ error: 'At least one line item required' })

    const orderNumber = await getNextOrderNumber()

    const orderResult = await query(
      `INSERT INTO production_orders (order_number, client_id, order_type, due_date, notes, status, created_by)
       VALUES ($1,$2,$3,$4,$5,'draft',$6) RETURNING *`,
      [orderNumber, client_id || null, order_type || 'STANDARD', due_date || null, notes || null, req.user.id]
    )
    const order = orderResult.rows[0]

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineResult = await query(
        `INSERT INTO production_order_lines (production_order_id, line_number, product_type, fragrance_id, oil_pct, packaging_component_id, label_client_label_id, quantity, unit_price, is_candle)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,$9) RETURNING *`,
        [order.id, i + 1, line.product_type, line.fragrance_id || null, line.oil_pct || 25,
         line.packaging_component_id || null, line.label_client_label_id || null, line.quantity,
         ['CANDLE_240G', 'CANDLE_400G'].includes(line.product_type)]
      )
      const dbLine = lineResult.rows[0]

      // Build components from BOM
      await buildLineComponents(order.id, dbLine, line)
    }

    await auditLog(req.user.id, 'production_order_created', 'production_order', order.id, orderNumber, { client_id, order_type })
    res.status(201).json({ ...order, id: order.id, order_number: orderNumber })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

async function buildLineComponents(orderId, line, lineInput) {
  const productType = line.product_type
  const qty = parseInt(line.quantity)
  const oilPct = parseFloat(line.oil_pct) || 25
  const isCandle = line.is_candle

  // Get BOM rules for product type
  const bomRules = await query(`SELECT * FROM bom_rules WHERE product_type = $1`, [productType])

  for (const rule of bomRules.rows) {
    let qtyRequired
    if (rule.component_type === 'FRAGRANCE') {
      if (isCandle) {
        qtyRequired = qty * rule.quantity_per_unit
      } else if (productType === 'MICRO_OIL_15ML') {
        qtyRequired = qty * rule.quantity_per_unit
      } else {
        // Apply oil_pct override
        const volume = getProductVolume(productType)
        qtyRequired = qty * volume * (oilPct / 100)
      }
    } else if (rule.component_type === 'ETHANOL') {
      const volume = getProductVolume(productType)
      qtyRequired = qty * volume * ((100 - oilPct) / 100)
    } else {
      qtyRequired = qty * rule.quantity_per_unit
    }

    // Find matching product
    let productId = null, productCode = null, productName = null
    if (rule.component_type === 'FRAGRANCE' && line.fragrance_id) {
      const p = await query(`SELECT * FROM products WHERE id = $1`, [line.fragrance_id])
      if (p.rows[0]) { productId = p.rows[0].id; productCode = p.rows[0].product_code; productName = p.rows[0].name }
    } else if (rule.component_type === 'ETHANOL') {
      const p = await query(`SELECT * FROM products WHERE name ILIKE '%ethanol%' AND category = 'RAW_MATERIALS' LIMIT 1`)
      if (p.rows[0]) { productId = p.rows[0].id; productCode = p.rows[0].product_code; productName = p.rows[0].name }
    }

    const source = lineInput.use_client_stock ? 'client_stock' : 'general_stock'
    await query(
      `INSERT INTO production_order_components (production_order_line_id, production_order_id, product_id, product_code, product_name, source, quantity_required, unit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [line.id, orderId, productId, productCode, productName || rule.component_type, source, qtyRequired, rule.unit]
    )
  }

  // Add packaging if selected
  if (lineInput.packaging_component_id) {
    const p = await query(`SELECT * FROM products WHERE id = $1`, [lineInput.packaging_component_id])
    if (p.rows[0]) {
      await query(
        `INSERT INTO production_order_components (production_order_line_id, production_order_id, product_id, product_code, product_name, source, quantity_required, unit)
         VALUES ($1,$2,$3,$4,$5,'general_stock',$6,'units')`,
        [line.id, orderId, p.rows[0].id, p.rows[0].product_code, p.rows[0].name, qty]
      )
    }
  }

  // Add labels if selected
  if (lineInput.label_client_label_id) {
    const lbl = await query(`SELECT * FROM client_labels WHERE id = $1`, [lineInput.label_client_label_id])
    if (lbl.rows[0]) {
      await query(
        `INSERT INTO production_order_components (production_order_line_id, production_order_id, product_id, product_code, product_name, source, quantity_required, unit)
         VALUES ($1,$2,NULL,NULL,$3,'client_label',$4,'units')`,
        [line.id, orderId, lbl.rows[0].label_name, qty]
      )
    }
  }
}

function getProductVolume(productType) {
  const volumes = {
    'TRAVEL_SPRAY_10ML': 10,
    'ROOM_SPRAY_50ML': 50,
    'ROOM_SPRAY_100ML': 100,
    'REED_DIFFUSER_200ML': 200,
    'MICRO_OIL_15ML': 15,
    'CANDLE_240G': 240,
    'CANDLE_400G': 400,
  }
  return volumes[productType] || 0
}

app.put('/api/production-orders/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body
    await query(`UPDATE production_orders SET status = $1, updated_at = NOW() WHERE id = $2`, [status, req.params.id])
    await auditLog(req.user.id, 'production_order_status_changed', 'production_order', parseInt(req.params.id), null, { status })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/production-orders/:id', auth, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.id
    const po = await query(`SELECT * FROM production_orders WHERE id = $1`, [req.params.id])
    if (!po.rows[0]) return res.status(404).json({ error: 'Not found' })
    if (!['draft', 'cancelled'].includes(po.rows[0].status)) {
      return res.status(400).json({ error: 'Only draft or cancelled orders can be deleted' })
    }
    await query(`DELETE FROM production_orders WHERE id = $1`, [req.params.id])
    await auditLog(userId, 'production_order_deleted', 'production_order', parseInt(req.params.id), po.rows[0].order_number, {})
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────
// MANUFACTURING QUEUE
// ─────────────────────────────────────────
app.get('/api/manufacturing/queue', auth, async (req, res) => {
  try {
    const { order_type } = req.query
    let q = `SELECT po.*, c.name as client_name FROM production_orders po LEFT JOIN clients c ON po.client_id = c.id WHERE po.status IN ('queued','in_production','waiting_external')`
    const params = []
    if (order_type && order_type !== 'ALL') {
      params.push(order_type)
      q += ` AND po.order_type = $${params.length}`
    }
    q += ` ORDER BY po.due_date ASC NULLS LAST, po.created_at ASC`
    const result = await query(q, params)

    for (const order of result.rows) {
      const lines = await query(
        `SELECT pol.*, pf.name as fragrance_name FROM production_order_lines pol LEFT JOIN products pf ON pol.fragrance_id = pf.id WHERE pol.production_order_id = $1 ORDER BY pol.line_number`,
        [order.id]
      )
      order.lines = lines.rows

      const job = await query(`SELECT * FROM production_jobs WHERE production_order_id = $1 ORDER BY created_at DESC LIMIT 1`, [order.id])
      order.job = job.rows[0] || null
    }

    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/manufacturing/:id/start', auth, async (req, res) => {
  try {
    const order = await query(`SELECT * FROM production_orders WHERE id = $1`, [req.params.id])
    if (!order.rows[0]) return res.status(404).json({ error: 'Not found' })
    if (order.rows[0].status !== 'queued') return res.status(400).json({ error: 'Order must be in queued status' })

    // Create job
    const job = await query(
      `INSERT INTO production_jobs (production_order_id, started_by, status) VALUES ($1,$2,'in_production') RETURNING *`,
      [req.params.id, req.user.id]
    )
    await query(`UPDATE production_orders SET status = 'in_production', updated_at = NOW() WHERE id = $1`, [req.params.id])

    // Consume reserved stock
    const reservations = await query(`SELECT * FROM stock_reservations WHERE production_order_id = $1 AND status = 'reserved'`, [req.params.id])
    for (const res_item of reservations.rows) {
      if (res_item.source === 'general_stock' && res_item.product_id) {
        await adjustProductStock(res_item.product_id, -res_item.quantity_reserved, 'production_debit',
          `Production: ${order.rows[0].order_number}`, req.user.id, parseInt(req.params.id))
        await query(`UPDATE stock_reservations SET status = 'consumed', quantity_consumed = $1 WHERE id = $2`, [res_item.quantity_reserved, res_item.id])
      }
    }

    await auditLog(req.user.id, 'production_started', 'production_order', parseInt(req.params.id), order.rows[0].order_number, {})
    res.json(job.rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/manufacturing/:id/complete', auth, async (req, res) => {
  try {
    const { leftover_formula_ml, leftover_formula_oil_pct, leftover_labels_qty, notes_on_completion, actual_oil_pct } = req.body
    const order = await query(
      `SELECT po.*, c.name as client_name FROM production_orders po LEFT JOIN clients c ON po.client_id = c.id WHERE po.id = $1`,
      [req.params.id]
    )
    if (!order.rows[0]) return res.status(404).json({ error: 'Not found' })

    await query(
      `UPDATE production_jobs SET completed_at = NOW(), status = 'completed', leftover_formula_ml = $1, leftover_formula_oil_pct = $2, leftover_labels_qty = $3, notes_on_completion = $4 WHERE production_order_id = $5`,
      [leftover_formula_ml || null, leftover_formula_oil_pct || null, leftover_labels_qty || null, notes_on_completion || null, req.params.id]
    )
    await query(`UPDATE production_orders SET status = 'completed', updated_at = NOW() WHERE id = $1`, [req.params.id])

    // Register leftover formula as Ready Formula
    if (leftover_formula_ml && leftover_formula_ml > 0) {
      const lines = await query(`SELECT pol.* FROM production_order_lines pol WHERE pol.production_order_id = $1 LIMIT 1`, [req.params.id])
      if (lines.rows[0]?.fragrance_id) {
        const fragrance = await query(`SELECT * FROM products WHERE id = $1`, [lines.rows[0].fragrance_id])
        if (fragrance.rows[0]) {
          // Check if ready formula product exists for this fragrance
          let rfProd = await query(`SELECT * FROM products WHERE category = 'READY_FORMULA' AND name ILIKE $1 LIMIT 1`, [`%${fragrance.rows[0].name}%`])
          if (!rfProd.rows[0]) {
            rfProd = await query(
              `INSERT INTO products (name, product_code, category, unit, current_stock) VALUES ($1,$2,'READY_FORMULA','ml',0) RETURNING *`,
              [`Ready Formula — ${fragrance.rows[0].name}`, `RF-${fragrance.rows[0].product_code}`]
            )
          }
          await adjustProductStock(rfProd.rows[0].id, leftover_formula_ml, 'ready_formula_in',
            `Leftover from ${order.rows[0].order_number}`, req.user.id, parseInt(req.params.id))
        }
      }
    }

    await auditLog(req.user.id, 'production_completed', 'production_order', parseInt(req.params.id), order.rows[0].order_number, { leftover_formula_ml, leftover_labels_qty })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────
// FRAGRANCE STRENGTH LOG
// ─────────────────────────────────────────
app.get('/api/fragrances/:id/strength-log', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT fsl.*, u.name as created_by_name FROM fragrance_strength_log fsl LEFT JOIN users u ON fsl.created_by = u.id WHERE fsl.fragrance_id = $1 ORDER BY fsl.date_used DESC`,
      [req.params.id]
    )
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/fragrances/:id/strength-log', auth, async (req, res) => {
  try {
    const { production_order_id, standard_pct, actual_pct_used, was_adjusted, adjustment_reason, batch_reference, date_used } = req.body
    const fragrance = await query(`SELECT * FROM products WHERE id = $1`, [req.params.id])
    if (!fragrance.rows[0]) return res.status(404).json({ error: 'Fragrance not found' })
    const result = await query(
      `INSERT INTO fragrance_strength_log (fragrance_id, fragrance_name, production_order_id, standard_pct, actual_pct_used, was_adjusted, adjustment_reason, batch_reference, date_used, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.params.id, fragrance.rows[0].name, production_order_id || null, standard_pct || 25, actual_pct_used,
       was_adjusted || false, adjustment_reason || null, batch_reference || null, date_used || new Date().toISOString().split('T')[0], req.user.id]
    )
    res.status(201).json(result.rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────
// READY FORMULA
// ─────────────────────────────────────────
app.get('/api/ready-formula/available', auth, async (req, res) => {
  try {
    const { fragrance_id } = req.query
    if (!fragrance_id) return res.status(400).json({ error: 'fragrance_id required' })
    const fragrance = await query(`SELECT * FROM products WHERE id = $1`, [fragrance_id])
    if (!fragrance.rows[0]) return res.json([])
    const result = await query(
      `SELECT * FROM products WHERE category = 'READY_FORMULA' AND name ILIKE $1 AND current_stock > 0`,
      [`%${fragrance.rows[0].name}%`]
    )
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────
// BARCODE LOOKUP
// ─────────────────────────────────────────
app.get('/api/barcode/:code', auth, async (req, res) => {
  try {
    const result = await query(`SELECT * FROM products WHERE barcode = $1`, [req.params.code])
    if (!result.rows[0]) return res.status(404).json({ error: 'Product not found for barcode' })
    res.json(result.rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────
app.get('/api/dashboard/priority-watchlist', auth, async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*, COALESCE(pending_po.qty, 0) as pending_po_qty
      FROM products p
      LEFT JOIN (
        SELECT product_id, SUM(quantity - quantity_received) as qty
        FROM purchase_orders WHERE status IN ('pending','partial') GROUP BY product_id
      ) pending_po ON pending_po.product_id = p.id
      WHERE p.min_stock_level > 0 AND p.current_stock <= p.min_stock_level
      ORDER BY (p.current_stock - p.min_stock_level) ASC
      LIMIT 20
    `)
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/dashboard/active-orders', auth, async (req, res) => {
  try {
    const result = await query(`
      SELECT po.*, c.name as client_name
      FROM production_orders po
      LEFT JOIN clients c ON po.client_id = c.id
      WHERE po.status NOT IN ('fulfilled','cancelled','completed')
      ORDER BY po.due_date ASC NULLS LAST, po.created_at ASC
      LIMIT 20
    `)
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/dashboard/candles-in-progress', auth, async (req, res) => {
  try {
    const result = await query(`
      SELECT po.*, c.name as client_name, pol.candle_status, pol.filling_supplier, pol.sent_for_filling_at
      FROM production_orders po
      LEFT JOIN clients c ON po.client_id = c.id
      JOIN production_order_lines pol ON pol.production_order_id = po.id AND pol.is_candle = true
      WHERE po.status NOT IN ('fulfilled','cancelled')
      ORDER BY po.created_at DESC
    `)
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/dashboard/labels-pending', auth, async (req, res) => {
  try {
    const result = await query(`
      SELECT po.order_number, c.name as client_name, pol.labels_supplier, pol.labels_eta, pol.labels_received
      FROM production_order_lines pol
      JOIN production_orders po ON pol.production_order_id = po.id
      LEFT JOIN clients c ON po.client_id = c.id
      WHERE pol.labels_required = true AND pol.labels_received = false
        AND po.status NOT IN ('fulfilled','cancelled')
      ORDER BY pol.labels_eta ASC NULLS LAST
    `)
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/dashboard/stats', auth, async (req, res) => {
  try {
    const [products, orders, lowStock, pendingPos, largeClients] = await Promise.all([
      query(`SELECT COUNT(*) FROM products`),
      query(`SELECT COUNT(*) FROM production_orders WHERE status NOT IN ('fulfilled','cancelled')`),
      query(`SELECT COUNT(*) FROM products WHERE current_stock <= min_stock_level AND min_stock_level > 0`),
      query(`SELECT COUNT(*) FROM purchase_orders WHERE status IN ('pending','partial')`),
      query(`SELECT c.id, c.name, COUNT(cs.id) as reserved_count, SUM(cs.reserved_qty) as total_reserved FROM clients c LEFT JOIN client_stock cs ON cs.client_id = c.id WHERE c.is_large_client = true GROUP BY c.id, c.name ORDER BY c.name`),
    ])
    res.json({
      total_products: parseInt(products.rows[0].count),
      active_orders: parseInt(orders.rows[0].count),
      low_stock: parseInt(lowStock.rows[0].count),
      pending_pos: parseInt(pendingPos.rows[0].count),
      large_clients: largeClients.rows,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────
// ACTIVITY LOG
// ─────────────────────────────────────────
app.get('/api/audit', auth, requireRole('root', 'admin'), async (req, res) => {
  try {
    const { user_id, action, from, to } = req.query
    let q = `SELECT al.*, u.name as user_name FROM audit_log al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1`
    const params = []
    if (user_id) { params.push(user_id); q += ` AND al.user_id = $${params.length}` }
    if (action) { params.push(action); q += ` AND al.action = $${params.length}` }
    if (from) { params.push(from); q += ` AND al.created_at >= $${params.length}` }
    if (to) { params.push(to); q += ` AND al.created_at <= $${params.length}` }
    q += ` ORDER BY al.created_at DESC LIMIT 1000`
    const result = await query(q, params)
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────
// SHOPIFY WEBHOOK
// ─────────────────────────────────────────
const processingOrders = new Set()

app.post('/api/webhook/shopify', express.raw({ type: 'application/json' }), async (req, res) => {
  // HMAC validation
  if (process.env.SHOPIFY_WEBHOOK_SECRET) {
    const hmac = req.headers['x-shopify-hmac-sha256']
    const digest = crypto
      .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
      .update(req.body)
      .digest('base64')
    if (!hmac || digest !== hmac) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  res.status(200).json({ received: true })

  try {
    const topic = req.headers['x-shopify-topic']
    if (topic !== 'orders/paid') return

    const body = JSON.parse(req.body.toString())
    const shopifyOrderId = body.id

    if (processingOrders.has(shopifyOrderId)) return
    processingOrders.add(shopifyOrderId)

    try {
      // Idempotency check
      const already = await query(`SELECT id FROM webhook_processed WHERE shopify_order_id = $1 AND webhook_type = 'orders/paid'`, [shopifyOrderId])
      if (already.rows[0]) return

      // Find production order by draft order ID
      const prodOrder = await query(`SELECT * FROM production_orders WHERE shopify_draft_order_id = $1`, [body.cart_token || shopifyOrderId])

      if (prodOrder.rows[0]) {
        const order = prodOrder.rows[0]
        // Reserve stock
        const lines = await query(`SELECT pol.* FROM production_order_lines pol WHERE pol.production_order_id = $1`, [order.id])
        const comps = await query(`SELECT * FROM production_order_components WHERE production_order_id = $1 AND source = 'general_stock'`, [order.id])

        for (const comp of comps.rows) {
          if (comp.product_id) {
            await query(
              `INSERT INTO stock_reservations (production_order_id, production_order_line_id, product_id, product_code, source, quantity_reserved, status)
               VALUES ($1,$2,$3,$4,'general_stock',$5,'reserved')`,
              [order.id, comp.production_order_line_id, comp.product_id, comp.product_code, comp.quantity_required]
            )
          }
        }

        await query(
          `UPDATE production_orders SET status = 'queued', shopify_order_id = $1, shopify_order_number = $2, updated_at = NOW() WHERE id = $3`,
          [shopifyOrderId, body.order_number || body.name, order.id]
        )
      }

      await query(`INSERT INTO webhook_processed (shopify_order_id, webhook_type) VALUES ($1,'orders/paid')`, [shopifyOrderId])
    } finally {
      processingOrders.delete(shopifyOrderId)
    }
  } catch (e) {
    console.error('[webhook]', e.message)
  }
})

// ─────────────────────────────────────────
// SHOPIFY API HELPERS
// ─────────────────────────────────────────
app.post('/api/shopify/draft-order', auth, async (req, res) => {
  try {
    const { production_order_id } = req.body
    if (!process.env.SHOPIFY_SHOP_DOMAIN || !process.env.SHOPIFY_ACCESS_TOKEN) {
      return res.status(503).json({ error: 'Shopify not configured' })
    }

    const order = await query(
      `SELECT po.*, c.shopify_customer_id FROM production_orders po LEFT JOIN clients c ON po.client_id = c.id WHERE po.id = $1`,
      [production_order_id]
    )
    if (!order.rows[0]) return res.status(404).json({ error: 'Order not found' })

    const lines = await query(
      `SELECT pol.*, pf.name as fragrance_name FROM production_order_lines pol LEFT JOIN products pf ON pol.fragrance_id = pf.id WHERE pol.production_order_id = $1`,
      [production_order_id]
    )

    const lineItems = lines.rows.map(l => ({
      title: `${formatProductType(l.product_type)} — ${l.fragrance_name || 'N/A'}`,
      quantity: l.quantity,
      price: '0.00',
      requires_shipping: true
    }))

    const draftOrder = {
      draft_order: {
        send_receipt: false,
        send_invoice: false,
        line_items: lineItems,
        note: `SM Order: ${order.rows[0].order_number} | Due: ${order.rows[0].due_date || 'TBD'}`,
        tags: 'SA Custom Orders'
      }
    }

    if (order.rows[0].shopify_customer_id) {
      draftOrder.draft_order.customer = { id: order.rows[0].shopify_customer_id }
    }

    const response = await fetch(
      `https://${process.env.SHOPIFY_SHOP_DOMAIN}/admin/api/2025-01/draft_orders.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN
        },
        body: JSON.stringify(draftOrder)
      }
    )

    const data = await response.json()
    if (!response.ok) return res.status(response.status).json({ error: data.errors || 'Shopify error' })

    await query(
      `UPDATE production_orders SET shopify_draft_order_id = $1, status = 'confirmed', updated_at = NOW() WHERE id = $2`,
      [data.draft_order.id, production_order_id]
    )

    res.json({ draft_order_id: data.draft_order.id, draft_order_url: data.draft_order.invoice_url })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

function formatProductType(type) {
  const labels = {
    'TRAVEL_SPRAY_10ML': 'Travel Spray 10ml',
    'ROOM_SPRAY_50ML': 'Room Spray 50ml',
    'ROOM_SPRAY_100ML': 'Room Spray 100ml',
    'REED_DIFFUSER_200ML': 'Reed Diffuser 200ml',
    'MICRO_OIL_15ML': 'Micro Oil 15ml',
    'CANDLE_240G': 'Candle 240G',
    'CANDLE_400G': 'Candle 400G',
  }
  return labels[type] || type
}

// ─────────────────────────────────────────
// SERVE FRONTEND IN PRODUCTION
// ─────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')))
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')))
}

// ─────────────────────────────────────────
// START
// ─────────────────────────────────────────
runStartupMigrations()
  .then(() => {
    app.listen(PORT, () => console.log(`[SM] Server running on port ${PORT}`))
  })
  .catch(e => {
    console.error('[DB] Migration failed:', e)
    process.exit(1)
  })
