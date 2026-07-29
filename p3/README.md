# Ahead upgraded vendor dashboard

1. In Supabase, open **SQL Editor** and run `queue-engine/database-migration.sql` once.
2. Keep the two folders together exactly as delivered: `vendor-dashboard` imports its shared code from `../queue-engine`.
3. Serve the `Ahead-upgraded` folder through a local HTTP server.
4. Open `demo-orders.html` to create dummy orders, then open `vendor-dashboard/index.html` in another tab to operate the queue.

The migration is required: it creates the atomic token RPC and adds the `orders.priority` field. Without it, new orders cannot be created safely and priority changes will fail.
