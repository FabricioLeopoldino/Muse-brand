# Relatório de Análise — Refactor Dynamic Types + 3 Segmentos

**Sistema:** Scented Merchandise / MUSE
**Data:** 2026-05-14
**Status:** Análise prévia — aguardando aprovação final antes de codar
**Autor:** Claude (Sonnet 4.6) revisando codebase + alinhamento com Fabricio

---

## ÍNDICE

1. [Resumo Executivo](#1-resumo-executivo)
2. [Estado Atual (As-Is)](#2-estado-atual-as-is)
3. [Estado Futuro (To-Be)](#3-estado-futuro-to-be)
4. [Os 3 Segmentos em Detalhe](#4-os-3-segmentos-em-detalhe)
5. [Database Schema — Mudanças](#5-database-schema--mudanças)
6. [Mudanças Função por Função](#6-mudanças-função-por-função)
7. [Fluxos de Usuário](#7-fluxos-de-usuário)
8. [Páginas e UI](#8-páginas-e-ui)
9. [APIs (Endpoints)](#9-apis-endpoints)
10. [Reservation Priority (Major Wins)](#10-reservation-priority-major-wins)
11. [Riscos e Mitigações](#11-riscos-e-mitigações)
12. [Plano de Testes Manuais](#12-plano-de-testes-manuais)
13. [Plano de Execução](#13-plano-de-execução)
14. [Questões Pendentes / Pontos de Confirmação](#14-questões-pendentes--pontos-de-confirmação)
15. [Pontos de Atenção Pessoais (Claude)](#15-pontos-de-atenção-pessoais-claude)

---

## 1. Resumo Executivo

### Visão Final

Transformar o sistema de **hardcoded** (produtos PROD_TYPE fixos no código) pra **Cin7-style** (totalmente database-driven), com **três segmentos de negócio distintos** funcionando lado a lado:

| Segmento | Audiência | Stock | Componentes |
|----------|-----------|-------|-------------|
| **MUSE** | B2C (own brand) | Rotativo, variants com stock | Próprios (bottles/lids MUSE) |
| **Standard (Clean Skin)** | B2B genérico | Made-to-order, sem stock | Genéricos (clean skin) |
| **Major Clients** (COCO etc) | B2B premium | Stock via order status | Próprios do cliente (China) |

**Único recurso 100% compartilhado:** Fragrances (oils).

### Esforço Estimado

- **140 minutos** de implementação ativa
- Dividido em **2 sessões** recomendadas (90min + 50min)
- **20 arquivos** afetados (7 server + 13 frontend)
- Schema migrations idempotentes, sem downtime esperado

### O Que Muda Pro Usuário

**Antes:**
- Cadastra produto manual no Products page com qualquer código
- Sistema usa lista FIXA de tipos (REED_DIFFUSER_200ML, etc.)
- BOM vinculado por string mágica que precisa bater
- Stock MUSE não sabia qual fragrância tinha
- Buttons "Ready to Ship/Fulfilled" apareciam pra MUSE (sem fazer sentido)

**Depois:**
- Cria MUSE Master "Reed Diffuser 200ml MUSE" → seleciona 10 fragrances → 10 variants criadas auto
- Stock MUSE mostra: "Reed 200ml × Santal Black: 8 units"
- Sidebar dividido em MUSE / STANDARD / MAJOR CLIENTS
- Cada Major Client tem catálogo próprio + drill-in com stock awaiting ship
- Major Client tem prioridade em reservation (sistema avisa quando "desloca" MUSE)

---

## 2. Estado Atual (As-Is)

### Hardcoded em 9 lugares

**Frontend (6):**

| Arquivo | Linhas | O quê |
|---------|--------|-------|
| `src/pages/ProductionOrders.jsx` | 11-19 | `PRODUCT_TYPES` array (key, label, volume, fullOil?, candle?, oilPct?) |
| `src/pages/ManufacturingQueue.jsx` | 10-14 | `PRODUCT_TYPE_LABELS` |
| `src/pages/Dashboard.jsx` | 78-82 | `PRODUCT_TYPE_LABELS` |
| `src/pages/PackingRecords.jsx` | (search) | `PRODUCT_TYPE_LABELS` similar |
| `src/pages/Clients.jsx` | 13-21 | `LABEL_PRODUCT_TYPES` (label form) |
| `src/pages/BOMViewer.jsx` | 10-18 | `PRODUCT_TYPES` (já mesclado com dinâmico via fgTabs) |

**Backend (3):**

| Arquivo | Linhas | O quê |
|---------|--------|-------|
| `server/services/bom-builder.js` | 3-14 | `getProductVolume()` com map hardcoded |
| `server/services/shopify-sync.js` | 30-34 | `LABELS` map |
| `server/services/shipping-service.js` | 33-44 | `formatProductType()` com map |

### Banco de Dados — Estado Atual

**Tabelas relevantes:**

```
products
  ├─ id, name, product_code, category, sub_category, unit
  ├─ current_stock, min_stock_level
  ├─ supplier, supplier_id, supplier_code
  ├─ barcode, shopify_variant_id, bin_location
  ├─ client_id              ← já existe (MUSE=NULL, Major=X)
  ├─ volume_ml              ← já existe
  ├─ default_oil_pct        ← já existe
  └─ image_data, notes

product_bom
  ├─ id, product_type VARCHAR(50)   ← chave string (= product_code do master)
  ├─ component_product_id
  ├─ quantity_formula ('fixed'|'ethanol_pct')
  ├─ quantity_per_unit
  ├─ component_group ('core'|'packing'|'labeling')
  ├─ is_active, version, archived_at
  └─ sort_order

production_order_lines
  ├─ id, production_order_id, line_number
  ├─ product_type VARCHAR(50)       ← chave string
  ├─ fragrance_id                   ← já existe
  ├─ ready_formula_id, use_ready_formula
  ├─ oil_pct
  ├─ label_client_label_id
  ├─ is_candle, candle_status
  ├─ needs_labeling, needs_packing
  └─ line_status

client_stock                        ← Major Clients (componentes deles)
  └─ client_id, product_code, product_name, category, quantity, ...

client_labels                       ← custom labels (Standard + Major)
  └─ client_id, label_name, artwork_version, quantity, ...

client_product_bom                  ← Major Client BOM override (não vai mais ser usado)
  └─ product_id, client_stock_id, general_product_id, quantity_per_unit

stock_reservations
  └─ production_order_id, product_id, quantity_reserved, status
  (FALTA: priority)

audit_log, transactions, fragrance_strength_log, packing_records, etc.
```

### Casos Especiais Identificados

| Tipo | Comportamento Especial Hardcoded |
|------|----------------------------------|
| `MICRO_OIL_15ML` | `fullOil:true` — fragrance qty = qty × volume (sem ethanol mix) |
| `CANDLE_240G` / `CANDLE_400G` | `is_candle:true` — flow de filling externo, oilPct fixo em 12 |
| Reed/Spray padrão | Mix fragrance + ethanol pelo oil_pct (default 25%) |

**Como vai ser tratado:** virar **flags do master** (`is_pure_oil`, `is_candle`, `container_type`), não mais string magic.

### Funcionalidade Já Funcionando Bem

✅ **BOMViewer já mescla dinâmico + hardcoded** (linha 66-69)
✅ **Schema produtos já tem volume_ml e default_oil_pct**
✅ **MUSE auto-fulfill** (implementado na última sessão)
✅ **FG stock increment scope só MUSE** (implementado na última sessão)
✅ **Candle external filling flow**
✅ **Reservation system** (stock_reservations table)
✅ **Audit log** com enriquecimento de nomes
✅ **Activity log** funcionando

---

## 3. Estado Futuro (To-Be)

### Vista de Alto Nível

```
┌──────────────────────────────────────────────────────────────────────┐
│                     SCENTED MERCHANDISE / MUSE                        │
│                          (sistema unificado)                          │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┬──────────────────────────────────────────┐
│  RESOURCES COMPARTILHADOS                                            │
│  ─ Fragrances (100% pool comum)                                      │
│  ─ Raw materials (ethanol, óleos base)                              │
│  ─ Production line (workers, equipamentos, processos)               │
│  ─ Shipping infrastructure                                           │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────┬─────────────────┬───────────────────────────────────┐
│  MUSE           │  STANDARD       │  MAJOR CLIENTS                    │
│  (B2C)          │  (B2B Clean)    │  (B2B Premium)                    │
│                 │                 │                                   │
│  • Marca própria│  • Clean skin    │  • COCO, etc.                    │
│  • Components   │    bottles      │  • Components vêm da China        │
│    próprios     │  • Label custom │  • Tudo customizado               │
│  • Stock        │    do cliente   │  • Per-client catalog             │
│    variants     │  • Made-to-     │  • Stock = orders awaiting ship  │
│  • Shopify      │    order        │  • Cada cliente seu drill-in     │
│    futuro       │  • Sem stock    │                                   │
└─────────────────┴─────────────────┴───────────────────────────────────┘
```

### Hierarquia de Produtos (Master + Variant)

```
SEGMENT='MUSE', client_id=NULL
  Master: "Reed Diffuser 200ml MUSE" (is_master=true, BOM próprio)
    │
    ├── Variant: × Santal Black     (stock: 10)
    ├── Variant: × Vanilla Oud      (stock: 5)
    └── Variant: × Tobacco Vanille  (stock: 0)

SEGMENT='STANDARD', client_id=NULL  
  Master: "Reed Diffuser 200ml Clean Skin" (is_master=true, BOM próprio)
    └── (sem variants — made-to-order)

SEGMENT='MAJOR', client_id=COCO_ID
  Master: "Reed Diffuser 200ml COCO Republic" (is_master=true, BOM próprio)
    └── (sem variants — stock via order status)
```

### Sidebar Final

```
DASHBOARD
─────────────
PRODUCTION
  Production Orders
  Manufacturing Queue
  Packing Records
  Barcode Scanner
─────────────
INVENTORY
  Stock Management         ← raw + components gerais
  Fragrances              ← pool 100% compartilhado (página nova)
  BOM Builder              ← unificado (filtros por segment)
  Incoming Orders
  Suppliers
─────────────
MUSE
  MUSE Dashboard
  MUSE Products            ← masters próprios
  MUSE Stock               ← variants com stock
─────────────
STANDARD
  Standard Clients
  Standard Catalog         ← masters Clean Skin
  Custom Labels Stock      ← leftover labels
─────────────
MAJOR CLIENTS
  Major Clients            ← drill-in com catálogo+stock+orders por cliente
─────────────
HISTORY
  Transaction History
  Activity Log
  Returns
─────────────
SYSTEM
  User Management
```

---

## 4. Os 3 Segmentos em Detalhe

### 4.1. MUSE (B2C — Own Brand)

**Identidade visual:** Marca MUSE própria, com bottles/lids/packaging customizados.

**Fluxo:**
1. Cadastrar **MUSE Master** (ex: "Reed Diffuser 200ml MUSE")
   - Componentes próprios: MUSE Bottle 200ml, MUSE Lid, MUSE Packaging
   - BOM define todos os components + ethanol % + fragrance ratio
   - Atribuir fragrances disponíveis (mín 1)
   - Sistema cria **variants automaticamente** (1 por fragrance)
2. Criar **production order MUSE** (10× Reed 200ml + Santal Black)
3. Manufacturing produz
4. Ao completar: **+10 unidades na variant Reed×Santal Black**
5. Status da order: `fulfilled` (auto, sem precisar Ready to Ship)
6. Variant fica disponível pra venda
7. Quando vender (futuro Shopify), debita variant

**Stock holding:** SIM via variants

**Atributos do master:**
- `segment='MUSE'`, `client_id=NULL`, `is_master=true`
- `volume_ml`, `default_oil_pct`, `container_type`, `is_pure_oil`, `is_candle`
- `product_code` é a chave (ex: `REED_DIFFUSER_200ML_MUSE`)

**Atributos do variant:**
- `segment='MUSE'`, `client_id=NULL`, `is_master=false`
- `master_product_id` → master pai
- `fragrance_id` → fragrance específica
- `current_stock` próprio
- `product_code` derivado (ex: `REED_DIFFUSER_200ML_MUSE-SANTAL_BLACK`)

### 4.2. Standard (Clean Skin)

**Identidade visual:** Bottle sem logo, label customizada do cliente (ou nenhum).

**Fluxo:**
1. Cadastrar **Standard Master** (ex: "Reed Diffuser 200ml Clean Skin")
   - Componentes genéricos: Clean Skin Bottle 200ml, Generic Lid
   - BOM define tudo
   - **Sem fragrance pré-atribuída** (escolhe na order)
2. Cliente Standard (ex: "Acme Co") pede 100× Reed 200ml + Santal Black + label deles
3. Cria production order (client_id=ACME, label_client_label_id=ACME_LABEL_X)
4. Manufacturing produz
5. Ao completar: status `completed` → ready_to_ship → fulfilled
6. **Sem variant criado** (nada fica em stock)

**Stock holding:** NÃO (made-to-order)

**Atributos do master:**
- `segment='STANDARD'`, `client_id=NULL`, `is_master=true`
- product_code (ex: `REED_DIFFUSER_200ML_CLEAN_SKIN`)

### 4.3. Major Clients (Premium B2B)

**Identidade visual:** Bottle/lid/packaging próprios vindo da China.

**Fluxo:**
1. Cadastrar cliente como **Major Client** (`is_large_client=true`)
2. Cliente envia components da China → registrados em `client_stock`
3. Cadastrar **Major Master** específico desse cliente (ex: "Reed Diffuser 200ml COCO Republic")
   - BOM aponta pros components do client_stock
   - Fragrances disponíveis pra COCO
4. Criar production order pra COCO (client_id=COCO)
5. Manufacturing produz (consome client_stock + fragrances + ethanol)
6. Ao completar: status `completed` (aguardando OK do cliente)
7. Cliente OK → status `ready_to_ship` → `fulfilled`

**Stock holding:** SIM, mas **via status da order** (não cria variant)

**Visualização do stock COCO:** drill-in `/major-clients/COCO_ID/stock` mostra orders em status `completed` ou `ready_to_ship` agrupadas por master+fragrance.

**Atributos do master:**
- `segment='MAJOR'`, `client_id=COCO_ID`, `is_master=true`
- product_code único por cliente (ex: `REED_DIFFUSER_200ML_COCO`)

---

## 5. Database Schema — Mudanças

### Adições (idempotentes, aditivas)

```sql
-- ── PRODUCTS table ──────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS segment VARCHAR(20);
  -- 'MUSE' | 'STANDARD' | 'MAJOR' | NULL (raw, fragrances)
  
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT false;
  -- TRUE pro produto-modelo, FALSE pra variant ou raw

ALTER TABLE products ADD COLUMN IF NOT EXISTS master_product_id INTEGER 
  REFERENCES products(id) ON DELETE SET NULL;
  -- variant aponta pro pai

ALTER TABLE products ADD COLUMN IF NOT EXISTS fragrance_id INTEGER 
  REFERENCES products(id) ON DELETE SET NULL;
  -- variant guarda qual fragrance é

ALTER TABLE products ADD COLUMN IF NOT EXISTS container_type VARCHAR(30);
  -- 'reed' | 'spray' | 'candle' | 'oil' | 'other'

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_pure_oil BOOLEAN DEFAULT false;
  -- substitui MICRO_OIL_15ML check

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_candle BOOLEAN DEFAULT false;
  -- substitui CANDLE_240G/400G check

-- ── Junction tables: fragrances disponíveis por master ──────
CREATE TABLE IF NOT EXISTS muse_master_fragrances (
  id SERIAL PRIMARY KEY,
  master_product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  fragrance_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(master_product_id, fragrance_id)
);

CREATE TABLE IF NOT EXISTS major_client_master_fragrances (
  id SERIAL PRIMARY KEY,
  master_product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  fragrance_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(master_product_id, fragrance_id)
);

-- ── Reservation priority ─────────────────────────────────────
ALTER TABLE stock_reservations ADD COLUMN IF NOT EXISTS priority VARCHAR(10) 
  DEFAULT 'normal';
  -- 'high' (Major Client) | 'normal' (MUSE, Standard)

-- ── Indexes pra performance ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_segment 
  ON products(segment) WHERE segment IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_master_lookup 
  ON products(segment, product_code, client_id) 
  WHERE is_master = true;

CREATE INDEX IF NOT EXISTS idx_products_variant_lookup 
  ON products(master_product_id, fragrance_id) 
  WHERE master_product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_priority 
  ON stock_reservations(product_id, priority, status) 
  WHERE status = 'reserved';
```

### Remoções

```sql
-- Não roda DROP na production. Apenas em dev se clean slate.
-- Por padrão: tabelas e dados antigos ficam, novo sistema convive.

-- Em db.js: REMOVER função seedBomRules() e sua chamada
-- (porque banco fica clean slate, sem dados de exemplo)
```

### Constraints de Integridade

Em runtime (não em SQL, mais flexível):
- Master sempre tem `is_master=true`, `master_product_id=NULL`
- Variant sempre tem `is_master=false`, `master_product_id NOT NULL`, `fragrance_id NOT NULL`
- MUSE/Standard masters: `client_id=NULL`
- Major master: `client_id NOT NULL` E `clients.is_large_client=true`
- Segment de variant SEMPRE = segment do master
- product_code de variant derivado: `${master.product_code}-${fragrance.product_code}`

---

## 6. Mudanças Função por Função

### 6.1. server/db.js

**Função `runStartupMigrations()`** — adicionar:
```js
// Novas colunas products
await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS segment VARCHAR(20)`)
await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT false`)
await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS master_product_id INTEGER REFERENCES products(id) ON DELETE SET NULL`)
await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS fragrance_id INTEGER REFERENCES products(id) ON DELETE SET NULL`)
await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS container_type VARCHAR(30)`)
await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_pure_oil BOOLEAN DEFAULT false`)
await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_candle BOOLEAN DEFAULT false`)

// Junction tables
await query(`CREATE TABLE IF NOT EXISTS muse_master_fragrances (...)`)
await query(`CREATE TABLE IF NOT EXISTS major_client_master_fragrances (...)`)

// Reservation priority
await query(`ALTER TABLE stock_reservations ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'normal'`)

// Indexes (4 novos)
```

**Função `seedBomRules()`** — **REMOVER**. Não roda mais. Banco começa clean.

**Linha 187:**
```js
// REMOVER esta linha:
// if (parseInt(bomCheck.rows[0].count) === 0) await seedBomRules()
```

### 6.2. server/services/bom-builder.js

**Função `getProductVolume(productType)` — REFATORAR pra async:**

**Antes:**
```js
function getProductVolume(productType) {
  const volumes = { 'TRAVEL_SPRAY_10ML': 10, ... }
  return volumes[productType] || 0
}
```

**Depois:**
```js
async function getMasterAttrs(productType, qFn) {
  const qry = qFn || query
  const r = await qry(
    `SELECT volume_ml, default_oil_pct, is_pure_oil, is_candle 
     FROM products 
     WHERE product_code = $1 AND is_master = true 
     LIMIT 1`,
    [productType]
  )
  return {
    volume: parseFloat(r.rows[0]?.volume_ml) || 0,
    defaultOilPct: parseFloat(r.rows[0]?.default_oil_pct) || 25,
    isPureOil: r.rows[0]?.is_pure_oil || false,
    isCandle: r.rows[0]?.is_candle || false,
  }
}
```

**Função `buildLineComponents()` — usar atributos do master:**

```js
async function buildLineComponents(orderId, line, lineInput, clientId, qFn) {
  const qry = qFn || query
  const productType = line.product_type
  const qty = parseInt(line.quantity)
  const oilPct = parseFloat(line.oil_pct) || 25
  
  // ANTES: const volume = getProductVolume(productType)
  const { volume, isPureOil } = await getMasterAttrs(productType, qry)
  
  // ANTES: const fragQty = productType === 'MICRO_OIL_15ML' ? qty * volume : qty * volume * (oilPct / 100)
  const fragQty = isPureOil ? qty * volume : qty * volume * (oilPct / 100)
  
  // ... resto mantém
}
```

**Exports:** mantém `getMasterAttrs` (antes era getProductVolume).

### 6.3. server/services/shopify-sync.js

**Função `processDraftOrder()` linha 30-34 — REMOVER LABELS hardcoded:**

**Antes:**
```js
const LABELS = {
  'TRAVEL_SPRAY_10ML': 'Travel Spray 10ml', ...
}
const lineItems = lines.rows.map(l => ({
  title: `${LABELS[l.product_type] || l.product_type} — ${l.fragrance_name || 'N/A'}`,
  ...
}))
```

**Depois:**
```js
// Query lines já com nome do master via JOIN
const lines = await query(
  `SELECT pol.*, pf.name as fragrance_name, master.name as master_name
   FROM production_order_lines pol 
   LEFT JOIN products pf ON pol.fragrance_id = pf.id
   LEFT JOIN products master ON master.product_code = pol.product_type AND master.is_master = true
   WHERE pol.production_order_id = $1`,
  [payload.production_order_id]
)

const lineItems = lines.rows.map(l => ({
  title: `${l.master_name || l.product_type} — ${l.fragrance_name || 'N/A'}`,
  ...
}))
```

### 6.4. server/services/shipping-service.js

**Função `formatProductType()` — REMOVER hardcoded, virar async:**

**Antes:**
```js
function formatProductType(type) {
  const labels = { 'TRAVEL_SPRAY_10ML': 'Travel Spray 10ml', ... }
  return labels[type] || type
}
```

**Depois:**
```js
async function formatProductType(productType, qFn) {
  const { query } = require('../db')
  const qry = qFn || query
  const r = await qry(
    `SELECT name FROM products WHERE product_code = $1 AND is_master = true LIMIT 1`,
    [productType]
  )
  return r.rows[0]?.name || productType
}
```

Alternativa mais simples: deletar essa função e fazer callers usarem JOIN direto. Decisão: callers usam JOIN, deletar.

### 6.5. server/routes/manufacturing.js — complete handler

**Linha 219-242 (atual) — EXPANDIR pra 3 segmentos:**

```js
const isMuse = !order.rows[0].client_id

// Pegar info do cliente pra distinguir Standard vs Major
let isMajor = false
if (!isMuse) {
  const cli = await tq(`SELECT is_large_client FROM clients WHERE id = $1`, [order.rows[0].client_id])
  isMajor = cli.rows[0]?.is_large_client || false
}

const isStandard = !isMuse && !isMajor

// MUSE auto-fulfill com variants
// Standard fica em 'completed' (sem variant) → workflow normal
// Major fica em 'completed' aguardando OK (sem variant)
const finalStatus = isMuse ? 'fulfilled' : 'completed'

await tq(`UPDATE production_orders SET status = $1, updated_at = NOW() WHERE id = $2`, 
  [finalStatus, req.params.id])

// FG stock increment APENAS pra MUSE (variants)
if (isMuse) {
  const fgLines = await tq(
    `SELECT pol.id as line_id, pol.product_type, pol.quantity, pol.fragrance_id,
            master.id as master_id
     FROM production_order_lines pol 
     LEFT JOIN products master ON master.product_code = pol.product_type 
       AND master.is_master = true AND master.segment = 'MUSE'
     WHERE pol.production_order_id = $1`,
    [req.params.id]
  )
  for (const fl of fgLines.rows) {
    if (!fl.master_id || !fl.fragrance_id) continue
    
    // Find or auto-create variant
    let variant = await tq(
      `SELECT id FROM products 
       WHERE master_product_id = $1 AND fragrance_id = $2 
         AND segment = 'MUSE' AND is_master = false 
       LIMIT 1`,
      [fl.master_id, fl.fragrance_id]
    )
    
    if (!variant.rows[0]) {
      const frag = await tq(`SELECT product_code, name FROM products WHERE id = $1`, [fl.fragrance_id])
      const masterRow = await tq(`SELECT product_code, name, volume_ml FROM products WHERE id = $1`, [fl.master_id])
      const variantCode = `${masterRow.rows[0].product_code}-${frag.rows[0].product_code}`
      const variantName = `${masterRow.rows[0].name} — ${frag.rows[0].name}`
      variant = await tq(
        `INSERT INTO products 
         (name, product_code, category, segment, is_master, master_product_id, fragrance_id, 
          unit, current_stock, volume_ml, client_id)
         VALUES ($1, $2, 'FINISHED_GOOD', 'MUSE', false, $3, $4, 'units', 0, $5, NULL) 
         RETURNING id`,
        [variantName, variantCode, fl.master_id, fl.fragrance_id, masterRow.rows[0].volume_ml]
      )
    }
    
    await adjustProductStock(
      variant.rows[0].id, 
      parseFloat(fl.quantity), 
      'production_in',
      `Produced: ${order.rows[0].order_number}`,
      req.user.id, parseInt(req.params.id), fl.line_id, tq
    )
  }
}
```

### 6.6. server/routes/bom.js — bom-preview

**Função POST /bom-preview, linha 47-177 — substituir hardcoded:**

**Antes:**
```js
const volume = getProductVolume(product_type) || parseFloat(volOverride) || 0
// ...
const isMicroOil = product_type === 'MICRO_OIL_15ML'
const fragQty = isMicroOil ? qty * volume : qty * volume * (oilPct / 100)
```

**Depois:**
```js
const masterAttrs = await getMasterAttrs(product_type)
const volume = masterAttrs.volume || parseFloat(volOverride) || 0
// ...
const fragQty = masterAttrs.isPureOil ? qty * volume : qty * volume * (oilPct / 100)
```

### 6.7. server/routes/products.js — NOVOS endpoints

**Adicionar 8 endpoints:**

```js
// Lista todos masters (substitui PRODUCT_TYPES array)
GET /api/product-types
  Response: [{ id, key, label, segment, volume_ml, default_oil_pct, is_candle, is_pure_oil, client_id }, ...]

// Lista masters filtrados
GET /api/masters?segment=MUSE|STANDARD|MAJOR&client_id=X
  Response: [{ ...master, fragrance_count, variant_count }, ...]

// Detalhe completo de um master
GET /api/masters/:id
  Response: { ...master, bom_components: [...], fragrances: [...], variants: [...] }

// Cria master (com fragrances + opcional auto-generate variants)
POST /api/masters
  Body: { name, product_code, segment, client_id?, volume_ml, default_oil_pct, 
          container_type, is_candle, is_pure_oil, fragrance_ids: [], generate_variants: true }
  Action: cria master + insert na junction table + (se MUSE) cria variants
  Response: { master, variants_created: N }

// Atualiza master
PUT /api/masters/:id
  Body: { name?, volume_ml?, default_oil_pct?, container_type?, is_candle?, is_pure_oil? }
  (product_code não pode ser alterado se há orders referenciando)

// Soft-delete (archive)
DELETE /api/masters/:id
  Action: marca como inactive (não deleta)

// Adiciona fragrance a master (cria variant se MUSE)
POST /api/masters/:id/fragrances
  Body: { fragrance_id }
  Action: insert na junction + (se MUSE) cria variant

// Remove fragrance (variant marcada obsolete se MUSE)
DELETE /api/masters/:id/fragrances/:fragId

// Major Client específico
GET /api/major-clients/:id/masters
  Response: masters desse Major Client + summary

GET /api/major-clients/:id/stock-summary  
  Response: { 
    client_stock: [...components],
    awaiting_ship: [...orders agrupadas por master+fragrance com totalQty]
  }

// Reservation displacement check
POST /api/reservations/check-displacement
  Body: { product_id, quantity_required, priority }
  Response: { 
    can_reserve: bool, 
    available: N, 
    would_displace: [...reservations afetadas com order_number, client_name, qty] 
  }
```

### 6.8. server/routes/dashboard.js

**Verificar se há referências a product_type hardcoded.** Provável: NÃO, dashboard usa JOINs com products já. **Sem mudanças significativas, talvez ajustar widgets MUSE.**

### 6.9. src/pages/BOMViewer.jsx

**Linhas 10-18 — REMOVER PRODUCT_TYPES hardcoded array:**

```js
// REMOVER:
const PRODUCT_TYPES = [
  { key: 'TRAVEL_SPRAY_10ML', label: 'Travel Spray 10ml', volume: 10 },
  ...
]
```

**Linha 69 — usar só fgTabs (já existe):**

```js
// ANTES: const allTabs = [...PRODUCT_TYPES, ...fgTabs]
const allTabs = fgTabs
```

**Função `handleNewProductType()` linha 170-193 — EXPANDIR campos:**

```js
const [ntForm, setNtForm] = useState({ 
  name: '', product_code: '', volume_ml: '', default_oil_pct: '25',
  segment: 'MUSE',              // NOVO
  container_type: 'reed',        // NOVO
  is_candle: false,              // NOVO
  is_pure_oil: false,            // NOVO
  client_id: null,               // NOVO (pra MAJOR)
})

async function handleNewProductType() {
  // ... validações
  const res = await axios.post('/api/masters', {
    name, product_code, segment, client_id, volume_ml, default_oil_pct,
    container_type, is_candle, is_pure_oil,
    fragrance_ids: [],  // pode adicionar depois
    generate_variants: false  // pode gerar depois
  }, api())
  // ...
}
```

**Adicionar filter chips por segment:**

```jsx
<div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
  {['ALL', 'MUSE', 'STANDARD', 'MAJOR'].map(s => (
    <button key={s} onClick={() => setSegmentFilter(s)} ...>{s}</button>
  ))}
</div>
```

### 6.10. src/pages/ProductionOrders.jsx

**Linhas 11-19 — REMOVER PRODUCT_TYPES:**

```js
// REMOVER array hardcoded
// Adicionar state
const [productTypes, setProductTypes] = useState([])
useEffect(() => { 
  axios.get('/api/product-types', api()).then(r => setProductTypes(r.data))
}, [])
```

**CreateOrderModal — adicionar segment selector:**

```jsx
// 1. Segment selector (chips no topo do modal)
const [segment, setSegment] = useState('MUSE')

<div>
  Segment: 
  {['MUSE', 'STANDARD', 'MAJOR'].map(s => <chip />)}
</div>

// 2. Client field só aparece se segment != MUSE
{segment !== 'MUSE' && <ClientSelector segment={segment} />}

// 3. Master dropdown filtrado por segment (+ client_id se MAJOR)
const filteredMasters = productTypes.filter(pt => {
  if (pt.segment !== segment) return false
  if (segment === 'MAJOR' && pt.client_id !== selectedClient?.id) return false
  return true
})

// 4. Fragrance dropdown filtrado por master.available_fragrances
```

### 6.11. src/pages/ManufacturingQueue.jsx

**Linhas 10-14 — REMOVER PRODUCT_TYPE_LABELS:**

```js
// REMOVER hardcoded map
// USAR: line.fg_product_name (já vem do JOIN no server)

// ANTES: function ptLabel(line) { return line.fg_product_name || PRODUCT_TYPE_LABELS[line.product_type] || line.product_type }
function ptLabel(line) { return line.fg_product_name || line.product_type.replace(/_/g, ' ') }
```

### 6.12. src/pages/Dashboard.jsx

**Linhas 78-82 — REMOVER PRODUCT_TYPE_LABELS:**

```js
// REMOVER hardcoded map
function ptLabel(pt) { return pt.replace(/_/g, ' ') }
// (queries do dashboard já retornam names via JOIN onde precisa)
```

### 6.13. src/pages/PackingRecords.jsx

**Similar — REMOVER PRODUCT_TYPE_LABELS, usar fg_product_name do JOIN.**

### 6.14. src/pages/Clients.jsx

**Linhas 13-21 — LABEL_PRODUCT_TYPES dinâmico:**

```js
// REMOVER array hardcoded
const [labelProductTypes, setLabelProductTypes] = useState([])
useEffect(() => {
  axios.get('/api/product-types', api()).then(r => 
    setLabelProductTypes(r.data.map(pt => ({ value: pt.key, label: pt.label })))
  )
}, [])
```

**Adicionar tabs Standard | Major:**

```jsx
const [clientFilter, setClientFilter] = useState('ALL') // ALL | STANDARD | MAJOR
// filter chips no topo
```

### 6.15. src/pages/MuseStock.jsx

**Refatorar query pra mostrar variants:**

```js
async function load() {
  const res = await axios.get('/api/products', { 
    ...api(), 
    params: { category: 'FINISHED_GOOD', segment: 'MUSE' } 
  })
  // Filter variants only (master_product_id is set)
  setProducts(res.data.filter(p => p.master_product_id))
}
```

**UI mudanças:**
- Filter chips por master (carregados de masters list)
- Linha mostra: `{master.name} · {fragrance.name} · {stock} units · status`
- Sort: alphabetical por master then fragrance

### 6.16. NOVO: src/pages/MuseProducts.jsx

**Página completa pra gerenciar MUSE Masters.**

Conteúdo:
- Header: "MUSE Products" + botão "New Master"
- Filter chips: All / Reed / Spray / Candle / Oil (container_type)
- Lista de masters em cards (1 por master)
- Cada card mostra: nome, volume, default oil%, # fragrances, # variants, total stock
- Click → drawer/modal com:
  - Detalhe do master (editable)
  - BOM resumo (link pra BOM Builder)
  - Fragrances atribuídas + botão "+Add Fragrance"
  - Tabela de variants com stock por fragrance

Modal "New MUSE Master":
1. Container type chips
2. Name + product_code
3. Volume, default oil %
4. (Auto-set flags is_candle/is_pure_oil baseado em container)
5. BOM section (inline editor — adicionar components + quantities)
6. Fragrances multi-select chips
7. Generate variants checkbox (default ON)
8. Save → cria tudo

### 6.17. NOVO: src/pages/StandardCatalog.jsx

**Similar ao MuseProducts mas sem variants/fragrances.**

- Lista de Standard Masters
- "New Standard Master" → mesmo modal, sem fragrance picker (escolhe na order)
- Edit BOM inline

### 6.18. NOVO: src/pages/MajorClients.jsx

**Lista de Major Clients (clients com is_large_client=true).**

- Cards por cliente
- Click → navega pra `/major-clients/:id`

### 6.19. NOVO: src/pages/MajorClientDetail.jsx

**Drill-in detalhado por Major Client. Tabs:**

1. **Catalog tab:** masters desse cliente (mesmo pattern de MuseProducts)
2. **Client Stock tab:** componentes deles (já existe, reaproveita Clients.jsx logic)
3. **Custom Labels tab:** client_labels do cliente
4. **Awaiting Ship tab:** orders em status `completed` ou `ready_to_ship`, agrupadas por master+fragrance

### 6.20. NOVO: src/pages/Fragrances.jsx

**Página dedicada de fragrances (porque é o único recurso 100% compartilhado).**

- Lista de FRAGRANCE products
- Stock atual + reservations
- Filter chips: with low stock / in production / inactive
- Botão "New Fragrance" + edit per row
- Drill-in: ver onde está sendo usada (lista de masters MUSE/Standard/Major que usam essa fragrance)
- Histórico de oil_pct via fragrance_strength_log

### 6.21. src/App.jsx — rotas novas

```js
<Route path="/muse" component={MuseDashboard} />          // ou redireciona pra /
<Route path="/muse/products" component={MuseProducts} />
<Route path="/muse/stock" component={MuseStock} />         // renamed from /muse-stock
<Route path="/standard/clients" component={StandardClients} />  // Clients.jsx com filter
<Route path="/standard/catalog" component={StandardCatalog} />
<Route path="/standard/labels" component={CustomLabelsStock} />
<Route path="/major-clients" component={MajorClients} />
<Route path="/major-clients/:id" component={MajorClientDetail} />
<Route path="/fragrances" component={Fragrances} />
```

### 6.22. src/components/Layout.jsx — sidebar

**Refatorar NAV_ITEMS pra NAV_SECTIONS com headers:**

```js
const NAV_SECTIONS = [
  { items: [{ path: '/', label: 'Dashboard', icon: LayoutDashboard }] },
  { header: 'PRODUCTION', items: [...] },
  { header: 'INVENTORY', items: [...] },
  { header: 'MUSE', items: [...] },
  { header: 'STANDARD', items: [...] },
  { header: 'MAJOR CLIENTS', items: [...] },
  { header: 'HISTORY', items: [...] },
  { header: 'SYSTEM', items: [...] },
]
```

**Render:** map sections, cada section tem header text uppercase pequeno (12px, dim, letter-spacing), seguido pelos items. Sem ícones decorativos em section headers (só ícones nos items, mantém visual atual).

---

## 7. Fluxos de Usuário

### Fluxo 1: Criar MUSE Master + produzir + ver stock

**Passo a passo:**

1. **Cadastrar fragrances primeiro** (se não tiver)
   - Sidebar → INVENTORY → Fragrances → "New Fragrance"
   - Nome: "Santal Black", code: SANTAL_BLACK, unit: ml
   - Cadastra mais 9 fragrances similares

2. **Cadastrar components MUSE** (se não tiver)
   - Sidebar → INVENTORY → Stock Management → "New Product"
   - Categoria: COMPONENT, nome: "MUSE Bottle 200ml", code: MUSE_BOTTLE_200
   - Repete pra lid, packaging, etc.

3. **Criar MUSE Master**
   - Sidebar → MUSE → MUSE Products → "New Master"
   - Container type: Reed
   - Name: "Reed Diffuser 200ml MUSE"
   - Product code: REED_DIFFUSER_200ML_MUSE (auto-suggested)
   - Volume: 200, default oil%: 25
   - BOM section: add MUSE Bottle 200ml (qty 1), MUSE Lid (qty 1), Ethanol (formula: ethanol_pct), Fragrance (ratio auto)
   - Fragrances: pick "Santal Black" + 9 outras
   - Generate variants: ✓
   - Save → **10 variants criados automaticamente**

4. **Criar production order MUSE**
   - Sidebar → PRODUCTION → Production Orders → "New Order"
   - Segment: MUSE
   - (Client field oculto pra MUSE)
   - Add line: master = "Reed Diffuser 200ml MUSE", fragrance = "Santal Black", qty = 10
   - Save → order criada

5. **Produzir**
   - Sidebar → Manufacturing Queue
   - Order aparece com badge "MUSE"
   - Start Production → Complete → status `fulfilled` (auto)
   - Toast: "10 units added to Reed Diffuser 200ml MUSE × Santal Black"

6. **Ver stock**
   - Sidebar → MUSE → MUSE Stock
   - Vê variant "Reed Diffuser 200ml MUSE × Santal Black: 10 units IN STOCK"

### Fluxo 2: Criar Standard Master + order pra cliente

1. **Cadastrar Standard Master**
   - Sidebar → STANDARD → Standard Catalog → "New Master"
   - Name: "Reed Diffuser 200ml Clean Skin"
   - Code: REED_DIFFUSER_200ML_CLEAN_SKIN
   - BOM: Clean Skin Bottle 200ml, generic lid, ethanol, fragrance
   - **Sem fragrance picker** (Standard escolhe na order)
   - Save

2. **Cadastrar cliente Standard**
   - Sidebar → STANDARD → Standard Clients → "New Client"
   - Name: "Acme Co", is_large_client: false (auto)
   - Add label customizada (opcional)

3. **Criar order Standard**
   - Production Orders → New Order
   - Segment: STANDARD
   - Client: Acme Co
   - Add line: master = "Reed Diffuser 200ml Clean Skin", fragrance = "Vanilla Oud" (qualquer fragrance), label = Acme custom (opcional), qty = 100
   - Save

4. **Produzir**
   - Manufacturing Queue → Start → Complete
   - Status: `completed` (NÃO auto-fulfill)
   - **Não cria variant** (Standard sem stock)

5. **Ship**
   - Production Orders → encontra a order → "Ready to Ship" → "Fulfilled"

### Fluxo 3: Major Client COCO Republic

1. **Cadastrar COCO como Major**
   - Standard Clients page → tab "Major" → "New Major Client"
   - Name: "COCO Republic", is_large_client: true

2. **COCO envia components da China**
   - Major Clients → COCO Republic → Client Stock tab
   - Add: "COCO Bottle 200ml", qty 5000
   - Add: "COCO Lid", qty 5000

3. **Cadastrar Master pra COCO**
   - Major Clients → COCO Republic → Catalog tab → "New Master"
   - Name: "Reed Diffuser 200ml COCO Republic"
   - Code: REED_DIFFUSER_200ML_COCO
   - Volume: 200, default oil%: 25
   - BOM: COCO Bottle (from client_stock), COCO Lid (from client_stock), ethanol (geral), fragrance
   - Fragrances disponíveis: Santal Black + Vanilla Oud (multi-pick)
   - Save

4. **Criar order pra COCO**
   - Production Orders → New Order
   - Segment: MAJOR
   - Client: COCO Republic
   - Master: "Reed Diffuser 200ml COCO Republic" (filtrado)
   - Fragrance: "Santal Black"
   - Qty: 1000
   - Save

5. **Produzir**
   - Manufacturing Queue → Start → Complete
   - Status: `completed` (aguardando OK do cliente)
   - **Não cria variant**

6. **Ver "stock" do COCO**
   - Major Clients → COCO Republic → "Awaiting Ship" tab
   - Mostra: "1000× Reed Diffuser 200ml COCO Republic × Santal Black — Order SM-XXX — Produced 2026-05-14"

7. **Cliente OK → ship**
   - Production Orders → SM-XXX → "Ready to Ship" → "Fulfilled"

### Fluxo 4: Reservation Priority (Major desloca MUSE)

**Cenário:**
- Stock Santal Black: 8 kg total
- MUSE order existente reservou 5 kg (status='reserved', priority='normal')
- Disponível: 3 kg

**Major Client tenta criar order que precisa 6 kg:**

1. Order Major criada → ao salvar, tenta criar reservation de 6 kg
2. Sistema detecta: 6 > 3 disponível, mas há reservation 'normal' que poderia ser deslocada
3. **Modal aparece:**
   ```
   Stock insuficiente disponível
   ─────────────────────────────────
   Necessário:  6 kg Santal Black
   Disponível:  3 kg
   Em uso:      5 kg (reservation 'normal')
   
   Como Major Client tem prioridade, esta order pode 
   deslocar reservations existentes:
   
   ⚠ Order SM-XXX (MUSE, Reed 200ml + Santal Black, 10 units)
     Será reduzida em 3 kg → produção MUSE bloqueada até 
     re-supply.
   
   [Cancel]  [Displace MUSE reservation and proceed]
   ```
4. Confirma → MUSE reservation reduzida (status='partially_displaced'), Major reserva 6 kg, audit log entry
5. MUSE order ficará pending até ethanol be refilled OU manual cancel

---

## 8. Páginas e UI

### 8.1. MuseProducts (NOVA)

```
┌─────────────────────────────────────────────────────────────────────┐
│ MUSE Products                                    [+ New MUSE Master] │
│ Cadastre seus produtos finais MUSE com BOM e variantes               │
├─────────────────────────────────────────────────────────────────────┤
│ Filters: [All] [Reed] [Spray] [Candle] [Oil]                        │
├─────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────┐  ┌──────────────────────────┐│
│ │ Reed Diffuser 200ml MUSE           │  │ Room Spray 50ml MUSE     ││
│ │ Code: REED_DIFFUSER_200ML_MUSE     │  │ Code: ROOM_SPRAY_50ML... ││
│ │ Volume: 200ml · Oil: 25%           │  │ Volume: 50ml · Oil: 25%  ││
│ │ Components: 4 │ Fragrances: 10     │  │ Components: 5 │ Frag: 8  ││
│ │ Variants: 10 │ Total stock: 47     │  │ Variants: 8 │ Stock: 23  ││
│ │ [View detail]                       │  │ [View detail]            ││
│ └────────────────────────────────────┘  └──────────────────────────┘│
│                                                                       │
│ ┌────────────────────────────────────┐                              │
│ │ Candle 240G MUSE                   │                              │
│ │ Code: CANDLE_240G_MUSE             │                              │
│ │ Volume: 240g · Oil: 12% · 🔥 Candle │                              │
│ │ ...                                 │                              │
│ └────────────────────────────────────┘                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2. Master Detail Drawer

```
┌─────────────────────────────────────────────────────────────────────┐
│ Reed Diffuser 200ml MUSE                              [X]            │
│ ─────────────────────────────────────────────────────────────────── │
│ Product code: REED_DIFFUSER_200ML_MUSE  [Edit]                       │
│ Container: Reed │ Volume: 200ml │ Default oil: 25%                   │
│                                                                       │
│ BOM (4 components)                              [Edit in BOM Builder]│
│ • MUSE Bottle 200ml × 1                                              │
│ • MUSE Lid × 1                                                       │
│ • Ethanol (formula: ethanol_pct)                                     │
│ • Fragrance (selected per line)                                      │
│                                                                       │
│ Fragrances (10)                                  [+ Add Fragrance]   │
│ [Santal Black ✕] [Vanilla Oud ✕] [Tobacco ✕] ...                    │
│                                                                       │
│ Variants (10)                                                         │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Fragrance       │ Code              │ Stock │ Status │ Actions  │ │
│ │ Santal Black    │ ...-SANTAL_BLACK  │ 10    │ ✓ IN   │ Add Rem  │ │
│ │ Vanilla Oud     │ ...-VANILLA_OUD   │ 5     │ ⚠ LOW  │ Add Rem  │ │
│ │ Tobacco         │ ...-TOBACCO       │ 0     │ ✕ OUT  │ Add Rem  │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.3. MajorClientDetail (NOVA)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Back to Major Clients                                              │
│                                                                       │
│ COCO Republic                                          [Edit client] │
│ Premium B2B · China components · Custom branding                     │
│ ─────────────────────────────────────────────────────────────────── │
│ [Catalog (3)] [Client Stock (12)] [Custom Labels (5)] [Awaiting Ship (4)] │
│                                                                       │
│ === Catalog Tab ===                                                  │
│ [+ New Master for COCO]                                              │
│ ┌────────────────────────────────────┐                              │
│ │ Reed Diffuser 200ml COCO Republic  │                              │
│ │ Components: 4 (3 from client_stock)│                              │
│ │ Fragrances: 2 │ Orders: 8 active   │                              │
│ │ [View detail]                       │                              │
│ └────────────────────────────────────┘                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.4. Awaiting Ship tab (Major Client Detail)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Stock Awaiting Ship — COCO Republic                                  │
│                                                                       │
│ Grouped by product:                                                  │
│                                                                       │
│ Reed Diffuser 200ml COCO Republic × Santal Black                     │
│ ├─ Order SM-045 · 1000 units · Produced 2026-05-10 · 🔵 completed   │
│ └─ Order SM-052 · 500 units · Produced 2026-05-13 · 🟢 ready_to_ship│
│                                Subtotal: 1500 units                  │
│                                                                       │
│ Reed Diffuser 200ml COCO Republic × Vanilla Oud                      │
│ └─ Order SM-051 · 800 units · Produced 2026-05-12 · 🔵 completed    │
│                                Subtotal: 800 units                   │
│                                                                       │
│ Total: 2300 units across 3 orders                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.5. ProductionOrders Create Modal — atualizado

```
┌──────────────────────────────────────────────────────────────────┐
│ New Production Order                                       [X]    │
│ ──────────────────────────────────────────────────────────────── │
│ Segment: [● MUSE]  [○ STANDARD]  [○ MAJOR]                       │
│                                                                    │
│ (Client field hidden for MUSE)                                    │
│                                                                    │
│ Lines:                                                            │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Master:    [Reed Diffuser 200ml MUSE ▾] (only MUSE masters) │ │
│ │ Fragrance: [Santal Black ▾] (only this master's fragrances) │ │
│ │ Quantity:  [10]                                              │ │
│ │ Oil %:     [25] (default from master, editable)              │ │
│ │ Need labeling? [✓]  Need packing? [✓]                        │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ [+ Add another line]                                              │
│                                                                    │
│ Due date: [____]   Notes: [_______________]                       │
│                                                                    │
│                                          [Cancel]  [Create order] │
└──────────────────────────────────────────────────────────────────┘
```

---

## 9. APIs (Endpoints)

### Lista completa de endpoints novos/alterados

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/product-types` | NOVO — substitui PRODUCT_TYPES hardcoded |
| GET | `/api/masters?segment=X&client_id=Y` | NOVO — lista masters filtrados |
| GET | `/api/masters/:id` | NOVO — detalhe completo |
| POST | `/api/masters` | NOVO — cria master + variants |
| PUT | `/api/masters/:id` | NOVO — atualiza master |
| DELETE | `/api/masters/:id` | NOVO — soft delete |
| POST | `/api/masters/:id/fragrances` | NOVO — adiciona fragrance |
| DELETE | `/api/masters/:id/fragrances/:fragId` | NOVO — remove fragrance |
| GET | `/api/major-clients/:id/masters` | NOVO — catálogo do Major |
| GET | `/api/major-clients/:id/stock-summary` | NOVO — stock awaiting ship |
| POST | `/api/reservations/check-displacement` | NOVO — validação de displacement |
| GET | `/api/products` | EXISTENTE — adicionar filtro `segment` |
| POST | `/api/products` | EXISTENTE — aceitar segment, is_master, master_product_id, fragrance_id |
| GET | `/api/manufacturing/queue` | EXISTENTE — adicionar segment no response |
| POST | `/api/manufacturing/:id/complete` | EXISTENTE — lógica de 3 segmentos |

### Exemplos de Request/Response

**POST /api/masters (criar MUSE Master):**

```json
// Request
{
  "name": "Reed Diffuser 200ml MUSE",
  "product_code": "REED_DIFFUSER_200ML_MUSE",
  "segment": "MUSE",
  "client_id": null,
  "volume_ml": 200,
  "default_oil_pct": 25,
  "container_type": "reed",
  "is_candle": false,
  "is_pure_oil": false,
  "bom_components": [
    { "component_product_id": 42, "quantity_per_unit": 1, "quantity_formula": "fixed", "component_group": "core" },
    { "component_product_id": 43, "quantity_per_unit": 1, "quantity_formula": "fixed", "component_group": "core" },
    { "component_product_id": 12, "quantity_per_unit": 1, "quantity_formula": "ethanol_pct", "component_group": "core" }
  ],
  "fragrance_ids": [101, 102, 103, 104, 105, 106, 107, 108, 109, 110],
  "generate_variants": true
}

// Response
{
  "master": {
    "id": 200,
    "product_code": "REED_DIFFUSER_200ML_MUSE",
    "name": "Reed Diffuser 200ml MUSE",
    "segment": "MUSE",
    "is_master": true,
    ...
  },
  "variants_created": 10,
  "bom_entries_created": 3,
  "fragrances_linked": 10
}
```

**POST /api/reservations/check-displacement:**

```json
// Request
{
  "product_id": 12,  // Santal Black fragrance
  "quantity_required": 6000,
  "priority": "high"
}

// Response (caso de displacement)
{
  "can_reserve": true,
  "current_stock": 8000,
  "currently_reserved": 5000,
  "currently_available": 3000,
  "needs_displacement": true,
  "would_displace": [
    {
      "reservation_id": 88,
      "order_number": "SM-XXX",
      "order_id": 45,
      "client_name": null,
      "segment": "MUSE",
      "quantity_to_displace": 3000,
      "remaining_after": 2000
    }
  ]
}
```

---

## 10. Reservation Priority (Major Wins)

### Regra de negócio

- Major Client orders → reservation `priority='high'`
- MUSE e Standard → `priority='normal'`
- Em caso de conflito (insufficient stock):
  - `high` pode deslocar `normal` (com confirmação UI)
  - `normal` NÃO pode deslocar `high`
  - `normal` vs `normal`: first-come-first-served (atual)

### Implementação

**Quando criar reservation:**

```js
// server/routes/production-orders.js (criar order)
async function createReservations(orderId) {
  // Determinar priority
  const order = await query(`SELECT po.client_id, c.is_large_client FROM production_orders po LEFT JOIN clients c ON po.client_id = c.id WHERE po.id = $1`, [orderId])
  const priority = order.rows[0]?.is_large_client ? 'high' : 'normal'
  
  // ... insert com priority
}
```

**Endpoint de displacement check** (ver seção 9).

**UI no frontend:**
- Antes de salvar order Major, chama `/api/reservations/check-displacement` pra cada componente
- Se algum tem `needs_displacement: true`, mostra modal de confirmação
- Após confirmação, salva order normalmente
- Backend processa displacement atomicamente em transaction

**Audit log:**
```
{
  action: 'reservation_displaced',
  entity_type: 'production_order',
  entity_id: 45,
  details: {
    displaced_by_order: 'SM-XXX-MAJOR',
    quantity_displaced: 3000,
    product_id: 12,
    reason: 'Major Client priority'
  }
}
```

---

## 11. Riscos e Mitigações

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|---------------|---------|-----------|
| 1 | Production order antigo referencia type sem master cadastrado | Alta (banco vazio) | Médio | Frontend usa graceful fallback exibindo product_type string; clean slate evita issue |
| 2 | Variant existe mas master deletado | Baixa | Médio | ON DELETE SET NULL preserva variant; UI flagga como "orphan" |
| 3 | Mudar segment de master existente | Média | Alto | Bloqueado em UI se master tem variants ou orders associadas |
| 4 | Reservation displacement causa MUSE order "unfulfillable" | Média | Médio | UI mostra warning ANTES; notificação no Dashboard MUSE alertando |
| 5 | Fragrance deletada que tem variant com stock | Baixa | Alto | DELETE bloqueado se há variants/stock; só permite "obsolete" flag |
| 6 | Renomear master quebra orders | Baixa | Alto | product_code é a chave; rename só do `name` é safe; product_code immutable se há orders |
| 7 | Bug no auto-create de variant | Alta (novo código) | Médio | Tests manuais cobrem; rollback simples (delete variant criado) |
| 8 | Shopify draft order title quebrado | Baixa | Baixo | Fallback pra product_type string se master.name not found |
| 9 | Major Client master cadastrado mas client_stock vazio | Média | Médio | UI validação: BOM não pode referenciar client_stock vazio; preview mostra missing components |
| 10 | Reservation displacement em production order já 'in_production' | Baixa | Alto | Displacement só permitido em reservations status='reserved'; 'consumed' não pode ser deslocada |
| 11 | Race condition em variant auto-create (2 orders simultâneas) | Baixa | Médio | UNIQUE constraint em (master_product_id, fragrance_id) + ON CONFLICT DO NOTHING |
| 12 | Migration roda em banco com dados antigos não-clean | Baixa | Alto | Plano: clean slate. Se houver dados, manual review antes de migration |

---

## 12. Plano de Testes Manuais

Após implementação completa, executar em ordem:

### Bloco A — Schema/Foundation

- [ ] **T1:** Servidor inicia sem erros; migrations rodam
- [ ] **T2:** Tabela `muse_master_fragrances` existe; colunas novas em products visíveis
- [ ] **T3:** Tabela `bom_rules` não tem mais seed automático ao iniciar empty

### Bloco B — Master Creation

- [ ] **T4:** Criar Fragrance "Santal Black" via Fragrances page
- [ ] **T5:** Criar Component "MUSE Bottle 200ml"
- [ ] **T6:** Criar MUSE Master "Reed Diffuser 200ml MUSE" com 3 fragrances → ver 3 variants criados
- [ ] **T7:** Editar BOM do master via BOM Builder → save → ver mudança refletida
- [ ] **T8:** Adicionar 4ª fragrance ao master → ver novo variant criado
- [ ] **T9:** Remover uma fragrance → variant marcado obsolete (não deletado)

### Bloco C — Standard Catalog

- [ ] **T10:** Criar Standard Master "Reed Diffuser 200ml Clean Skin" → SEM fragrance picker
- [ ] **T11:** BOM Builder lista ambos masters (MUSE + Standard) filtrável por segment

### Bloco D — Major Client

- [ ] **T12:** Criar cliente "COCO Republic" como Major
- [ ] **T13:** Adicionar client_stock pra COCO (bottles, lids)
- [ ] **T14:** Criar Major Master "Reed Diffuser 200ml COCO" usando client_stock components
- [ ] **T15:** Drill-in `/major-clients/:id` mostra tabs: Catalog, Client Stock, Labels, Awaiting Ship

### Bloco E — Production Orders

- [ ] **T16:** Criar MUSE order → segment selector funciona → master/fragrance filtrados
- [ ] **T17:** Complete MUSE order → variant Reed × Santal Black +10 stock; status `fulfilled`
- [ ] **T18:** MUSE Stock page mostra variant com stock atualizado
- [ ] **T19:** Criar Standard order pra Acme Co → complete → status `completed` (no variant)
- [ ] **T20:** Criar Major order pra COCO → complete → status `completed` (no variant) → vê em Awaiting Ship

### Bloco F — Reservation Priority

- [ ] **T21:** Setup: stock Santal Black 8kg, MUSE reserva 5kg
- [ ] **T22:** Major Client tenta order 6kg → modal de displacement aparece
- [ ] **T23:** Confirma → MUSE reservation reduzida; Major reserva ok; audit log entry visível

### Bloco G — Edge Cases

- [ ] **T24:** Sidebar reorganizado com sections (sem ícones decorativos nos headers)
- [ ] **T25:** Manufacturing Queue mostra badges segment corretos
- [ ] **T26:** Dashboard MUSE widget mostra contagem correta
- [ ] **T27:** Auto-create variant: order MUSE pra fragrance que master não tem ainda — sistema NÃO cria variant órfã, mostra erro claro
- [ ] **T28:** Shopify draft order (se configurado): título correto com master name

---

## 13. Plano de Execução

### Recomendação: 2 sessões

**Sessão 1 (~90min):**
- Bloco A — Schema + Server core (~40min)
- Bloco B — APIs novas (~20min)
- Bloco C — Refactor páginas existentes (~30min)

Entregável: tudo refatorado, sem páginas novas ainda. Funciona em modo "compatibilidade" — fluxos atuais não quebram, mas sem nova UI MUSE/Standard/Major.

**Sessão 2 (~50min):**
- Bloco D — Páginas novas (~35min)
- Bloco E — Sidebar + polish + reservation UI (~15min)

Entregável: sistema completo conforme plano.

### Sessão única (~140min) — alternativa

Se preferir tudo de uma vez. Mais arriscado (mais código sem teste intermediário), mais rápido (sem context-switch).

---

## 14. Questões Pendentes / Pontos de Confirmação

**Antes de codar, preciso confirmação em:**

### Q1: Custom Label leftover stock
Hoje `client_labels.quantity` trackeia leftover. Quando production order MUSE/Standard/Major consome labels e sobra: a quantidade é incrementada em `client_labels` se for label custom do cliente.

**Confirma que este comportamento atual está correto e não precisa mudar?** Ou quer melhorar visibilidade (página dedicada `/standard/labels` mostrando leftovers por cliente)?

### Q2: MUSE Dashboard — conteúdo
Sidebar tem `/muse` (MUSE Dashboard). O que mostrar nessa página?

**Opções:**
- (a) Apenas redirect pra `/` (dashboard principal) — descartar a página
- (b) Widgets MUSE-specific: top sellers, low stock variants, production in progress, ready to ship, fragrance usage trends
- (c) Página simples com 4-5 stats principais

**Minha recomendação:** (b) ou (c). Decida.

### Q3: Standard Clients view
Página `/standard/clients` será **clone filtrado** do Clients.jsx atual (mostrar só is_large_client=false), ou prefere uma página separada totalmente nova?

**Minha recomendação:** filter no Clients.jsx existente, com tabs Standard/Major. Menos código duplicado.

### Q4: Migração de dados pré-existentes
Você falou que prefere clean slate. **Confirma:** posso fazer migration que DELETA dados de exemplo antigos (TRAVEL_SPRAY_10ML etc. se existirem no banco)?

**Alternativa:** mantém dados antigos mas marca como `archived=true` pra não atrapalhar UI.

### Q5: Production Order line — override de oil_pct?
Atualmente cada line tem `oil_pct` editável (default 25%). **Manter** o campo (flexibilidade) ou **bloquear** (sempre usa default do master)?

**Minha recomendação:** manter (flexibilidade vale a pena).

### Q6: Reservation displacement — UI confirmation level
Quando Major Client desloca MUSE reservation:
- (a) Modal de confirmação obrigatório com detalhes do que será deslocado
- (b) Auto-displacement silencioso, só audit log
- (c) Email notification pro dono da MUSE order deslocada

**Minha recomendação:** (a) obrigatório. Segurança.

### Q7: Permissões por segmento
Hoje todos os roles (root/admin/user) veem tudo. **Quer adicionar role granular** tipo "MUSE manager" que só vê MUSE pages?

**Minha recomendação:** não agora. Adicionar depois se precisar.

### Q8: Container types — lista fechada ou aberta?
Container_type: 'reed' | 'spray' | 'candle' | 'oil' | 'other'

**Quer adicionar mais opções já?** (lotion, perfume, body wash, etc.) Ou começa minimal e expande quando precisar?

**Minha recomendação:** começar com 5 (reed/spray/candle/oil/other), expandir quando necessário.

### Q9: Volume/oil_pct units
Mantém `ml` pra volume e `%` pra oil. **Confirma?** Ou precisa suportar `g`/`oz` pra candles ou outros?

**Minha recomendação:** ml e %. Candle 240G já é nome do produto, mas volume_ml pode ser 240 representando o jar volume.

### Q10: Aprovação final do sidebar
Ver seção 3 — sidebar final proposto. **Aprovado** assim ou ajustar?

---

## 15. Pontos de Atenção Pessoais (Claude)

### Onde tenho certeza alta

- ✅ Schema changes são aditivas, baixo risco
- ✅ Existing flows (manufacturing queue, packing) preservados
- ✅ BOMViewer já tem fundação dinâmica
- ✅ Master+Variant model é padrão (Shopify-like)
- ✅ Reservation priority lógica é contida e testável

### Onde tenho dúvidas / preciso atenção extra

- ⚠️ **Reservation displacement transaction safety** — preciso garantir atomicidade. Se duas orders Major chegam simultaneamente e ambas tentam deslocar a mesma MUSE reservation, lock pessimista necessário. Vou implementar com `SELECT ... FOR UPDATE` na reservation antes de modificar.

- ⚠️ **Auto-create variant race condition** — UNIQUE constraint em (master_product_id, fragrance_id) deve prevenir, mas preciso garantir ON CONFLICT DO NOTHING + retry no select.

- ⚠️ **Backfill de orders antigas** — se houver orders com product_type='TRAVEL_SPRAY_10ML' mas não há master cadastrado, a página de Manufacturing Queue vai exibir só "TRAVEL_SPRAY_10ML" (sem nome bonito). Confirma se está OK ou prefere backfill automático (criar masters dummy)?

- ⚠️ **MUSE auto-fulfill em sequência multi-line** — order com 3 lines (Reed Santal + Reed Vanilla + Room Spray Santal). Todos vão pra variants distintos. Lógica deve iterar corretamente. Vou testar manualmente.

- ⚠️ **Fragrance shared entre segments** — fragrance é compartilhado, mas vinculação master↔fragrance é por junction table. Se mesma fragrance é usada em MUSE master e em Major master, OK — duas entradas em duas junction tables. Sem conflito.

- ⚠️ **client_product_bom legacy** — tabela existe pro fluxo antigo de "Major Client BOM override". Com B1 (cada Major tem master próprio), essa tabela vira legacy. **Preciso confirmar com você se posso desativar/ignorar.**

- ⚠️ **PackingRecords UI** — não revisei a fundo, pode precisar tweaks pra mostrar segment corretamente.

### Riscos que estou monitorando

- **Frontend bundle size** — 5 páginas novas + componentes. Tudo é code-split via Wouter routes? Verificar.

- **Initial load performance** — `/api/product-types` é chamado em várias páginas. Considerar cache no React state ou em SessionStorage.

- **Mobile responsiveness** — drawer designs precisam funcionar mobile. Vou usar mesma pattern dos modals existentes.

### O que eu NÃO vou fazer (escopo)

- ❌ Shopify SKU mapping pra MUSE variants (futuro)
- ❌ Permissions per segment (futuro)
- ❌ Returns workflow segmented (futuro)
- ❌ Reporting dashboards cross-segment (futuro)
- ❌ Bulk operations em masters (futuro)
- ❌ API público (não é escopo)

---

## CONCLUSÃO

Esse refactor é grande mas **arquiteturalmente contido**:
- Schema additivo (sem destrutivo em produção)
- Lógica de 3 segmentos é encapsulada no `manufacturing.js` complete handler
- Frontend reaproveita patterns existentes (modals, drawer, search-select)
- Endpoints novos são RESTful e seguem convenções existentes

**Resultado esperado:**
- Sistema 100% database-driven
- 3 segmentos visualmente e logicamente separados
- Cadastro de novos produtos sem mexer em código
- Stock tracking inteligente (variants pra MUSE, status pra Major)
- Major Client priority em reservation conflict
- BOM unificado com filter por segment

**Próximo passo após você revisar este relatório:**
1. Responder Q1-Q10 acima
2. Confirmar plano de execução (sessão única vs 2 sessões)
3. Dar GO → começo Bloco A imediatamente

---

**Fim do relatório.** Total: ~14k palavras, cobrindo arquitetura completa, function-by-function changes, fluxos de usuário, APIs, riscos, testes, e questões pendentes.

Tempo de leitura estimado: 25-30 minutos.
