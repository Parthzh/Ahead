# Ahead | Smart Canteen Ordering System
**Live Deployment:** [https://hypervisors-parth.vercel.app/](https://hypervisors-parth.vercel.app/)

## Overview
Ahead is a real-time, low-latency ordering system designed to eliminate physical bottlenecks in university canteens. By shifting the queueing process entirely online, Ahead optimizes kitchen workflows and allows students to reclaim time lost to waiting in physical lines.

---

## 🎯 The X-Factor: Squad Cart (Multiplayer Ordering)
Our primary technical innovation is the **Squad Cart**—a collaborative, multiplayer ordering lobby. 

In traditional ordering systems, one person is forced to pass their phone around or manually collect everyone's requests. Squad Cart solves this by allowing multiple users to join a shared session simultaneously. 
* **Real-Time Sync:** Powered by Supabase WebSockets, any item added or removed by one user instantly updates across all active clients in the lobby.
* **Race-Condition Handling:** The architecture ensures that concurrent additions don't override the global cart state, maintaining consistency across distributed clients.

## 🛠️ Core Features

### 1. Low-Latency Event Pipeline (Supabase)
The backbone of Ahead is built on Supabase (PostgreSQL). We utilized Supabase Realtime Channels to build a live data pipeline between the student interface and the vendor control center. Orders transition through states (`queued` -> `preparing` -> `ready`) instantly without relying on heavy HTTP polling.

### 2. Vendor Dispatch Dashboard
A streamlined, robust dashboard designed specifically for kitchen staff. It processes incoming data streams from the database in real-time, allowing vendors to triage, accept, and dispatch orders with single-click actions to minimize interaction time.

### 3. Native Web Audio Synthesis
To provide immediate UI feedback without the overhead of external `.mp3` assets, we engineered a custom audio module using the browser's native **Web Audio API**. This mathematically synthesizes discrete soundwaves (sine/triangle) for precise interactions, including a distinct resonant bell when an order is marked ready by the kitchen.

### 4. Dynamic State Handling
To reduce perceived latency and wait anxiety, the application utilizes dynamic loading states and conditional rendering (including a rotating list of culturally relevant quotes) to keep users engaged while their order is processed in the background.

---

## 💻 Tech Stack
* **Frontend:** Vanilla HTML5, CSS3, ES6 JavaScript
* **Backend:** Supabase (PostgreSQL)
* **Real-time Engine:** Supabase Realtime Channels (WebSockets)
* **Audio:** Web Audio API
* **Deployment:** Vercel

## 📂 Architecture
* `/student-app` - Core interface for menu browsing and individual checkout.
* `/pages/squad-cart` - The multiplayer, concurrent session lobby.
* `/pages/vendor-dashboard` - Admin control center for real-time order management.
* `/pages/queue-engine` - Shared library for database interactions and WebSocket listeners.
* `/pages/audio` - Web Audio API synthesis logic.
