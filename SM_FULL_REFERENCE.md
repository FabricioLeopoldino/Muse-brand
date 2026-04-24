# Scented Merchandise (SM) — Full Reference Document
*Criado: 15/04/2026 | Última actualização: 16/04/2026*
*Abreviação oficial do sistema: SM*

---

## 1. VISÃO GERAL

**Scented Merchandise (SM)** é uma plataforma de gestão de inventário e produção para o negócio de brand extension da Scent Australia. Controla stock de componentes, fragrâncias, fórmulas e labels, gere ordens de produção e integra com o Shopify.

**O SM é a fonte de verdade para stock e produção. O Shopify cuida do comercial (pagamento, envio). Cada sistema faz o que sabe fazer melhor.**

### Core Principles
- Production-first: toda saída de stock é gerada por uma Production Order
- Shopify como centro comercial: confirmação de pagamento acontece no Shopify
- SM reage ao Shopify via webhook `orders/paid` → reserva stock → entra na fila de produção
- Reserva de stock separada de consumo — stock só é consumido quando produção inicia
- BOM editável antes de confirmar — flexibilidade com rastreabilidade
- Oil % configurável por order (default 25%, alterável por pedido do cliente)
- Ready Formula: sobras reutilizáveis, sem vínculo com produto específico
- Labels: stock por cliente, versionadas por artwork, com histórico
- Fragrance strength log: rastreia % real usada vs % padrão ao longo do tempo

---

## 2. TECH STACK

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18.2, Vite 5.0, Wouter 3.0, Lucide React |
| Backend | Node.js 18+, Express 4.18 — monolito em `server/index.js` |
| Database | PostgreSQL via Neon (serverless cloud) |
| Auth | bcryptjs |
| Excel Export | SheetJS (xlsx) |
| Shopify | Admin API 2025-01 (Grow plan — API access completa) |
| Deploy | Render |
| Barcode | Barcode scanning via browser (input handler) |

---

## 3. ARQUITECTURA

```
CLIENTE PEDE
    ↓
SM cria Production Order + Draft Order no Shopify
(send_receipt: false, send_invoice: false — sem email ao cliente)
    ↓
Equipe trabalha no SHOPIFY: revisa, ajusta preço, confirma pagamento
    ↓
Shopify dispara webhook: orders/paid
    ↓
SM recebe webhook → reserva stock → order entra na fila de produção
    ↓
Equipe produz no SM: consome stock, regista etapas, finaliza
    ↓
SM marca order como fulfilled no Shopify
```

---

## 4. ESTRUTURA DE FICHEIROS

```
scented-merchandise/
├── server/
│   ├── index.js                      ← todo o backend
│   └── migrations/
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx             ← Watchlist + Active Orders + Candle/Label Tracker
│   │   ├── ProductionOrders.jsx      ← criar e gerir ordens
│   │   ├── ManufacturingQueue.jsx    ← fila de produção + execução
│   │   ├── Products.jsx              ← CRUD produtos
│   │   ├── StockManagement.jsx       ← stock view + adjust + bin location
│   │   ├── BOMViewer.jsx             ← regras de BOM por product type
│   │   ├── Clients.jsx               ← clientes + large client + labels
│   │   ├── IncomingOrders.jsx        ← POs de restock
│   │   ├── Returns.jsx               ← devoluções
│   │   ├── TransactionHistory.jsx    ← histórico com filtros e export
│   │   ├── BarcodeScanner.jsx        ← entrada de stock via barcode
│   │   ├── ActivityLog.jsx           ← log de todas as ações
│   │   └── UserManagement.jsx        ← gestão de utilizadores (root only)
│   ├── components/
│   │   ├── BinLocationInput.jsx
│   │   ├── Toast.jsx
│   │   └── ConfirmModal.jsx
│   ├── utils/
│   │   ├── excelExport.js
│   │   └── unitConversion.js
│   └── App.jsx
├── package.json
└── vite.config.js
```

---

## 5. DESIGN SYSTEM

*(Idêntico ao ScentSystem)*

### Tema
- Dark theme — fundo: `#0e0e1a`, cards: `rgba(255,255,255,0.04–0.07)`
- Fonte títulos: **Archivo Black** (Google Fonts)
- Texto principal: `#e8eaf2` / `#cbd5e1`
- Texto secundário: `rgba(232,234,242,0.45)`

### Paleta de Cores
| Uso | Cor |
|-----|-----|
| Primário / ações | `#2563eb` |
| Stock OK / sucesso | `#22c55e` / `#4ade80` |
| Atenção / warning | `#f59e0b` / `#fbbf24` |
| Crítico / erro | `#dc2626` / `#f87171` |
| Large Client | `#a78bfa` |
| Shopify / sync | `#60a5fa` |
| Production active | `#f472b6` |
| ETA / datas | `#10b981` |
| Ready Formula | `#fb923c` |
| Labels | `#e879f9` |

---

## 6. DATABASE SCHEMA

```sql
-- ─────────────────────────────────────────
-- PRODUTOS (stock geral)
-- ─────────────────────────────────────────
products (
  id, name, product_code, category, sub_category,
  unit, current_stock, min_stock_level,
  supplier, supplier_id, supplier_code,
  bin_location, barcode,
  shopify_variant_id,
  lead_time, created_at
)
-- Categories:
--   FRAGRANCE      → sem barcode, ml
--   RAW_MATERIALS  → com barcode, ml ou units
--   COMPONENTS     → com barcode, units
--   FINISHED_GOODS → com barcode, units
--   READY_FORMULA  → sem barcode, ml

-- ─────────────────────────────────────────
-- CLIENTES
-- ─────────────────────────────────────────
clients (
  id, shopify_customer_id,
  name, email, phone, address,
  is_large_client BOOLEAN DEFAULT false,
  notes, created_at
)

-- Labels por cliente (stock reservado, artwork versionada)
client_labels (
  id, client_id,
  label_name,           -- "Clean Skin Black — Travel Spray 10ml"
  artwork_version,      -- v1, v2... ou data de aprovação
  supplier,             -- Print Express, etc.
  quantity,
  is_obsolete BOOLEAN DEFAULT false,
  notes,
  created_at
)

client_label_transactions (
  id, client_label_id, client_id,
  type,                 -- received | used | written_off
  quantity,
  production_order_id,
  notes, user_id, created_at
)

-- ─────────────────────────────────────────
-- PRODUCTION ORDERS
-- ─────────────────────────────────────────
production_orders (
  id, order_number,               -- SM-001, SM-002...
  shopify_draft_order_id,
  shopify_order_number,           -- #34050
  client_id,
  order_type,                     -- STANDARD | LARGE_CLIENT
  due_date DATE,
  status,
  -- draft | confirmed | queued | in_production
  -- waiting_external | completed | ready_to_ship | fulfilled | cancelled
  notes,
  created_by, created_at
)

-- Line items da Production Order
production_order_lines (
  id, production_order_id,
  line_number,
  product_type,
  -- TRAVEL_SPRAY_10ML | ROOM_SPRAY_50ML | ROOM_SPRAY_100ML
  -- REED_DIFFUSER_200ML | MICRO_OIL_15ML | CANDLE_240G | CANDLE_400G
  fragrance_id,
  oil_pct DECIMAL DEFAULT 25.0,   -- % de oil (default 25, editável)
  packaging_component_id,         -- NULL = sem packaging
  label_client_label_id,          -- NULL = sem label
  quantity,
  unit_price DECIMAL DEFAULT 0,   -- sempre 0 na criação, editável ao confirmar
  -- Campos de candle:
  is_candle BOOLEAN DEFAULT false,
  candle_status,
  -- pending_filling | sent_for_filling | received_from_filling | completed
  sent_for_filling_at TIMESTAMP,
  filling_supplier TEXT,
  received_from_filling_at TIMESTAMP,
  fulfill_from_stock BOOLEAN DEFAULT false,
  -- Labels:
  labels_required BOOLEAN DEFAULT false,
  labels_ordered_at TIMESTAMP,
  labels_supplier TEXT,
  labels_eta DATE,
  labels_received BOOLEAN DEFAULT false,
  labels_received_at TIMESTAMP,
  -- Status da linha:
  line_status,
  -- pending | assembly_complete | waiting_labels | waiting_filling
  -- labeling_complete | completed | cancelled
  line_started_at TIMESTAMP,
  line_completed_at TIMESTAMP
)

-- BOM usado em cada line item (editável antes de confirmar)
production_order_components (
  id, production_order_line_id, production_order_id,
  product_id, product_code, product_name,
  source,               -- general_stock | client_stock | ready_formula
  quantity_required,
  quantity_debited,
  unit,
  was_overridden BOOLEAN DEFAULT false,  -- foi editado vs BOM padrão
  override_reason TEXT
)

-- ─────────────────────────────────────────
-- RESERVAS DE STOCK
-- ─────────────────────────────────────────
stock_reservations (
  id, production_order_id, production_order_line_id,
  product_id, product_code,
  source,               -- general_stock | client_stock | ready_formula | client_label
  quantity_reserved,
  quantity_consumed,
  status,               -- reserved | consumed | released
  created_at
)

-- ─────────────────────────────────────────
-- PRODUCTION JOBS (execução + time tracking)
-- ─────────────────────────────────────────
production_jobs (
  id, production_order_id,
  started_at, completed_at,
  started_by,
  status,               -- in_production | waiting_external | completed
  external_type,        -- filling | labels | other
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
  created_at
)

-- ─────────────────────────────────────────
-- FRAGRANCE STRENGTH LOG
-- ─────────────────────────────────────────
fragrance_strength_log (
  id, fragrance_id, fragrance_name,
  production_order_id,
  standard_pct DECIMAL,    -- 25.0
  actual_pct_used DECIMAL, -- ex: 28.0
  was_adjusted BOOLEAN,
  adjustment_reason TEXT,
  batch_reference TEXT,
  date_used DATE,
  created_by, created_at
)

-- ─────────────────────────────────────────
-- STOCK RESERVADO — LARGE CLIENTS
-- ─────────────────────────────────────────
client_stock (
  id, client_id,
  product_code, product_name,
  category,              -- COMPONENT | FINISHED_GOOD
  barcode, unit,
  quantity, received_date,
  notes, created_at
)

client_stock_transactions (
  id, client_stock_id, client_id,
  type,                  -- received | consumed | finished_good_in | shipped
  quantity, unit,
  production_order_id,
  notes, user_id, created_at
)

-- ─────────────────────────────────────────
-- MOVIMENTOS DE STOCK (imutável)
-- ─────────────────────────────────────────
transactions (
  id, product_id, product_code, product_name, category,
  type, quantity, unit, balance_after, notes,
  production_order_id, production_order_line_id,
  user_id, created_at
)
-- types: add | remove | adjust | production_debit | po_received | return
--        ready_formula_in | ready_formula_used
--        stock_reserved | stock_reservation_released

-- ─────────────────────────────────────────
-- PURCHASE ORDERS (restock)
-- ─────────────────────────────────────────
purchase_orders (
  id, product_id, order_number,
  quantity, quantity_received,
  status, notes, supplier,
  estimated_delivery_date DATE,
  added_by, created_at
)

-- ─────────────────────────────────────────
-- BOM RULES (defaults por product type)
-- ─────────────────────────────────────────
bom_rules (
  product_type,
  component_type,        -- FRAGRANCE | ETHANOL | BOTTLE | LID | CANDLE_JAR
  quantity_per_unit,
  unit
)
-- Packaging e Labels NÃO estão no BOM — seleccionados dinamicamente na order

-- ─────────────────────────────────────────
-- IDEMPOTÊNCIA WEBHOOK
-- ─────────────────────────────────────────
webhook_processed (
  shopify_order_id, webhook_type, processed_at
)
-- UNIQUE (shopify_order_id, webhook_type)

-- ─────────────────────────────────────────
-- OUTROS
-- ─────────────────────────────────────────
users (id, name, email, password_hash, role, must_change_password)
suppliers (id, name, lead_time, notes)
audit_log (id, user_id, action, entity_type, entity_id, entity_name, details JSONB, created_at)
```

---

## 7. CATEGORIAS DE PRODUTO

| DB Key | Display | Barcode | Unidade |
|--------|---------|---------|---------|
| `FRAGRANCE` | Fragrance | ❌ | ml |
| `RAW_MATERIALS` | Raw Materials | ✅ | ml / units |
| `COMPONENTS` | Components | ✅ | units |
| `FINISHED_GOODS` | Finished Goods | ✅ | units |
| `READY_FORMULA` | Ready Formula | ❌ | ml |

---

## 8. BOM RULES — DEFAULTS

### Tipo 1 — Fragrance + Ethanol (default 25%/75%)

| Product Type | Oil default | Ethanol default | Bottle | Lid(s) |
|-------------|------------|----------------|--------|--------|
| Travel Spray 10ml | 25% × vol | 75% × vol | 1 | Spray Lid 10ml |
| Room Spray 50ml | 25% × vol | 75% × vol | 1 | Spray Lid + Second LID + TOP Lid |
| Room Spray 100ml | 25% × vol | 75% × vol | 1 | Spray Lid + Magnetic LID |
| Reed Diffuser 200ml | 25% × vol | 75% × vol | 1 | Plastic LID + Metal Lid + Insert + Sticks |

**Fórmula:** `oil_ml = quantity × volume_ml × (oil_pct / 100)`
**Fórmula:** `ethanol_ml = quantity × volume_ml × ((100 - oil_pct) / 100)`

### Tipo 2 — 100% Fragrance

| Product Type | Oil | Ethanol | Bottle | Lid |
|-------------|-----|---------|--------|-----|
| Micro Oil 15ml | 100% (15ml) | — | 1 | Lid 15ml |

### Tipo 3 — Candle

| Product Type | Fragrance | Candle Jar | Regra |
|-------------|-----------|-----------|-------|
| Candle 240G | 28.8ml | 1 unit | 12% × 240g |
| Candle 400G | 48ml | 1 unit | 12% × 400g |

**Packaging e Labels:** sempre seleccionados dinamicamente — nunca hardcoded no BOM.

---

## 9. FLUXO DE STATUS — PRODUCTION ORDER

```
DRAFT
  ↓ SM cria Draft Order no Shopify (send_receipt: false, send_invoice: false)
  ↓ unit_price = 0 (editável no Shopify antes de confirmar)

CONFIRMED  ← webhook orders/paid do Shopify
  → SM reserva stock automaticamente (stock_reservations)
  → Se label em stock do cliente → reserva labels
  → Se label insuficiente → alerta para encomendar

QUEUED
  → Order aparece na Manufacturing Queue
  → Pode ter alerta: ⚠️ Labels not in stock — ETA 20/04

IN_PRODUCTION
  → Job criado (started_at, started_by)
  → BOM visível e já consumido do stock reservado
  → Etapas registadas pelo operador

WAITING_EXTERNAL
  → Motivo: filling | labels | other
  → Supplier, data envio, ETA registados

COMPLETED
  → Validação: todos os steps OK?
  → Sobra de fórmula registada (se houver)
  → Sobra de labels contada e guardada no client_labels
  → Fragrance strength log registado
  → Finished Good criado e vinculado à order automaticamente

READY_TO_SHIP
  → Order pronta para envio ao cliente

FULFILLED
  → SM actualiza Shopify
  → Audit log registado
```

---

## 10. PRODUCTION ORDER — UX DETALHADA

### Criação (estilo Cin7)

```
CRIAR PRODUCTION ORDER
──────────────────────────────────────────────────────

Client:     [Karen Abbey ▾]       ← search Shopify customers
Due Date:   [08/05/2026]
Notes:      [________________________]

LINE ITEMS
┌──────────────────────────────────────────────────────┐
│ Line 1                                         [✕]  │
│                                                      │
│ Product Type: [Travel Spray 10ml ▾]                  │
│ Fragrance:    [Santal Black ▾]                       │
│ Oil %:        [25] %    ← default 25, editável       │
│ Quantity:     [200]                                  │
│ Unit Price:   $0.00     ← sempre 0, editável Shopify │
│                                                      │
│ Formula auto-calculada:                              │
│   Oil:     200 × 10ml × 25% = 500ml                 │
│   Ethanol: 200 × 10ml × 75% = 1,500ml               │
│   Total formula: 2,000ml                            │
│                                                      │
│ ⚡ Ready Formula — Santal Black: 250ml available     │
│    Use it?  ● Yes  ○ No                              │
│    → New formula needed: 1,750ml                    │
│       Oil: 437.5ml  |  Ethanol: 1,312.5ml           │
│                                                      │
│ Packaging: [Clean Skin Black ▾]  ← ou "None"        │
│ Label:     [Clean Skin Black v2 — 350u in stock ▾]  │
│            ↑ mostra stock disponível do cliente      │
│                                                      │
│ BOM Preview (editável):                              │
│   Ready Formula (Santal Black)  250ml   ✅ [edit]   │
│   Fragrance (Santal Black)      437.5ml ✅ [edit]   │
│   Ethanol                       1,312.5ml ✅ [edit] │
│   Empty Bottle 10ml             200u    ✅ [edit]   │
│   Spray Lid 10ml                200u    ⚠️ [edit]   │
│   Clean Skin Black Packaging    200u    ✅ [edit]   │
│   Label (Clean Skin Black v2)   200u    ✅ [edit]   │
└──────────────────────────────────────────────────────┘

-- Se a mesma order tiver outra line com o mesmo óleo:
┌──────────────────────────────────────────────────────┐
│ Line 2                                         [✕]  │
│ Product Type: [Room Spray 50ml ▾]                    │
│ Fragrance:    [Santal Black ▾]                       │
│ Oil %:        [25] %                                 │
│ Quantity:     [50]                                   │
│                                                      │
│ ⚡ Same fragrance as Line 1 — formulas combined:     │
│   Line 1 needs: 2,000ml  |  Line 2 needs: 2,500ml   │
│   Total Santal Black formula: 4,500ml               │
│   Ready Formula available: 250ml                    │
│   New formula to make: 4,250ml                      │
│     Oil: 1,062.5ml  |  Ethanol: 3,187.5ml           │
└──────────────────────────────────────────────────────┘

[+ Add Line Item]

──────────────────────────────────────────────────────
TOTAL DEBIT SUMMARY
  Ready Formula (Santal Black)     250ml
  Fragrance (Santal Black)         1,500ml  ✅
  Ethanol                          4,700ml  ✅
  Empty Bottle 10ml                200u     ✅
  Room Spray Bottle 50ml           50u      ✅
  Spray Lid 10ml                   200u     ⚠️ LOW
  Spray Lid 50ml + Lids            50u      ✅
  Clean Skin Black Packaging       200u     ✅
  Label (v2)                       200u     ✅ (from Karen Abbey stock)

⚠️ Spray Lid 10ml — need 200, have 180 (−20)

[Cancel]                    [Confirm & Send to Shopify]
```

---

## 11. MANUFACTURING QUEUE

Página dedicada para a equipe de produção. Mostra apenas orders em status `QUEUED` com stock reservado.

```
MANUFACTURING QUEUE
──────────────────────────────────────────────────────
Filter: All | Standard | Large Client | Candle
Sort: Due Date | Client | Created

┌─────────────────────────────────────────────────────┐
│ SM-001  Karen Abbey               Due: 08/05  [!]  │
│ Travel Spray ×200 + Room Spray ×50                  │
│ ✅ Stock reserved  ⚠️ Labels — ETA 20/04             │
│                              [Start Production]     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ SM-002  Coco Republic  [LARGE CLIENT]  Due: 15/05  │
│ Custom Spray ×500                                   │
│ ✅ Stock reserved  ✅ Labels OK                     │
│                              [Start Production]     │
└─────────────────────────────────────────────────────┘
```

### Ao iniciar produção

```
SM-001 — IN PRODUCTION
──────────────────────────────────────────────────────
Started: 16/04/2026 09:14  |  By: Fabricio

BOM — Santal Black formula (combined for all lines):
  Ready Formula     250ml    [✓ picked]
  Fragrance         1,500ml  [✓ picked]
  Ethanol           4,700ml  [✓ picked]
  Bottles 10ml      200u     [✓ picked]
  Spray Lids 10ml   180u     [✓ picked] ← 20 short, noted
  Packaging         200u     [✓ picked]
  Labels (v2)       200u     [ ] pending arrival

Steps:
  [✓] Assembly complete
  [⏳] Waiting labels — ETA 20/04
  [ ] Labeling
  [ ] Quality check

[Mark as Waiting — Labels]  [Mark as Waiting — Filling]
[Complete Production]
```

### Ao completar

```
COMPLETE PRODUCTION — SM-001
──────────────────────────────────────────────────────
Any issues during production?  [________________________]

Leftover formula?
  Volume left: [___] ml
  Oil % was standard (25%)?  ● Yes  ○ No — adjusted
    If adjusted: Oil % used: [__]%
    Reason: [________________________]

Leftover labels?
  Count: [___] units
  → Guardadas para Karen Abbey automaticamente

[Confirm Completion]
```

---

## 12. FRAGRANCE STRENGTH LOG

Histórico de % real usada vs % padrão por fragrance. Registado automaticamente a cada production job.

```
Santal Black — Strength History
──────────────────────────────────────────────────────
Date      Order    Standard  Used   Adjusted  Notes
12/01     SM-001   25%       25%    No        —
15/02     SM-008   25%       27%    Yes       Batch weaker
03/03     SM-012   25%       27%    Yes       Same batch
20/03     SM-015   25%       28%    Yes       Still weak
10/04     SM-019   25%       25%    No        New batch OK

[Chart — % ao longo do tempo, linha vermelha = desvio do padrão]
```

Útil para confrontar fornecedor com dados concretos quando lote vem mais fraco.

---

## 13. LABELS — GESTÃO COMPLETA

### Stock por cliente (não é stock geral)

Labels são custom por cliente — têm artwork, versão e supplier próprios. Ficam em `client_labels`, separadas do stock geral.

### Na criação da Production Order

```
Label: [Clean Skin Black v2 ▾]
       350u in stock ✅ — sufficient for 200u needed

OU

Label: [Clean Skin Black v2 ▾]
       80u in stock ⚠️ — need 200u, short 120u
       → Order 120u more?  Supplier: [Print Express]  ETA: [____]

OU

Label: [None]  ← sem label nesta order
```

### Artwork mudou

```
Admin marca v1 como obsoleta:
⚠️ 150 labels obsoletas — Clean Skin Black v1
   ● Write off (descartadas)
   ○ Keep (não sugeridas mas visíveis no histórico)
```

### Ao finalizar produção

```
Leftover labels?  Count: [30] units
→ Guardadas automaticamente em client_labels (Karen Abbey, v2)
→ Disponíveis na próxima order do cliente
```

---

## 14. READY FORMULA

Ready Formula é fragrance + ethanol já misturados. Não está vinculada a produto — serve para qualquer produto que use aquela fragrance (excepto 15ml que é 100% oil).

### Lógica de uso

1. Usuário selecciona Fragrance numa line item
2. Sistema verifica se existe Ready Formula desta fragrance
3. Se sim → sugere uso automático
4. Se suficiente → cobre toda a necessidade
5. Se parcial → usa o que tem + calcula nova fórmula para completar
6. Sobras de produção → registadas como nova Ready Formula

### Agrupamento dentro da mesma order

Se múltiplos line items usam a mesma fragrance, o sistema combina automaticamente e mostra o total de fórmula numa só vez — o operador faz tudo de uma vez, poupando tempo.

---

## 15. TIPOS DE CLIENTES E FLUXOS

### Standard Client
Usa stock geral (fragrance, ethanol, components SA). Fluxo normal de produção.

### Large Client
Componentes chegam da China com branding próprio → Client Reserved Stock (exclusivo). Só fragrance vem do stock geral. Fluxo igual ao standard mas com fonte diferente para componentes.

### Candle (qualquer cliente)
```
QUEUED
  ↓ [Start Production]
Separa Fragrance + Candle Jar + Packaging
  ↓ [Mark as Sent for Filling]
WAITING_EXTERNAL — filling — Supplier XYZ — sent 14/04
  ↓ [Mark as Received from Filling]
IN_PRODUCTION
  Labels prontas?
  ├── Sim → [Labeling ✓] → [Complete]
  └── Não → WAITING_EXTERNAL — labels — ETA 22/04
               ↓ (labels chegam)
            [Labeling ✓] → [Complete]
  ↓
COMPLETED → Finished Good → READY_TO_SHIP
```

---

## 16. SHOPIFY INTEGRATION

**Plano:** Grow ($105/mês)

**Criar Draft Order:**
```json
POST /admin/api/2025-01/draft_orders.json
{
  "draft_order": {
    "send_receipt": false,
    "send_invoice": false,
    "line_items": [
      { "title": "Clean Skin Travel Spray (10ml)", "quantity": 200, "price": "0.00" },
      { "title": "Clean Skin Room Spray (50ml)", "quantity": 50, "price": "0.00" }
    ],
    "customer": { "id": "shopify_customer_id" },
    "note": "SM Order: SM-001 | Due: 08/05/2026",
    "tags": "SA Custom Orders"
  }
}
```

**Webhook recebido:**
```
POST /api/webhook/shopify
Topic: orders/paid
→ Identifica order pelo shopify_draft_order_id
→ Reserva stock
→ Status: CONFIRMED → QUEUED
→ Regista em webhook_processed (idempotência)
```

---

## 17. PÁGINAS — DETALHE

### Dashboard
- Priority Watchlist (Fragrance / Raw Materials / Components / Ready Formula)
- Active Production Orders com due date e status
- Large Client Tracker (components received, China PO raised, production status)
- Candle Tracker (cards com etapa actual: waiting filling / waiting labels)
- Labels Alert (labels encomendadas com ETA)

### Production Orders
- Lista com filtros: All / Standard / Large Client / Candle / por status
- Criar nova order: fluxo Cin7-style com multi line items
- Detail view: line items, BOM debitado, componentes, timeline de status

### Manufacturing Queue *(nova página)*
- Só orders em QUEUED com stock reservado
- Iniciar produção, registar etapas, completar
- Alertas de dependências (labels, filling)

### Products
- CRUD + todas as 5 categorias incluindo READY_FORMULA
- Barcode obrigatório para COMPONENTS, RAW_MATERIALS, FINISHED_GOODS

### Stock Management
- View + adjust + bin location
- Filtros por categoria incluindo READY_FORMULA

### BOM Viewer
- Defaults por product type
- Nota: packaging e labels são dinâmicos

### Clients
- Lista + is_large_client flag
- Client Labels por cliente (stock, versões, obsoletas)
- Client Reserved Stock (large clients)
- Histórico de orders por cliente

### Barcode Scanner
- Entrada de stock via scan (geral ou client reserved)
- Fallback manual sempre disponível

### Fragrance Strength Log *(dentro de cada produto Fragrance)*
- Histórico de % usada ao longo do tempo
- Gráfico timeline
- Indicador de desvio do padrão

### Incoming Orders (PO)
- Restock stock geral
- Receber parcial ou total + ETA

### Transaction History
- Todos os tipos incluindo ready_formula, stock_reserved
- Export Excel

### Activity Log *(admin/root)*

### User Management *(root)*

---

## 18. SISTEMA DE ROLES

| Role | Acesso |
|------|--------|
| `root` | Tudo |
| `admin` | Tudo exceto User Management |
| `user` | Sem User Management e Activity Log |

- Password padrão: `#scent2026` — obrigado a mudar no 1.º login

---

## 19. PRINCIPAIS API ROUTES

```
-- Auth
POST   /api/auth/login
POST   /api/auth/change-password

-- Webhook Shopify
POST   /api/webhook/shopify                          ← orders/paid

-- Products
GET    /api/products
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id?userId=X

-- Stock
POST   /api/stock/add
POST   /api/stock/remove
POST   /api/stock/adjust

-- Ready Formula
GET    /api/ready-formula/available?fragrance_id=X
POST   /api/ready-formula

-- Fragrance Strength Log
GET    /api/fragrances/:id/strength-log
POST   /api/fragrances/:id/strength-log

-- Production Orders
GET    /api/production-orders
POST   /api/production-orders
GET    /api/production-orders/:id
DELETE /api/production-orders/:id?userId=X

-- Manufacturing Queue
GET    /api/manufacturing/queue
POST   /api/manufacturing/:id/start
POST   /api/manufacturing/:id/complete
POST   /api/manufacturing/:id/lines/:lineId/send-for-filling
POST   /api/manufacturing/:id/lines/:lineId/receive-from-filling
POST   /api/manufacturing/:id/lines/:lineId/mark-waiting-labels
POST   /api/manufacturing/:id/lines/:lineId/labels-received
POST   /api/manufacturing/:id/lines/:lineId/labeling-complete

-- Client Labels
GET    /api/clients/:id/labels
POST   /api/clients/:id/labels/receive
PUT    /api/clients/:id/labels/:labelId/obsolete

-- Client Stock (Large Clients)
GET    /api/clients/:id/stock
POST   /api/clients/:id/stock/receive
POST   /api/clients/:id/stock/transform

-- Purchase Orders
GET    /api/purchase-orders
POST   /api/products/:id/incoming
POST   /api/purchase-orders/:poId/receive
DELETE /api/purchase-orders/:poId?userId=X

-- Transactions
GET    /api/transactions
GET    /api/products/:id/transactions

-- BOM
GET    /api/bom-rules
PUT    /api/bom-rules/:product_type

-- Clients
GET    /api/clients
POST   /api/clients
PUT    /api/clients/:id
GET    /api/clients/shopify-search?q=name

-- Shopify
POST   /api/shopify/draft-order
GET    /api/shopify/customers/search

-- Barcode
GET    /api/barcode/:code

-- Dashboard
GET    /api/dashboard/priority-watchlist
GET    /api/dashboard/active-orders
GET    /api/dashboard/large-clients
GET    /api/dashboard/candles-in-progress
GET    /api/dashboard/labels-pending

-- Audit / Users / Suppliers
GET    /api/audit
GET    /api/users
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
GET    /api/suppliers
POST   /api/suppliers
PUT    /api/suppliers/:id
DELETE /api/suppliers/:id
```

---

## 20. CONVENÇÕES

- **Timezone:** `process.env.TZ = 'Australia/Sydney'` — 1.ª linha do server/index.js
- **DB migrations:** `runStartupMigrations()` idempotente no startup
- **userId em DELETE:** sempre query param `?userId=X`
- **Datas:** en-AU (DD/MM/YYYY)
- **Idioma UI:** 100% inglês
- **Unidades:** ml internamente, L na UI (÷1000) para Fragrance/Ethanol/Ready Formula
- **unit_price:** sempre 0 na criação — editável no Shopify antes de confirmar
- **Shopify Draft Orders:** sempre com `send_receipt: false` e `send_invoice: false`
- **Webhook idempotência:** tabela `webhook_processed` com UNIQUE constraint
- **BOM overrides:** sempre registados com `was_overridden: true` + reason
- **Audit log:** toda acção relevante
- **Toasts:** feedback imediato
- **Stock negativo:** permitido, warning no preview
- **Barcode:** obrigatório para COMPONENTS, RAW_MATERIALS, FINISHED_GOODS

---

## 21. BUILD ORDER (FASES)

| Fase | O que construir | Entregável |
|------|----------------|-----------|
| **1** | Scaffold + DB + Auth + layout | Login funcional |
| **2** | Products CRUD + Stock Management | Stock operacional |
| **3** | BOM rules + Fragrance % calculator | BOM correcto |
| **4** | Production Orders — criação multi line items | Core funcional |
| **5** | Webhook Shopify (orders/paid) + reserva de stock | Fluxo SM↔Shopify |
| **6** | Manufacturing Queue + Production Jobs | Produção operacional |
| **7** | Ready Formula + Fragrance Strength Log | Sobras e qualidade |
| **8** | Labels (client_labels + tracking) | Labels operacionais |
| **9** | Dashboard completo | Visibilidade total |
| **10** | Large Client flow (client stock) | Large clients |
| **11** | Candle flow (2 etapas + filling tracking) | Candles completas |
| **12** | Barcode Scanner | Entrada por scan |
| **13** | Transaction History + Activity Log + POs | Histórico completo |
| **14** | User Management + polish final | Production-ready |

---

## 22. VERSÃO

**v0.3.0** — Abril 2026

**Changelog v0.3.0:**
- Novo fluxo de status: DRAFT → CONFIRMED (webhook) → QUEUED → IN_PRODUCTION → WAITING_EXTERNAL → COMPLETED → READY_TO_SHIP → FULFILLED
- Stock reservation separado de consumo
- unit_price = 0 na criação, editável no Shopify
- Shopify Draft Orders: send_receipt/send_invoice = false (sem email ao cliente)
- BOM editável antes de confirmar (com audit de overrides)
- Oil % configurável por order (default 25%, excepto 15ml = 100%)
- Batch de fórmula automático dentro da mesma order (mesmo óleo, múltiplos line items)
- Fragrance Strength Log: histórico de % real vs padrão com gráfico
- Labels: client_labels com versioning de artwork + obsolete flow
- Manufacturing Queue: nova página dedicada à produção
- production_jobs: time tracking por job
- webhook_processed: idempotência para orders/paid

---

*Este documento é a referência base do projecto Scented Merchandise (SM). Toda decisão de design, lógica e arquitectura deve partir daqui.*
