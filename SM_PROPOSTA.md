# Scented Merchandise — Proposta do Sistema de Gestão
*Documento executivo — Abril 2026*

---

# 🇧🇷 PORTUGUÊS

---

## O que é o Scented Merchandise?

O **Scented Merchandise (SM)** é um sistema de gestão desenvolvido sob medida para o negócio de brand extension da Scent Australia. Ele centraliza em um único lugar tudo que envolve pedidos, produção e estoque — eliminando planilhas, anotações manuais e processos descentralizados.

O sistema foi desenhado para o dia a dia real da operação: desde o momento em que um cliente faz um pedido até o produto final ser entregue na porta dele.

---

## O problema que existe hoje

Atualmente, o processo envolve várias etapas manuais e informações espalhadas em diferentes lugares:

- Detalhes do pedido (qual perfume usar, se vai embalagem, prazo) são anotados em campos de texto livre no Shopify
- O controle de estoque depende de memória ou planilhas
- Não há visibilidade clara de quais pedidos estão em produção e em que etapa estão
- Labels e embalagens customizadas não têm rastreamento formal
- Sobras de fórmula se perdem sem registro
- Não é possível saber rapidamente o que está em falta antes de começar uma produção

Isso gera retrabalho, risco de erro e falta de visibilidade para a gestão.

---

## Como o sistema resolve isso

O SM transforma um processo manual e descentralizado em um fluxo estruturado, com rastreamento em tempo real de cada etapa.

### O fluxo em 6 passos simples

**1. Pedido criado**
A equipe registra o pedido no sistema, informando o cliente, os produtos, o perfume e se vai embalagem ou label. O sistema cria automaticamente o rascunho no Shopify — sem precisar fazer duas vezes.

**2. Confirmação e pagamento**
O responsável acessa o Shopify normalmente, revisa os valores (que são definidos nesta etapa, não antes) e confirma o pagamento. O sistema é avisado automaticamente.

**3. Estoque reservado**
Ao confirmar o pagamento, o sistema reserva todos os materiais necessários para aquele pedido. Ninguém mais pode usar esses materiais para outro pedido — garantindo que a produção sempre terá o que precisa.

**4. Fila de produção**
O pedido entra automaticamente na fila de produção, visível para a equipe do armazém. A fórmula é calculada na tela, os materiais estão reservados e as instruções estão claras.

**5. Produção executada**
A equipe segue as etapas no sistema: mistura de fórmula, montagem, envio para fornecedor se necessário (enchimento de velas, labels externas), recebimento e finalização. Cada etapa é registrada com data e hora.

**6. Produto pronto e enviado**
Ao finalizar, o produto é marcado como pronto. O sistema registra eventuais sobras de fórmula ou labels para uso futuro, e o Shopify é atualizado automaticamente.

---

## Funcionalidades principais

### 📋 Gestão de Pedidos
Todos os pedidos em um só lugar. É possível ver o status de cada um — se está aguardando produção, em produção, aguardando material externo ou pronto para envio. Nada se perde.

### 🏭 Fila de Produção
A equipe do armazém tem uma tela dedicada mostrando exatamente o que precisa ser feito, em que ordem e com quais materiais. O sistema calcula automaticamente as quantidades de fórmula necessárias baseado no tipo de produto e perfume escolhido.

### 📦 Controle de Estoque em Tempo Real
O sistema sabe exatamente o que tem no armazém a cada momento. Quando um pedido é confirmado, os materiais são reservados. Quando a produção acontece, o consumo é registrado. Alertas automáticos avisam quando algum item está chegando ao limite mínimo.

### 🎨 Gestão de Labels Customizadas
Cada cliente tem suas próprias labels. O sistema controla quantas sobram após cada pedido, guarda para uso futuro e avisa quando a arte mudou e as labels antigas não devem ser usadas. Chega de usar label errada ou descobrir que acabou na hora da produção.

### ⚗️ Controle de Fórmula
O sistema calcula automaticamente a quantidade de óleo e etanol necessária para cada produto. A porcentagem de óleo pode ser ajustada por pedido (quando o cliente solicita ou quando o lote do óleo vem mais fraco). Sobras de fórmula são registradas e aproveitadas no próximo pedido com o mesmo perfume, reduzindo desperdício.

### 📊 Histórico de Qualidade do Óleo
O sistema registra a porcentagem real de óleo usada em cada produção. Se ao longo do tempo for necessário aumentar a porcentagem porque o óleo está vindo mais fraco, isso fica documentado com datas e motivos — um histórico concreto para apresentar ao fornecedor quando necessário.

### 🕯️ Fluxo Especial para Velas
Velas têm um processo diferente: são enviadas para preenchimento externo e voltam prontas. O sistema acompanha cada etapa — quando saiu, para qual fornecedor, quando voltou — e só finaliza o pedido quando tudo estiver completo.

### 🏢 Clientes com Produtos Próprios
Para clientes como a Coco Republic, que têm produtos com a marca deles chegando da China, o sistema mantém um estoque separado e exclusivo para cada cliente. Os materiais de um cliente nunca se misturam com os de outro. A única parte que vem do estoque geral da Scent Australia é o óleo de fragrância.

### 📷 Entrada de Estoque por Código de Barras
Quando chegam produtos da China, a equipe pode usar um leitor de código de barras para dar entrada no sistema rapidamente. Mais rápido, sem erros de digitação.

### 📈 Dashboard Gerencial
Uma tela inicial com visão completa da operação: o que está em falta no estoque, quais pedidos estão ativos, quais velas estão aguardando retorno do fornecedor e quais labels estão sendo aguardadas. Tudo em um só lugar, atualizado em tempo real.

---

## Integração com o Shopify

O sistema trabalha junto com o Shopify, sem substituí-lo. Cada um faz o que faz melhor:

| Shopify | Scented Merchandise |
|---------|---------------------|
| Gestão do cliente | Gestão da produção |
| Confirmação de pagamento | Controle de estoque |
| Etiqueta de envio | Cálculo de fórmulas |
| Histórico comercial | Rastreamento de materiais |

Quando um pedido é confirmado no Shopify, o SM é avisado automaticamente e já inicia o processo de reserva de estoque. A equipe não precisa duplicar informações entre os dois sistemas.

**Importante:** o sistema foi configurado para nunca enviar emails automáticos ao cliente quando um rascunho de pedido é criado — evitando situações onde o cliente recebe uma notificação antes do pedido estar finalizado.

---

## Vantagens para o negócio

### Elimina erros manuais
As quantidades de fórmula são calculadas pelo sistema — não dependem de memória ou planilha. O BOM (lista de materiais) de cada produto está definido e é aplicado automaticamente.

### Visibilidade total
Qualquer pessoa com acesso sabe exatamente onde está cada pedido, o que tem em estoque e o que está em falta. Sem precisar perguntar para alguém ou procurar em planilhas.

### Rastreabilidade completa
Todo movimento de estoque é registrado: quem fez, quando, em qual pedido. Histórico completo disponível a qualquer momento.

### Redução de desperdício
Sobras de fórmula e labels são registradas e aproveitadas em pedidos futuros. Menos desperdício, menos custo.

### Escalabilidade
O sistema suporta o crescimento do negócio. Mais clientes, mais produtos, mais pedidos — sem aumentar a complexidade operacional.

### Dados para decisão
O histórico de qualidade do óleo, o tempo médio de produção por tipo de produto, os níveis de estoque ao longo do tempo — tudo disponível para tomada de decisão baseada em dados reais.

---

## Segurança e acesso

O sistema tem três níveis de acesso:

| Nível | Quem usa | O que pode fazer |
|-------|----------|-----------------|
| **Administrador Master** | Gestão | Acesso total, incluindo gerenciar usuários |
| **Administrador** | Supervisores | Tudo, exceto gerenciar usuários |
| **Operador** | Equipe do armazém | Criar pedidos, movimentar estoque, executar produção |

Cada ação fica registrada com o nome do usuário responsável.

---

## Em resumo

O Scented Merchandise é a espinha dorsal da operação de brand extension. Ele conecta o pedido do cliente, o estoque físico e a produção em um único sistema — dando à gestão visibilidade total e à equipe operacional clareza sobre o que fazer e quando fazer.

**Menos erro. Menos desperdício. Mais controle. Mais velocidade.**

---
---

# 🇬🇧 ENGLISH

---

## What is Scented Merchandise?

**Scented Merchandise (SM)** is a management system built specifically for Scent Australia's brand extension business. It brings together in one place everything related to orders, production, and stock — eliminating spreadsheets, manual notes, and disconnected processes.

The system was designed around the real day-to-day operation: from the moment a client places an order to the moment the finished product is delivered to their door.

---

## The problem that exists today

Currently, the process involves multiple manual steps and information scattered across different places:

- Order details (which fragrance, whether packaging is included, deadlines) are written as free text in Shopify notes
- Stock control relies on memory or spreadsheets
- There's no clear visibility into which orders are in production and at what stage
- Custom labels and packaging have no formal tracking
- Leftover formula is lost without being recorded
- It's not possible to quickly know what's missing before starting production

This leads to rework, risk of error, and lack of visibility for management.

---

## How the system solves this

SM transforms a manual, disconnected process into a structured flow with real-time tracking of every step.

### The flow in 6 simple steps

**1. Order created**
The team registers the order in the system, entering the client, products, fragrance and whether packaging or a label is included. The system automatically creates the draft in Shopify — no need to do it twice.

**2. Confirmation and payment**
The responsible person accesses Shopify as usual, reviews the values (which are set at this stage, not before) and confirms payment. The system is notified automatically.

**3. Stock reserved**
When payment is confirmed, the system reserves all materials needed for that order. No one else can use those materials for another order — ensuring production always has what it needs.

**4. Production queue**
The order automatically enters the production queue, visible to the warehouse team. The formula is calculated on screen, materials are reserved and instructions are clear.

**5. Production executed**
The team follows the steps in the system: formula mixing, assembly, sending to external supplier if needed (candle filling, external labels), receiving back and finishing. Each step is recorded with date and time.

**6. Product ready and shipped**
When finished, the product is marked as ready. The system records any leftover formula or labels for future use, and Shopify is updated automatically.

---

## Key features

### 📋 Order Management
All orders in one place. It's possible to see the status of each one — whether it's waiting for production, in production, waiting for external materials, or ready to ship. Nothing gets lost.

### 🏭 Production Queue
The warehouse team has a dedicated screen showing exactly what needs to be done, in which order and with which materials. The system automatically calculates formula quantities based on product type and chosen fragrance.

### 📦 Real-Time Stock Control
The system knows exactly what's in the warehouse at every moment. When an order is confirmed, materials are reserved. When production happens, consumption is recorded. Automatic alerts notify when any item is approaching its minimum level.

### 🎨 Custom Label Management
Each client has their own labels. The system tracks how many are left after each order, stores them for future use, and flags when the artwork has changed and old labels should not be used. No more using the wrong label or finding out they've run out at production time.

### ⚗️ Formula Control
The system automatically calculates the quantity of oil and ethanol needed for each product. The oil percentage can be adjusted per order (when the client requests it or when an oil batch comes in weaker than usual). Leftover formula is recorded and used in the next order with the same fragrance, reducing waste.

### 📊 Oil Quality History
The system records the actual oil percentage used in each production run. If over time it becomes necessary to increase the percentage because the oil is coming in weaker, this is documented with dates and reasons — concrete evidence to present to the supplier when needed.

### 🕯️ Special Candle Flow
Candles have a different process: they are sent for external filling and come back ready. The system tracks every step — when they left, to which supplier, when they returned — and only finalises the order when everything is complete.

### 🏢 Clients with Their Own Products
For clients like Coco Republic, who have their own branded products arriving from China, the system maintains a separate and exclusive stock for each client. One client's materials never mix with another's. The only part that comes from Scent Australia's general stock is the fragrance oil.

### 📷 Barcode Stock Entry
When products arrive from China, the team can use a barcode scanner to receive them into the system quickly. Faster, with no typing errors.

### 📈 Management Dashboard
A home screen with a complete view of the operation: what's running low in stock, which orders are active, which candles are awaiting return from the supplier, and which labels are being waited on. Everything in one place, updated in real time.

---

## Shopify Integration

The system works alongside Shopify, without replacing it. Each does what it does best:

| Shopify | Scented Merchandise |
|---------|---------------------|
| Client management | Production management |
| Payment confirmation | Stock control |
| Shipping label | Formula calculation |
| Commercial history | Materials tracking |

When an order is confirmed in Shopify, SM is automatically notified and begins the stock reservation process. The team doesn't need to duplicate information between the two systems.

**Important:** the system is configured to never send automatic emails to the client when a draft order is created — avoiding situations where the client receives a notification before the order is finalised.

---

## Business advantages

### Eliminates manual errors
Formula quantities are calculated by the system — they don't depend on memory or spreadsheets. The bill of materials for each product is defined and applied automatically.

### Total visibility
Anyone with access knows exactly where each order is, what's in stock and what's missing. No need to ask someone or search through spreadsheets.

### Complete traceability
Every stock movement is recorded: who did it, when, for which order. Full history available at any time.

### Waste reduction
Leftover formula and labels are recorded and used in future orders. Less waste, lower cost.

### Scalability
The system supports business growth. More clients, more products, more orders — without increasing operational complexity.

### Data for decision-making
Oil quality history, average production time per product type, stock levels over time — all available for decision-making based on real data.

---

## Security and access

The system has three access levels:

| Level | Who uses it | What they can do |
|-------|------------|-----------------|
| **Master Administrator** | Management | Full access, including user management |
| **Administrator** | Supervisors | Everything except user management |
| **Operator** | Warehouse team | Create orders, move stock, execute production |

Every action is recorded with the name of the responsible user.

---

## In summary

Scented Merchandise is the backbone of the brand extension operation. It connects the client's order, the physical stock and the production process in a single system — giving management complete visibility and the operational team clarity on what to do and when to do it.

**Less error. Less waste. More control. More speed.**
