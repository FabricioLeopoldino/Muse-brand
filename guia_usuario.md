# Guia do Usuário — Sistema Scented Merchandise / MUSE

> Manual prático pra você usar o sistema no dia-a-dia. Sem tecniquês.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Primeiro Login](#2-primeiro-login)
3. [Conceitos Importantes](#3-conceitos-importantes)
4. [Setup Inicial (faça uma vez)](#4-setup-inicial-faça-uma-vez)
5. [Como Criar Produtos MUSE (sua marca)](#5-como-criar-produtos-muse-sua-marca)
6. [Como Criar Ordens de Produção](#6-como-criar-ordens-de-produção)
7. [Como Gerenciar Clientes B2B](#7-como-gerenciar-clientes-b2b)
8. [Dia-a-dia: Estoque, Compras, Embalagem](#8-dia-a-dia-estoque-compras-embalagem)
9. [Dicas e Atalhos](#9-dicas-e-atalhos)

---

## 1. Visão Geral

O sistema gerencia 3 linhas de negócio em paralelo:

| Linha | O que é | Quem compra |
|-------|---------|-------------|
| **MUSE** | Sua marca própria | Consumidor final (B2C) |
| **Standard** | Produtos "Clean Skin" (sem logo) com label do cliente | Empresas pequenas/médias (B2B) |
| **Major Client** | Produtos totalmente customizados, componentes vindos da China (ex: COCO Republic) | Empresas grandes (B2B premium) |

Tudo divide o mesmo "chão de fábrica" — produção, embalagem, expedição, fragrâncias.

---

## 2. Primeiro Login

1. Abra `http://localhost:5173` (ou o link do sistema)
2. Tela de login pede apenas **Name** + **Password**
3. Usuário inicial: `Root` / senha `#scent2026`
4. No primeiro acesso, o sistema **vai pedir pra trocar a senha** — escolha uma forte
5. Depois disso, você está dentro

Pra criar mais usuários, vá em **System → User Management** (só Root vê isso).

---

## 3. Conceitos Importantes

Antes de usar, entenda esses 4 termos. Eles aparecem o tempo todo:

### 📦 Container Type
"Tipo físico de embalagem". Exemplos: Reed Diffuser, Room Spray, Candle, Pure Oil.

Você cadastra **uma vez** e reusa. Define se é candle (precisa de filling externo), se é puro óleo (sem mistura ethanol), e a unidade (ml, g, oz).

### ⭐ Master (Produto Modelo)
"O modelo do carro". Exemplo: "Reed Diffuser 200ml MUSE".

Define: tamanho, % de óleo padrão, fragrâncias disponíveis, e a "receita" (BOM).

Master **não tem estoque** — é só o template.

### 🎨 Variant (Variante)
"A cor do carro". Cada combinação master + fragrância vira um variant. Exemplo: "Reed Diffuser 200ml MUSE × Santal Black".

Variant **tem estoque** — é o que você vende.

### 📋 BOM (Bill of Materials)
"A receita do produto". Lista dos componentes que compõem 1 unidade.
Exemplo: 1 Reed Diffuser 200ml MUSE precisa de:
- 1 garrafa MUSE
- 1 tampa MUSE
- 150ml ethanol
- 50ml fragrance (escolhida na hora da ordem)

---

## 4. Setup Inicial (faça uma vez)

Antes de cadastrar produtos, você precisa cadastrar as "peças soltas". Faça nessa ordem:

### Passo 1: Container Types
**Onde:** Sidebar → INVENTORY → Container Types

Clique em **"+ New Container Type"** e cadastre:

| Nome | Code | Unit | Candle? | Pure Oil? |
|------|------|------|---------|-----------|
| Reed Diffuser | REED | ml | ❌ | ❌ |
| Room Spray | SPRAY | ml | ❌ | ❌ |
| Travel Spray | TRAVEL | ml | ❌ | ❌ |
| Candle | CANDLE | g | ✅ | ❌ |
| Pure Oil | OIL | ml | ❌ | ✅ |

(adicione quantos quiser)

### Passo 2: Fragrances
**Onde:** Sidebar → INVENTORY → Fragrances

Clique em **"+ New Fragrance"** e cadastre suas fragrâncias:
- Name: ex. "Santal Black"
- Product Code: auto-gerado (ex. FRAG_00001)
- Min Stock Level: quanto você considera "baixo" (alerta)

Depois, **adicione estoque inicial** clicando no botão **"+ Add"** ao lado de cada fragrância.

### Passo 3: Componentes e Matérias-Primas
**Onde:** Sidebar → INVENTORY → Products → **"+ New Product"**

Cadastre:
- **Raw Materials** (categoria RAW_MATERIAL): ethanol, óleos base
- **Components** (categoria COMPONENT): garrafas, tampas, palitos, etc.
- **Labels** (categoria LABEL): se aplicável

Para cada um:
- Name + Product Code
- Category (escolher correto)
- Unit (ml, g, units)
- Adicionar estoque inicial via Stock Management depois

### Passo 4: Clientes (se for trabalhar com B2B)
**Onde:** Sidebar → CLIENTS → All Clients → **"+ New Client"**

- Para Standard (Clean Skin): deixe **"Is Major Client"** **desmarcado**
- Para Major Client (COCO Republic etc.): **marque** "Is Major Client"

---

## 5. Como Criar Produtos MUSE (sua marca)

### Passo 1: Criar um MUSE Master
**Onde:** Sidebar → MUSE → MUSE Products → **"+ New Master"**

Preencha:
- **Name:** "Reed Diffuser 200ml MUSE"
- **Product Code:** `REED_DIFFUSER_200ML_MUSE` (auto-sugerido)
- **Container Type:** escolha "Reed Diffuser"
- **Volume:** 200 ml
- **Default Oil %:** 25

Clique em **"Create Master"**.

### Passo 2: Definir a Receita (BOM)
**Onde:** Sidebar → INVENTORY → BOM Builder

1. Veja seu master na lista de tabs (vai aparecer "MUSE · Reed Diffuser 200ml MUSE")
2. Clique nela
3. Clique em **"+ Add Component"** e adicione, um por um:
   - MUSE Bottle 200ml × 1
   - MUSE Lid × 1
   - Ethanol → escolha fórmula **"ethanol_pct"** (calcula automático)
4. Fragrance é automática (não precisa adicionar — escolhe na ordem)

Use o **Calculator** ali no canto pra verificar:
- "Pra 100 unidades a 25% oil, quanto de cada componente?"

### Passo 3: Atribuir Fragrâncias e Criar Variants
**Onde:** Sidebar → MUSE → MUSE Products → clique no master

No drawer que abre, role até **"Fragrances & Variants"**:
1. No campo dropdown, **escolha uma fragrância** (ex. Santal Black)
2. Clique em **"+ Add"**
3. **Automaticamente** o sistema cria o variant "Reed Diffuser 200ml MUSE — Santal Black" com estoque zero
4. Repita pra outras fragrâncias

Pronto. Agora seu master tem N variants prontos pra receber estoque via produção.

---

## 6. Como Criar Ordens de Produção

**Onde:** Sidebar → PRODUCTION → Production Orders → **"+ New Order"**

### Cenário A: Ordem MUSE
1. **Order Type:** Standard *(o segmento será detectado como MUSE automaticamente porque não tem cliente)*
2. **Client:** deixe vazio (ou escreva "MUSE Internal")
3. **Add Line:**
   - Master: escolha "Reed Diffuser 200ml MUSE"
   - Fragrance: escolha entre as que você atribuiu (só elas aparecem)
   - Quantity: ex. 10
4. Clique **"+ Add another line"** pra adicionar mais variantes na mesma ordem
5. **Create Order**

A ordem fica em status **"draft"**. Click em **"→ Queue"** ou **"→ Shopify"** pra avançar.

### Cenário B: Ordem Standard (Clean Skin)
1. **Order Type:** Standard
2. **Client:** escolha um Standard Client
3. **Add Line:**
   - Master: aparece a lista de Standard Masters
   - Fragrance: pode escolher qualquer fragrância
   - **Label:** se o cliente tem label custom, escolha
   - Quantity
4. Create Order

### Cenário C: Ordem Major Client (ex. COCO)
1. **Order Type:** Major Client
2. **Client:** escolha o Major Client (ex. COCO Republic)
3. **Add Line:**
   - Master: só aparecem masters cadastrados pra esse cliente
   - Fragrance: das fragrâncias atribuídas ao master
   - Quantity
4. Create Order

⚠️ **Se faltar estoque** de fragrance/componente: aparece um **modal "MAJOR CLIENT PRIORITY"** mostrando quais ordens MUSE/Standard serão **deslocadas**. Confirme ou cancele.

### Produzir
**Onde:** Sidebar → PRODUCTION → Manufacturing Queue

1. Ordens em status "queued" aparecem aqui
2. Clique **"Start Production"** → estoque é consumido
3. Pra cada linha, marque os passos:
   - Filling Done (se Reed/Spray)
   - Labeling Done
   - Packing Done
4. Quando tudo "done", clique **"Complete"**
5. Resultado:
   - MUSE order: vira **"fulfilled"** automaticamente, +N units vão pro variant MUSE Stock
   - Standard order: vira **"completed"** → você precisa enviar e marcar como Fulfilled
   - Major order: vira **"completed"** → fica em "Awaiting Ship" até o cliente OK

### Candles (especial)
Se a ordem tem candle, ela vai pro fluxo de **External Filling**:
1. Sistema marca "Send for Filling"
2. Você envia pra fornecedor externo com o óleo
3. Quando volta, marca "Received from Filling" com a quantidade recebida
4. Continua o fluxo normal de labeling/packing

---

## 7. Como Gerenciar Clientes B2B

### Standard Clients
**Onde:** Sidebar → CLIENTS → All Clients (filter Standard)

Por cliente você pode:
- Criar **Custom Labels** (artwork deles, mas a label é nossa fisicamente)
- Ver histórico de ordens

### Major Clients (drill-in completo)
**Onde:** Sidebar → CLIENTS → Major Clients → clique no cliente

4 abas:

**1. Catalog** — Masters específicos deste cliente
- Cada master é único pra ele (ex: "Reed Diffuser 200ml COCO")
- Cria via BOM Builder com segment=MAJOR + selecionar este cliente

**2. Client Stock** — Componentes da China
- Aqui você registra o que ele mandou da China (garrafas, tampas, etc.)
- Agrupado por categoria

**3. Custom Labels** — Labels físicos com a arte dele
- Quantidade em estoque
- Sobra após produção retorna automaticamente

**4. Awaiting Ship** — Produção pronta aguardando OK do cliente
- Agrupado por master + fragrance
- Mostra quantos units totais e quais ordens
- Quando cliente OK, vai em Production Orders → "Ready to Ship" → "Fulfilled"

---

## 8. Dia-a-dia: Estoque, Compras, Embalagem

### Stock Management
**Onde:** Sidebar → INVENTORY → Stock Management

Visão geral de **tudo que tem estoque real**:
- Raw materials, components, fragrances, variants finais
- **Não mostra masters** (eles são templates, não têm estoque)
- Adicione/Remova estoque manualmente quando precisar

Volumes grandes aparecem em **L** (ex: 9,500 L em vez de 9,500,000 ml). Internamente é sempre ml.

### MUSE Stock
**Onde:** Sidebar → MUSE → MUSE Stock

Estoque dos seus produtos MUSE prontos pra venda:
- Cada linha = 1 variant (Reed Diffuser 200ml × Myrrh, por exemplo)
- Adicionar imagem do produto: click no botão da câmera
- Adicionar attachments (SDS, photos, certificates): click no clipe
- Add/Remove stock manualmente se necessário

### Incoming Orders (compras de fornecedor)
**Onde:** Sidebar → INVENTORY → Incoming Orders

Quando você faz pedido de componente/fragrance pro fornecedor:
1. **"+ New PO"** → escolhe produto, qty esperada, supplier, ETA
2. Quando chegar, clique **"Receive"** → entra estoque
3. Pode cancelar (soft) ou discard (hard delete se quiser)

### Packing Records
**Onde:** Sidebar → PRODUCTION → Packing Records

Histórico de quanto foi empacotado em cada ordem completed.

---

## 9. Dicas e Atalhos

### Códigos de produto (sugestões)
- **Fragrance:** FRAG_00001, FRAG_00002...
- **Raw material:** RAW_00001...
- **Component:** COMP_00001...
- **MUSE Master:** REED_DIFFUSER_200ML_MUSE
- **Standard Master:** REED_DIFFUSER_200ML_CLEAN_SKIN
- **Major Master:** REED_DIFFUSER_200ML_COCO
- **Variant:** auto-gerado pelo sistema (`master_code-fragrance_code`)

### Atalhos visuais

- 🟡 **MUSE** = badge amarelo
- 🔵 **STANDARD** = badge azul
- 🟣 **MAJOR** = badge roxo

### Quando uma fragrance está baixa
1. Dashboard mostra alert no topo
2. Fragrances page tem filter "Low Stock Only"
3. Você decide: produzir menos ou pedir mais

### Hide Masters
Na Products page, ative o toggle **"Hide Masters"** pra ver só os produtos com estoque real (esconde templates).

### Reservation Displacement (Major Client priority)
Quando Major Client precisa de mais fragrance/component que tem disponível:
- Sistema mostra modal listando exatamente quais ordens MUSE/Standard serão impactadas
- Você decide: deslocar (Major ganha prioridade) ou cancelar
- MUSE order deslocada gera um **Alert no Dashboard** que você precisa **Acknowledge**

### Dashboard Alerts
Banner vermelho no topo do Dashboard mostra:
- Reservations deslocadas
- Outros eventos críticos
- "Ack" individual ou "Acknowledge all"

### Backup
O banco está em **Neon** (PostgreSQL na nuvem). Backups automáticos. Sem preocupação.

---

## Resumo Rápido — Fluxo Completo MUSE

```
1. Container Types        → cadastrar (Reed, Spray, Candle, Oil)
2. Fragrances             → cadastrar e adicionar estoque
3. Products (categorias)  → cadastrar componentes (bottles, lids) + raw materials (ethanol)
4. MUSE Products          → criar Master + atribuir fragrances (gera variants)
5. BOM Builder            → definir receita do master
6. Production Orders      → criar ordem MUSE
7. Manufacturing Queue    → produzir (Start → Complete)
8. MUSE Stock             → variants com +N units, pronto pra vender
```

Pra Standard: pular passo 4, criar Standard Master direto, ordem com client + label.
Pra Major Client: passo 4 → MAJOR master vinculado ao cliente, ordem com client.

---

## Problemas Comuns

| Sintoma | Provável causa | Solução |
|---------|----------------|---------|
| "No masters yet" no BOM Builder | Nenhum master criado | Crie em MUSE Products / Standard Catalog / via Major Client Detail |
| Variants não aparecem em MUSE Stock | Master criado mas sem fragrances atribuídas | Volta em MUSE Products, abre o master, "+Add Fragrance" |
| Production order não consegue debitar | Stock insuficiente em algum componente | Verifica Stock Management + Incoming Orders pra ver se tem PO pendente |
| Reservation conflict | Major Client tentando ordem com stock baixo | Modal aparece pra confirmar displacement (Major wins) |
| Sidebar item dá 404 | Versão antiga do frontend cacheada | Refresh (Ctrl+Shift+R) ou reiniciar dev server |

---

**Pronto.** Esse guia cobre 95% do uso diário. O resto você descobre clicando — o sistema avisa quando tem coisa pendente, sugere próximo passo nos empty states, e tem tooltips em campos importantes.

Bom uso!
