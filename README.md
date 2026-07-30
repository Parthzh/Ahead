# Ahead

Queue & pre-order system for canteen peak hours — live tokens, wait-time estimates, and a vendor dashboard. Built with HTML/JS + Firebase.

Ahead lets students place canteen orders ahead of time instead of standing in line during peak hours. Orders sync in real time between the student app and the vendor console, so a request placed by a student shows up instantly for vendor approval.

## Features

- 🎟️ **Live tokens** — students get a queue token for their order instead of waiting in a physical line
- ⏱️ **Wait-time estimates** — see roughly how long an order will take before committing
- 🛎️ **Real-time sync** — orders placed by students appear instantly on the vendor dashboard
- ✅ **Vendor approval console** — vendors can review and approve/reject incoming orders as they come in

## Tech Stack

- HTML, CSS, and vanilla JavaScript on the front end
- Firebase for the real-time backend/database

## Project Structure

```
Ahead/
├── index.html              # Landing page linking to the two demo apps
└── pages/
    ├── student-app/         # Student ordering interface
    ├── vendor-dashboard/     # Vendor approval console
    ├── queue-engine/
    ├── wait-time/
    └── payment-placeholder/
```

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/Parthzh/Ahead.git
   cd Ahead
   ```
2. Set up Firebase and run the database migration once (required before the apps will work).
3. Serve the project folder with a local server, e.g. the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) VS Code extension.
4. Open `index.html` to reach the demo landing page, then:
   - Open the **student app** (`pages/student-app/index.html`) in one browser tab to place an order
   - Open the **vendor dashboard** (`pages/vendor-dashboard/index.html`) in another tab to approve it

Orders placed in the student tab should appear instantly in the vendor tab for approval.

## License

No license has been specified for this project yet.
