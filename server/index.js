process.env.TZ = 'Australia/Sydney'

require('dotenv').config()
const express = require('express')
const path    = require('path')
const { runStartupMigrations } = require('./db')
const { startSyncCron, registerWebhooks } = require('./services/shopify-sync')

const app  = express()
const PORT = process.env.PORT || 3001

app.use(require('cors')())
app.use(express.json({ limit: '25mb' }))

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// Routes
app.use('/api', require('./routes/auth'))
app.use('/api', require('./routes/suppliers'))
app.use('/api', require('./routes/products'))
app.use('/api', require('./routes/stock'))
app.use('/api', require('./routes/bom'))
app.use('/api', require('./routes/clients'))
app.use('/api', require('./routes/production-orders'))
app.use('/api', require('./routes/manufacturing'))
app.use('/api', require('./routes/dashboard'))
app.use('/api', require('./routes/audit'))
app.use('/api', require('./routes/packing'))
app.use('/api', require('./routes/shipping'))
app.use('/api', require('./routes/webhooks'))
app.use('/api', require('./routes/container-types'))
app.use('/api', require('./routes/masters'))
app.use('/api', require('./routes/major-clients'))
app.use('/', require('./routes/shopify-oauth'))

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')))
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')))
}

runStartupMigrations()
  .then(() => {
    startSyncCron()
    registerWebhooks()
    app.listen(PORT, () => console.log(`[SM] Server running on port ${PORT}`))
  })
  .catch(e => {
    console.error('[DB] Migration failed:', e)
    process.exit(1)
  })
