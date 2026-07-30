# Ahead — P2 student app context for future AI agents

## Read this first

You are continuing work on **P2: the student-facing ordering page** for the Ahead canteen pre-order hackathon project. Do not replace this page with a framework, build tool, or a different database. The team is using plain HTML, CSS, and JavaScript so five independently built pages can be stitched together later.

The app’s purpose is simple: students browse the canteen menu, build a cart, submit an order, receive an easy-to-read token and pickup estimate, then see the vendor’s live status updates.

## Current project facts

- **Project name:** Ahead
- **P2 ownership:** student ordering page
- **Stack:** vanilla HTML/CSS/JS; no npm, framework, build system, or backend server
- **Actual database:** Supabase with Postgres and real-time enabled — the project started with Firebase in an early plan but switched to Supabase. Do not reintroduce Firestore/Firebase.
- **Shared data layer owner:** P1
- **Vendor portal owner:** P3
- **Wait-time / notifications owner:** P4
- **Popular items / demo polish owner:** P5

## Current P2 files

```text
student-app/
├── index.html                 # semantic single-page UI and Supabase CDN script
├── style.css                  # shared Ahead design system + responsive layout
├── app.js                     # menu, cart, order, live-status, live-crowd logic
├── assets/                    # local food photography supplied by the user
├── README.md                  # beginner-friendly run/integration instructions
├── AHEAD-P2-HANDOFF.md        # quick human-team handoff
└── P2-AI-CONTEXT.md           # this detailed AI handoff
```

## Required folder layout at integration time

P1’s finished queue engine must be next to this folder, not nested inside it:

```text
Ahead-project/
├── queue-engine/
│   ├── supabase-config.js
│   └── queue-engine.js
└── student-app/
    ├── index.html
    ├── style.css
    └── app.js
```

`index.html` loads the Supabase browser library from CDN. `app.js` then imports the shared queue-engine modules dynamically from `../queue-engine/`. This intentional fallback design means P2 still works on its own before final integration.

## Shared schema and naming

P1’s real Supabase database uses snake_case:

```text
menu
  id, name, price, prep_time_min, popularity_count

orders
  id, token, items, status, placed_at, estimated_ready_at

config
  id, avg_prep_time_per_item_min, max_concurrent_prep,
  daily_token_counter, token_date
```

The student UI normalises both snake_case and the earlier camelCase plan names. Do not rename database columns or status values.

Each `orders.items` value has this shape:

```js
[{ menuId: 'itm-01', name: 'Vada Pav', qty: 2 }]
```

## P1 API that P2 uses

P2 must use P1’s shared engine rather than duplicate database logic:

```js
createOrder(items)              // creates token, queue estimate, and a queued order
listenToOrders(callback)        // emits active orders whenever orders change
supabase.from('menu')           // P2 reads the current menu only
```

Do not recreate token generation, queue calculation, or direct order writes in P2. P1’s `createOrder()` is the single source of truth.

## Vendor status contract (P2 + P3)

There is no separate `approved` field in the locked schema. Use the established status transition exactly:

| Database status | Student wording in P2 | P3 vendor action |
| --- | --- | --- |
| `queued` | Awaiting approval | New order awaiting vendor action |
| `preparing` | Accepted — kitchen is preparing your order | This is the vendor approval action |
| `ready` | Ready for pickup | Food is ready |
| `picked_up` | Order collected | Order is closed |

P2 already listens to the placed order and updates its confirmation screen automatically when P3 changes its status. Do not add an approval-specific database field unless the full team agrees to alter the shared schema.

## What is implemented and working

1. **Standalone demo fallback**
   - If `../queue-engine/` is absent, P2 loads eight demo menu items and creates a local demo order.
   - This is for development only. It prevents P2 from blocking while P1’s folder is unavailable.

2. **Live menu mode**
   - When P1’s queue engine is available, the app reads the `menu` table through the shared Supabase client.
   - Menu data renders as responsive product cards with item photos, price, prep time, popularity badge, Add button, and quantity stepper.

3. **Cart and ordering**
   - Cart is a `Map` stored in browser memory.
   - Mobile uses a fixed bottom cart; desktop uses a right-side cart.
   - The Place order button calls `createOrder(items)`.

4. **Confirmation and live status**
   - Displays a large orange token, estimated pickup time, remaining wait time, and progress state.
   - `queued` appears as Awaiting approval; `preparing` appears as Accepted.
   - One active listener is maintained for the student’s placed order and is cleaned up before a new order listener starts.

5. **Real-time crowd meter**
   - A second `listenToOrders()` listener receives all active cloud orders.
   - The meter totals all quantities in `queued` + `preparing` orders:
     - 0–4 active items: Low crowd
     - 5–9: Steady crowd
     - 10+: Peak rush
   - This is live cloud data after integration, not a decorative timer. Thresholds live in `updateRushMeter()` in `app.js`.

6. **Food assets**
   - User-provided images are copied into `assets/` and mapped by menu ID in `MENU_PHOTOS` in `app.js`.
   - CSS crops them uniformly with `object-fit: cover`; no external image URLs are used.

## Design rules — preserve these

The visual system is shared with other team pages:

```css
--color-primary: #1d6f4f;
--color-primary-dark: #14503a;
--color-accent: #e08a2c;
--color-bg: #faf8f3;
--color-surface: #ffffff;
--color-text: #24291f;
--color-text-muted: #6b7266;
--color-border: #e2ddd0;
```

Keep the UI warm, food-forward, practical, and easy to scan while standing in a crowd. Avoid gradients, glassmorphism, emoji icons, oversized shadows, or generic landing-page visuals. Keep the token orange and use green for normal actions/statuses.

## How to run and verify

Use VS Code’s Live Server (or any local static server), never `file://` by double-clicking the HTML.

Quick checks:

1. Menu cards and food images appear.
2. Add an item; its card turns into a quantity stepper and the cart total updates.
3. Place an order; confirmation shows a token and “Awaiting approval.”
4. With the shared engine connected, change the same order in P3 from `queued` to `preparing`, then `ready`; P2 should update live.
5. Create multiple active orders; the crowd meter should change at 5 and 10 total item quantities.

## Safe future work

- Adjust crowd thresholds after testing real canteen volumes.
- Add a compact “order items” summary to the confirmation screen.
- Let P4 optionally add a browser notification when `status === 'ready'`.
- Improve accessibility labels or add a canteen-closed state if the team agrees on a data source for it.

## Do not change without team agreement

- Do not rename `queued`, `preparing`, `ready`, or `picked_up`.
- Do not add Firebase.
- Do not add a bundler, React, or package-install requirement.
- Do not duplicate P1’s token or wait-time logic.
- Do not move the queue engine into P2; both folders need to remain independently replaceable during final integration.

## Known hackathon limitation

P1’s current token generator uses a read-then-write counter. It is adequate for the hackathon but could theoretically duplicate a token if two orders are placed at precisely the same instant. A production version should use an atomic database-side increment.
