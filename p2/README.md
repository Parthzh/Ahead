# Ahead student app — run it in 5 minutes

This folder is P2's student-facing ordering page. It works by itself in **demo mode**, and it automatically switches to the live Ahead database after P1's shared `queue-engine` folder sits beside it.

## 1. Put the files in the right place

For now, open this folder exactly as it is. During integration, arrange the shared project like this:

```text
Ahead-project/
├── queue-engine/              ← P1's existing folder
│   ├── supabase-config.js
│   └── queue-engine.js
└── student-app/               ← this folder
    ├── index.html
    ├── style.css
    └── app.js
```

Do **not** add Firebase config to this page. The latest Ahead project context confirms the team switched to **Supabase** and P1’s queue engine already owns the shared Supabase connection.

## 2. Start it locally

The easiest beginner route is VS Code:

1. Install [Visual Studio Code](https://code.visualstudio.com/) if you do not already have it.
2. Install the **Live Server** extension by Ritwick Dey from the Extensions tab.
3. Open the `student-app` folder in VS Code.
4. Right-click `index.html` and choose **Open with Live Server**.
5. Your browser opens a local address such as `http://127.0.0.1:5500`.

Do not double-click `index.html` in File Explorer. The live page uses JavaScript modules, which browsers can block on `file://` addresses.

## 3. Verify the demo now

1. You should see eight menu items, including Vada Pav and Masala Chai.
2. Tap **Add**. It becomes a quantity stepper and the cart total changes.
3. Tap **Place order**.
4. You should see a large token, a wait time, and a three-step order-status row.

In standalone demo mode, the page deliberately uses sample menu data and a sample token. This lets you design, demo, and test the full student flow before the shared database folder is added.

## 4. Connect it to the real Ahead data

1. Ask P1 for the finished `queue-engine` folder described in the Ahead handoff.
2. Put `queue-engine` next to `student-app` exactly as shown in the folder diagram.
3. Ensure `queue-engine/supabase-config.js` contains P1's project URL and publishable key.
4. Restart Live Server and refresh the browser.
5. Open the browser console (press `F12`, then select **Console**). You should see:

   ```text
   Ahead: connected to shared queue engine.
   ```

6. The `Demo menu` label becomes `8 items available` (or however many items P1 has seeded). Place a test order, then have P3 change it from queued → preparing → ready. This screen updates through `listenToOrders()`.

`queued` is intentionally displayed to students as **Awaiting approval**. P3’s first vendor action, **Preparing**, is the approval signal: the student sees **Accepted — the kitchen is preparing your order now.**

The crowd label listens to all active shared orders in real time. It shows **Low crowd** below 5 items in active orders, **Steady crowd** at 5–9, and **Peak rush** at 10+. You can adjust those thresholds in `updateRushMeter()` in `app.js` if the canteen is busier or smaller.

## 5. What each file does

- `index.html` — page structure and accessible labels.
- `style.css` — the team’s shared green/orange design system plus responsive layout.
- `app.js` — menu loading, cart state, live order listener, and an automatic demo fallback.

## Before the hackathon demo

- Test on a narrow phone-size browser window: cart should stay pinned at the bottom.
- Add two items and change their quantities using both plus/minus buttons.
- Place five test orders with your team, then update one from the vendor dashboard and confirm its status and time refresh here.
- Read the confirmation token from a few steps away; it should still be easy to identify.
