# Sales Dashboard — Product Requirements Document

## 1. Overzicht

Een intern salesdashboard dat real-time verkoopdata toont per medewerker, gebaseerd op Shopify order tags. Het systeem haalt orders op uit meerdere Shopify stores via custom Shopify apps, slaat data op in Supabase, en biedt een overzichtelijk dashboard met filtering, leaderboards en bonusconfiguratie.

### Tech Stack

| Component | Technologie |
|-----------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Auth | Clerk |
| Database | Supabase (PostgreSQL) |
| Data Source | Shopify Admin API (GraphQL) via Custom Apps |
| Hosting | Digital Ocean App Platform |
| Charts | Recharts |

---

## 2. Gebruikersrollen

### Admin
- Ziet alle data van alle medewerkers en stores
- Kan bonussen configureren (vast bedrag, percentage, staffel)
- Kan stores en medewerkers beheren
- Kan tags koppelen aan medewerkers

### Medewerker
- Ziet alleen eigen verkoopdata en orders
- Ziet het leaderboard (anoniem of met namen, configureerbaar door admin)
- Ziet eigen bonusvoortgang
- Kan filteren op periode

---

## 3. Functionele Eisen

### 3.1 Dashboard Hoofdpagina
- **KPI Cards**: Totale omzet, aantal orders, gemiddelde orderwaarde, refunds
- **Sales per tag/medewerker**: Staafdiagram en tabel
- **Trend grafiek**: Lijndiagram met omzet over tijd
- **Periodefilter**: Dag, week, maand, jaar, custom daterange
- **Store filter**: Dropdown met alle stores + "Alle stores" optie
- Admins zien alle medewerkers; medewerkers zien alleen eigen data

### 3.2 Orders Overzicht
- Tabel met alle orders gefilterd op tag/medewerker
- Kolommen: Ordernummer, Store, Datum, Klant, Totaal betaald, Refund bedrag, Netto bedrag, Status
- Klikbaar ordernummer → linkt naar Shopify admin
- Geannuleerde orders worden NIET getoond
- Refunds worden in mindering gebracht op het totaal
- Exporteerbaar naar CSV
- Paginering met 50 orders per pagina

### 3.3 Leaderboard
- Ranking per medewerker op basis van netto omzet
- Periodefilter: week, maand, jaar, custom
- Store filter
- Visueel aantrekkelijk met podium voor top 3
- Toon verschil in % t.o.v. vorige periode
- Medaille-iconen of kleuren voor top posities

### 3.4 Bonussen
- **Admin configuratie**:
  - Maak bonus aan met naam, type, periode, target
  - Bonustypen:
    - **Vast bedrag**: Bijv. €100 bij behalen van €10.000 omzet
    - **Percentage**: Bijv. 2% over alles boven target
    - **Staffel/tiers**: Meerdere niveaus met oplopende bonussen (bijv. €5k=€50, €10k=€150, €15k=€300)
  - Periodes: Wekelijks of maandelijks
  - Toewijzen aan individuele medewerkers of alle medewerkers
  - Bonussen activeren/deactiveren
- **Medewerker view**:
  - Voortgangsbalk richting target
  - Huidige bonus status (hoeveel verdiend, hoeveel nog te gaan)
  - Historische bonusuitbetalingen

### 3.5 Store Beheer (Admin)
- Stores toevoegen/bewerken/verwijderen
- Per store: naam, Shopify domain, API credentials (encrypted)
- Sync status en laatste sync timestamp
- Handmatige sync trigger per store

### 3.6 Medewerker Beheer (Admin)
- Medewerkers toevoegen/bewerken/deactiveren
- Koppel Shopify tag aan medewerker
- Koppel Clerk user aan medewerker
- Rol toewijzen (admin/medewerker)

---

## 4. Database Schema (Supabase)

### Tabel: `stores`
```sql
CREATE TABLE stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  shopify_domain VARCHAR(255) NOT NULL UNIQUE,
  api_key VARCHAR(255) NOT NULL,
  api_secret TEXT NOT NULL,
  access_token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabel: `employees`
```sql
CREATE TABLE employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tag VARCHAR(100) NOT NULL UNIQUE,
  clerk_user_id VARCHAR(255) UNIQUE,
  role VARCHAR(20) DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabel: `orders`
```sql
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  shopify_order_id BIGINT NOT NULL,
  order_number VARCHAR(50) NOT NULL,
  tag VARCHAR(100) NOT NULL,
  customer_name VARCHAR(255),
  total_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  refund_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(10,2) GENERATED ALWAYS AS (total_paid - refund_amount) STORED,
  financial_status VARCHAR(50) NOT NULL,
  order_date TIMESTAMPTZ NOT NULL,
  shopify_created_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, shopify_order_id, tag)
);

-- Index voor snelle queries op tag en datum
CREATE INDEX idx_orders_tag ON orders(tag);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_orders_store_date ON orders(store_id, order_date);
CREATE INDEX idx_orders_tag_date ON orders(tag, order_date);
CREATE INDEX idx_orders_financial_status ON orders(financial_status);
```

### Tabel: `bonus_configs`
```sql
CREATE TABLE bonus_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('fixed', 'percentage', 'tiered')),
  period VARCHAR(20) NOT NULL CHECK (period IN ('weekly', 'monthly')),
  target_amount DECIMAL(10,2),
  bonus_value DECIMAL(10,2),
  percentage_value DECIMAL(5,2),
  tiers JSONB,
  is_active BOOLEAN DEFAULT true,
  apply_to_all BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voorbeeld tiers JSON:
-- [
--   { "threshold": 5000, "bonus": 50 },
--   { "threshold": 10000, "bonus": 150 },
--   { "threshold": 15000, "bonus": 300 }
-- ]
```

### Tabel: `bonus_assignments`
```sql
CREATE TABLE bonus_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bonus_config_id UUID NOT NULL REFERENCES bonus_configs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bonus_config_id, employee_id)
);
```

### Tabel: `bonus_payouts`
```sql
CREATE TABLE bonus_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bonus_config_id UUID NOT NULL REFERENCES bonus_configs(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  sales_amount DECIMAL(10,2) NOT NULL,
  bonus_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Views
```sql
-- View: actieve orders (niet geannuleerd)
CREATE VIEW active_orders AS
SELECT * FROM orders
WHERE financial_status NOT IN ('voided', 'cancelled');

-- View: sales per medewerker per dag
CREATE VIEW daily_sales AS
SELECT
  tag,
  store_id,
  DATE(order_date) as sale_date,
  COUNT(*) as order_count,
  SUM(total_paid) as total_revenue,
  SUM(refund_amount) as total_refunds,
  SUM(total_paid - refund_amount) as net_revenue
FROM orders
WHERE financial_status NOT IN ('voided', 'cancelled')
GROUP BY tag, store_id, DATE(order_date);
```

### Row Level Security (RLS)
```sql
-- Employees kunnen alleen hun eigen orders zien
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can see all orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE clerk_user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Employees can see own orders" ON orders
  FOR SELECT USING (
    tag IN (
      SELECT tag FROM employees
      WHERE clerk_user_id = auth.uid()
    )
  );
```

---

## 5. API Routes

### Shopify Sync
| Method | Route | Beschrijving |
|--------|-------|-------------|
| POST | `/api/shopify/sync` | Sync orders van alle actieve stores |
| POST | `/api/shopify/sync/[storeId]` | Sync orders van specifieke store |
| POST | `/api/shopify/webhook` | Ontvang order webhooks van Shopify |

### Orders
| Method | Route | Beschrijving |
|--------|-------|-------------|
| GET | `/api/orders` | Haal orders op met filters (tag, store, periode) |
| GET | `/api/orders/export` | Exporteer orders naar CSV |

### Stats
| Method | Route | Beschrijving |
|--------|-------|-------------|
| GET | `/api/stats` | Dashboard KPIs en aggregaties |
| GET | `/api/stats/trends` | Omzet trends over tijd |

### Leaderboard
| Method | Route | Beschrijving |
|--------|-------|-------------|
| GET | `/api/leaderboard` | Ranking per periode en store |

### Bonussen
| Method | Route | Beschrijving |
|--------|-------|-------------|
| GET | `/api/bonuses` | Alle bonus configuraties |
| POST | `/api/bonuses` | Nieuwe bonus aanmaken |
| PUT | `/api/bonuses/[id]` | Bonus bewerken |
| DELETE | `/api/bonuses/[id]` | Bonus verwijderen |
| GET | `/api/bonuses/progress` | Bonusvoortgang per medewerker |

### Stores (Admin)
| Method | Route | Beschrijving |
|--------|-------|-------------|
| GET | `/api/stores` | Alle stores |
| POST | `/api/stores` | Store toevoegen |
| PUT | `/api/stores/[id]` | Store bewerken |
| DELETE | `/api/stores/[id]` | Store verwijderen |

### Employees (Admin)
| Method | Route | Beschrijving |
|--------|-------|-------------|
| GET | `/api/employees` | Alle medewerkers |
| POST | `/api/employees` | Medewerker toevoegen |
| PUT | `/api/employees/[id]` | Medewerker bewerken |
| DELETE | `/api/employees/[id]` | Medewerker deactiveren |

---

## 6. Shopify Integratie

### Custom App Setup (per store)
1. Ga naar Shopify Admin → Settings → Apps and sales channels → Develop apps
2. Maak een custom app aan met naam "Sales Dashboard"
3. Configureer Admin API scopes:
   - `read_orders` — Orders lezen
   - `read_products` — Productnamen (optioneel)
4. Installeer de app en kopieer de Access Token
5. Sla de credentials op in het dashboard (encrypted in Supabase)

### Order Data Ophalen
```typescript
// GraphQL query voor orders met tags
const ORDERS_QUERY = `
  query getOrders($cursor: String, $query: String) {
    orders(first: 50, after: $cursor, query: $query) {
      edges {
        node {
          id
          name              # Ordernummer (#1001)
          tags              # Array van tags
          totalPriceSet {
            shopMoney { amount, currencyCode }
          }
          currentTotalPriceSet {
            shopMoney { amount, currencyCode }
          }
          totalRefundedSet {
            shopMoney { amount, currencyCode }
          }
          displayFinancialStatus
          cancelledAt
          createdAt
          customer {
            displayName
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
```

### Sync Logica
1. **Initiële sync**: Haal alle orders op van de afgelopen 12 maanden
2. **Incrementele sync**: Haal alleen orders op die zijn gewijzigd sinds `last_synced_at`
3. **Webhook sync**: Ontvang real-time updates voor nieuwe/gewijzigde orders
4. **Tag matching**: Een order kan meerdere tags hebben; match alleen tags die gekoppeld zijn aan medewerkers
5. **Financiële berekening**:
   - `total_paid` = `currentTotalPriceSet` (wat de klant daadwerkelijk heeft betaald)
   - `refund_amount` = `totalRefundedSet`
   - Orders met `cancelledAt != null` of status `cancelled`/`voided` → skip

### Webhooks Configureren
Registreer webhooks via de Shopify Admin API:
- `orders/create` — Nieuwe order
- `orders/updated` — Order gewijzigd (inclusief refunds)
- `orders/cancelled` — Order geannuleerd
- `refunds/create` — Refund aangemaakt

Webhook endpoint: `https://jouw-domein.nl/api/shopify/webhook`
Verifieer de webhook signature met de app's shared secret.

---

## 7. Shopify Tag Strategie

### Hoe het werkt
- Elke medewerker krijgt een unieke tag gebaseerd op naam (bijv. `jan`, `piet`, `maria`)
- Bij elke verkoop voegt de medewerker zijn/haar tag toe aan de order in Shopify
- Het dashboard matcht order tags met medewerker tags uit de database
- Een order kan meerdere medewerker-tags hebben (split sale) — in dat geval wordt de order bij beide medewerkers geteld

### Tag Format
- Lowercase, geen spaties
- Gebruik voornaam of afkorting: `jan`, `piet-j`, `maria`
- Tags moeten uniek zijn per organisatie

---

## 8. Bonussysteem — Gedetailleerd

### Type: Vast Bedrag (`fixed`)
```json
{
  "type": "fixed",
  "period": "monthly",
  "target_amount": 10000,
  "bonus_value": 100
}
```
Bereik je €10.000 netto omzet in een maand → krijg je €100 bonus.

### Type: Percentage (`percentage`)
```json
{
  "type": "percentage",
  "period": "weekly",
  "target_amount": 5000,
  "percentage_value": 2.5
}
```
Alles boven €5.000 netto omzet per week → 2,5% bonus.

### Type: Staffel (`tiered`)
```json
{
  "type": "tiered",
  "period": "monthly",
  "tiers": [
    { "threshold": 5000, "bonus": 50 },
    { "threshold": 10000, "bonus": 150 },
    { "threshold": 15000, "bonus": 300 },
    { "threshold": 20000, "bonus": 500 }
  ]
}
```
De medewerker krijgt de bonus van het hoogste tier dat ze halen.

### Berekening
- Bonussen worden berekend over `net_amount` (total_paid - refund_amount)
- Geannuleerde orders tellen niet mee
- Periodes:
  - Week: maandag t/m zondag
  - Maand: 1e t/m laatste dag van de maand

---

## 9. Deployment — Digital Ocean

### App Platform Configuratie
```yaml
# .do/app.yaml
name: sales-dashboard
services:
  - name: web
    github:
      repo: jouw-org/sales-dashboard
      branch: main
      deploy_on_push: true
    build_command: npm run build
    run_command: npm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: professional-xs
    envs:
      - key: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: CLERK_SECRET_KEY
        scope: RUN_TIME
        type: SECRET
      - key: NEXT_PUBLIC_SUPABASE_URL
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: NEXT_PUBLIC_SUPABASE_ANON_KEY
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: SUPABASE_SERVICE_ROLE_KEY
        scope: RUN_TIME
        type: SECRET
      - key: SHOPIFY_WEBHOOK_SECRET
        scope: RUN_TIME
        type: SECRET
    routes:
      - path: /
jobs:
  - name: sync-orders
    github:
      repo: jouw-org/sales-dashboard
      branch: main
    build_command: npm run build
    run_command: npm run sync
    environment_slug: node-js
    instance_size_slug: professional-xs
    kind: PRE_DEPLOY
```

### Cron Job voor Sync
Digital Ocean App Platform ondersteunt scheduled jobs. Configureer een cron job die elke 15 minuten draait om orders te syncen:
- Of gebruik een externe cron service (bijv. cron-job.org)
- Of gebruik Shopify webhooks voor real-time updates (aanbevolen)

### Environment Variables
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

SHOPIFY_WEBHOOK_SECRET=whsec_...

DATABASE_URL=postgresql://...
```

---

## 10. Pagina Overzicht

| Route | Pagina | Rol |
|-------|--------|-----|
| `/` | Redirect naar `/dashboard` | Alle |
| `/sign-in` | Clerk sign-in | Public |
| `/sign-up` | Clerk sign-up | Public |
| `/dashboard` | Hoofddashboard met KPIs en grafieken | Alle |
| `/orders` | Orders tabel met filters | Alle |
| `/leaderboard` | Sales ranking | Alle |
| `/bonuses` | Bonusconfiguratie (admin) / Bonusoverzicht (employee) | Alle |
| `/settings` | Store en medewerker beheer | Admin |

---

## 11. Non-Functional Requirements

- **Performance**: Dashboard laadt binnen 2 seconden
- **Data freshness**: Orders worden gesynchroniseerd via webhooks (near real-time) + cron backup elke 15 min
- **Security**: API credentials encrypted at rest, Clerk handles auth, Supabase RLS voor data isolation
- **Responsive**: Desktop-first, maar bruikbaar op tablet
- **Browser support**: Chrome, Firefox, Safari (laatste 2 versies)
