# Ahead P2 — student ordering app handoff

## What is complete

This is the student-facing ordering page for **Ahead**, the canteen pre-order system. It is a framework-free, mobile-first page with local food assets, cart management, order confirmation, a large pickup token, wait-time display, vendor-status updates, combo suggestions, and a live crowd signal.

## Shared project contract

The current project uses **Supabase**, not Firebase. P1 owns these shared files:

```text
queue-engine/
├── supabase-config.js
└── queue-engine.js
```

Put this `student-app` folder beside `queue-engine`. `app.js` automatically imports:

- `createOrder(items)` to insert a new order
- `listenToOrders(callback)` to update both the student’s order and the live crowd meter
- `supabase` to fetch the current menu

`index.html` includes the required Supabase CDN script. No project key is duplicated in this folder.

## Vendor portal coordination

There is no separate approval field in the locked schema. The agreed status sequence handles it cleanly:

| Shared database status | Student wording | Vendor meaning |
| --- | --- | --- |
| `queued` | Awaiting approval | New order; vendor needs to accept it |
| `preparing` | Accepted — kitchen is preparing it | Vendor’s first action / approval |
| `ready` | Ready for pickup | Vendor marks food ready |
| `picked_up` | Order collected | Vendor closes order |

P3 should keep the existing status values exactly as above. P2 does not need any change when the vendor dashboard is added; the listener already reacts to P3’s updates.

## Live crowd logic

The crowd signal gets every active `queued` and `preparing` order from P1’s `listenToOrders()` function and totals item quantities:

- 0–4 items: **Low crowd**
- 5–9 items: **Steady crowd**
- 10+ items: **Peak rush**

This is deliberately based on cloud data, rather than a visual demo timer. P4 can adjust the thresholds or connect a more detailed queue metric later without changing the screen layout.

## Local visual assets

All provided images are copied into `assets/` and mapped to the corresponding menu IDs in `app.js`. CSS applies `object-fit: cover`, so the menu cards crop them consistently without editing original photos.

## Demo and test checklist

1. Start `student-app` with Live Server.
2. Add food, change quantities, and place an order.
3. Confirm the initial message says that the order is awaiting canteen approval.
4. In P3’s vendor dashboard, move the same order to `preparing`. The student page should change to Accepted automatically.
5. Move it to `ready`; the progress state and message should update.
6. Place several orders in quick succession. The crowd label should move through low, steady, and peak based on the shared database.

## Important limitation to mention only if asked

P1’s current daily token counter uses a read-then-write sequence. It is adequate for the hackathon demo but could theoretically collide if two students order at exactly the same instant. A production build should make this database operation atomic.
