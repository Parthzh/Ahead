# Ahead — upgraded vendor console handoff

This document is the handoff context for another agent. It explains the exact state of the upgraded project, why each file exists, how the files connect, and the intended vendor workflow.

## 1. Project goal and current product decision

Ahead is a plain HTML/CSS/JavaScript canteen pre-order and queue system backed by Supabase. There is no framework or build step.

The original vendor dashboard was a three-column kanban board (`queued`, `preparing`, `ready`). It was replaced with a deliberately minimal **vendor approval console** for rush periods:

1. The largest area displays exactly one **current queued order**.
2. The vendor can **Approve** it or **Reject** it.
3. The next queued orders appear below as compact rows, with the same actions.
4. The vendor can make menu items available or unavailable through simple toggles.
5. The page keeps live data in sync through Supabase Realtime.

This is intentionally an acceptance screen, not a full kitchen-production board. Approving an order changes its status to `preparing`, so it disappears from the approval queue. The dashboard displays a count of orders in preparation, but does not provide a “mark ready” action in this new minimal UI.

## 2. Delivered folder layout

```
Ahead-upgraded/
├── AHEAD-UPGRADE-CONTEXT.md       # this handoff
├── README.md                      # concise setup instructions
├── demo-orders.html               # customer-side dummy menu / order generator
├── queue-engine/
│   ├── database-migration.sql     # MUST be run in Supabase SQL Editor
│   ├── supabase-config.js         # creates the shared browser Supabase client
│   ├── queue-engine.js            # shared data access, retries, realtime listeners
│   └── seed.js                    # sample menu seed function
└── vendor-dashboard/
    ├── index.html                 # vendor console DOM structure
    ├── app.js                     # vendor console behaviour
    └── style.css                  # focused dialog-style visual design
```

Keep the relative layout unchanged. `vendor-dashboard/app.js` imports the engine with `../queue-engine/queue-engine.js`, while `demo-orders.html` imports it with `./queue-engine/queue-engine.js`.

## 3. Required database state

The original project already has these public Supabase tables:

- `menu`: `id`, `name`, `price`, `prep_time_min`, `popularity_count`
- `orders`: `id`, `token`, `items` (JSONB), `status`, `placed_at`, `estimated_ready_at`
- `config`: the single queue configuration row, with `id = 1`

`orders` must be included in the `supabase_realtime` publication. For availability controls to update live on the demo page, add `menu` to the same publication as well.

### Mandatory migration

Run `queue-engine/database-migration.sql` in the Supabase SQL Editor before using the package:

1. Adds `orders.priority` with `normal`, `urgent`, and `vip` values. This is retained from the earlier dashboard improvement.
2. Adds `menu.available boolean not null default true`. The vendor availability switches write this field.
3. Creates `public.next_order_token()`, an atomic Postgres function that increments the daily token counter and returns `A-001`, `A-002`, etc.
4. Grants `anon` and `authenticated` callers permission to execute the function.

The atomic SQL function is important: `createOrder()` no longer performs a client-side read/increment/write sequence, avoiding duplicate tokens during simultaneous orders.

Do not remove the migration or change the RPC name without changing `generateToken()` in `queue-engine/queue-engine.js`.

## 4. Shared queue engine: detailed responsibility map

File: `queue-engine/queue-engine.js`

### Lines 1–9: constants and retry configuration

- Imports the shared Supabase client.
- `ACTIVE_STATUSES` includes only `queued` and `preparing`; these orders affect ETA calculations.
- `VALID_STATUSES` permits `queued`, `preparing`, `ready`, `picked_up`, and `cancelled`.
- `RETRY_DELAYS_MS` defines three retry pauses (400ms, 1s, 2s).

### Lines 11–28: generic retry helper

`withRetry(operation, description)` runs transient database actions up to four total attempts. It logs and throws the final failure. It is used for order creation, status updates, priority updates, and menu availability updates.

### Lines 30–43: configuration and token utility

- `getConfig()` reads the one queue configuration row.
- `itemCount()` sums quantities in order item arrays.
- `generateToken()` calls the `next_order_token` RPC created by the SQL migration.

### Lines 45–68: `createOrder(items)`

- Validates that there is at least one item.
- In parallel, gets an atomic token, the config, and the current active queue.
- Calculates a basic estimated ready time.
- Inserts an order with `status: 'queued'` and `priority: 'normal'`.

The dummy menu invokes this function. Any student ordering app must continue using it rather than inserting directly into `orders`.

### Lines 70–83: `updateOrderStatus(orderId, newStatus)`

- Validates status input.
- Updates one `orders.status` value with retry protection.
- Recalculates remaining active order ETAs after every update.

The vendor console uses this for both paths:

| Vendor action | Database status |
|---|---|
| Approve | `preparing` |
| Reject | `cancelled` |

Cancelled orders are intentionally not deleted. This preserves their record for later reporting, while removing them from active listeners.

### Lines 85–93: priority support

`updateOrderPriority()` remains available for future UI work but is not shown in the redesigned minimal console.

### Lines 95–102: menu availability support

`updateMenuAvailability(itemId, available)` writes the `menu.available` boolean. The vendor console calls it when a toggle changes.

### Lines 104–117: `listenToMenu(callback)`

- Fetches menu rows (`id`, `name`, `price`, `available`) sorted by name.
- Opens a `menu-changes` Realtime channel.
- Calls the supplied callback whenever the menu changes.

For cross-tab live availability, `menu` needs to be enabled in Supabase Realtime. If it is not, updates still take effect after a page refresh.

### Lines 119–135: ETA recalculation

`recalculateWaitTimes()` queries active orders, calculates their batch position, and updates `estimated_ready_at` for each. It uses parallel updates instead of sequential updates.

### Lines 137–159: `listenToOrders(callback, options)`

- Fetches every active displayable order, excluding `picked_up` and `cancelled`.
- Sends `connecting`, `live`, and `disconnected` connection-state updates to the caller.
- Opens the `orders-changes` Realtime channel.
- Automatically retries failed fetches with exponential backoff.
- Returns an unsubscribe function that also exposes `.refresh()` for a manual reconnect/refresh.

## 5. Vendor console: HTML and interaction map

Files: `vendor-dashboard/index.html`, `vendor-dashboard/app.js`, `vendor-dashboard/style.css`

### `index.html`

- **Lines 1–12:** page metadata, local stylesheet, and required Supabase CDN script.
- **Lines 13–21:** dialog-like `main.vendor-console`, title, and live connection state.
- **Lines 23–26:** connection problem banner and lightweight queue count/refresh controls.
- **Lines 28–38:** the three purposeful UI sections: current decision, upcoming queue, and menu availability.
- **Lines 40–42:** native confirmation dialog used before approval or rejection.
- **Line 43:** starts module script `app.js`.

### `app.js`

- **Lines 1–9:** imports queue and menu functions, creates lightweight in-memory page state, and stores DOM references.
- **Lines 11–19:** renders connection status and the reconnect banner.
- **Lines 21–28:** receives all active orders, keeps only `queued` orders for approval display, and calculates counts.
- **Lines 30–35:** splits queued orders into one current order and the remaining upcoming list.
- **Lines 37–49:** builds the large current order card. It displays token, age, items, plus Approve/Reject actions.
- **Lines 51–61:** builds a compact upcoming order row with the same two actions.
- **Lines 63–79:** builds one availability switch per menu item. Changing the switch calls `updateMenuAvailability()` and rolls back visually on failure.
- **Lines 81–89:** displays the native confirmation dialog and commits the status change. Approve sends `preparing`; Reject sends `cancelled`.
- **Lines 91–100:** small DOM helpers and listener startup/cleanup.

There is no full `innerHTML = ''` board rebuild. New DOM is built only for the current/upcoming render areas after realtime data arrives; the UI is intentionally small because a vendor only sees queued decisions.

### `style.css`

The CSS uses a neutral canvas and a white, centered, max-width dialog surface. This was chosen to avoid a distracting dashboard/card-grid feel.

Important visual blocks:

- `.vendor-console`: large centered dialog, scrollable on short screens.
- `.decision-card`: the highest-priority current order card with a restrained green left rule.
- `.upcoming-row`: compact non-card rows so upcoming orders do not compete visually with the current decision.
- `.availability-list`: quiet two-column switch list, becoming one column on mobile.
- `.button-primary` and `.button-danger`: clear but non-flashy approve/reject actions.

## 6. Dummy order page

File: `demo-orders.html`

This is not a production customer UI. It exists only to demonstrate the vendor console quickly.

- Loads the Supabase CDN and the shared queue engine.
- Calls `listenToMenu()` rather than using a hard-coded menu.
- Shows only `menu.available === true` items.
- Adds items to a local browser cart.
- Sends the cart to `createOrder()` when “Place dummy order” is selected.
- Shows the generated token after a successful insert.

Open this page in one tab and `vendor-dashboard/index.html` in another, both served through the same local HTTP server. Place demo orders, then approve/reject them in the vendor tab. Toggle a menu item off in the vendor tab and it should disappear from the demo menu if `menu` Realtime is enabled.

## 7. Running the package

1. Open Supabase SQL Editor and run `queue-engine/database-migration.sql` once.
2. Ensure `orders` and `menu` are enabled for the `supabase_realtime` publication.
3. Seed menu data if it does not exist. The `seedMenu()` helper in `queue-engine/seed.js` can be invoked from a one-off module page, or insert rows in Supabase directly.
4. Serve `Ahead-upgraded` with a local HTTP server, such as VS Code Live Server. Do not double-click the HTML files with `file://`.
5. Visit `/demo-orders.html` and `/vendor-dashboard/index.html`.

## 8. Validation performed

- The JavaScript syntax of `queue-engine/queue-engine.js`, `vendor-dashboard/app.js`, and the module script in `demo-orders.html` was checked with the bundled Node runtime.
- No live Supabase writes or browser rendering test was run by this agent. Use the steps above for an end-to-end manual test.

## 9. Constraints and future changes

- Do not expose a Supabase `service_role` key in browser files. The existing client only uses the publishable/anon key from `supabase-config.js`.
- The current console deliberately hides `preparing` and `ready` cards. Add a separate kitchen-progress view if vendors need to mark approved orders ready/picked up.
- `cancelled` records remain in the database but are excluded from active order listeners. Add analytics/history reporting if cancelled-order reporting is needed.
- Menu availability only hides an item in clients that respect `menu.available`. All future ordering pages should use `listenToMenu()` or filter their queried menu with `available = true`.
- If the `orders.status` column later gets a database check constraint, add `cancelled` to it.
