<div align="center">
  
# 🚀 Ahead | Smart Canteen Ordering System
**Skip the line. Own your time.**

[![UI/UX](https://img.shields.io/badge/UI%2FUX-Glassmorphism-1d6f4f?style=for-the-badge)](https://github.com/Parthzh/Hypervisors-Parth)
[![Database](https://img.shields.io/badge/Database-Supabase-47c279?style=for-the-badge)](https://supabase.com/)
[![Audio](https://img.shields.io/badge/Engine-Web_Audio_API-e08a2c?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

</div>

## 📌 The Problem
College canteens are chaotic. During peak rush hours, students waste up to 30 minutes standing in line just to place an order, often resulting in missed classes or skipped meals. Vendors struggle to manage the massive influx of physical tokens and overlapping verbal orders, leading to delays and incorrect items.

## 💡 Our Solution: Ahead
**Ahead** is a premium, real-time smart ordering platform that completely eliminates the physical queue. Designed with an ultra-modern aesthetic and real-time backend, Ahead connects students directly to the kitchen. 

Students can browse the menu, form ordering squads with their friends, place their orders, and receive real-time updates—all while sitting in class or studying.

---

## ✨ Standout Features & Unique Innovations

### 1. 🔮 "X-Factor" Glassmorphism UI
We didn't just build a functional app; we built an **experience**. The entire application features a stunning, state-of-the-art Glassmorphism design system.
* **Ambient Lighting:** Dynamic, CSS-animated glowing orbs float in the background, responding to user scrolls.
* **Frosted Glass:** Navigation bars, decision cards, and summaries utilize deep `backdrop-filter` blurs for a premium iOS-like aesthetic.
* **Fluid Micro-interactions:** Every button and card features meticulously crafted hover states and smooth cubic-bezier scaling.

### 2. ⚡ Real-Time Supabase Queue Engine
We engineered a low-latency, real-time backend using **Supabase** (PostgreSQL). 
* When a student places an order, the **Vendor Dashboard** updates instantaneously via WebSockets without a page refresh.
* As the vendor progresses the order (Queued ➔ Preparing ➔ Ready), the student's app reflects the changes instantly.

### 3. 🤝 "Squad Cart" (Multiplayer Ordering)
Why order alone? We built a collaborative "Lobby" system where friends can join a shared session. 
* Multiple users can add items to the exact same cart simultaneously.
* The state is synced in real-time across all devices, making group orders incredibly seamless and fun.

### 4. 🎵 Native Web Audio API Synth Engine
Instead of relying on clunky `.mp3` files that bloat the repository, we built a custom audio engine from scratch using the **Web Audio API**.
* Generates pure, mathematical sine/triangle soundwaves directly in the browser.
* Provides delightful UI feedback: subtle high-frequency taps when clicking items, an ascending major chord when an order is placed, and a resonant, echoing bell when an order is marked "Ready".

### 5. 🎬 Bollywood Loading Quotes
To combat perceived wait times, we implemented a dynamic quote rotation system. While waiting for their order, students are entertained by famous, food-related Bollywood quotes, keeping the UX playful and culturally resonant.

---

## 🛠️ Architecture & Tech Stack

* **Frontend:** Vanilla HTML5, CSS3, ES6 JavaScript (Zero heavy frameworks, blazing fast load times)
* **Backend / Database:** Supabase (PostgreSQL)
* **Real-time Sync:** Supabase Realtime Channels (WebSockets)
* **Audio:** Native Web Audio API
* **Design System:** Custom CSS properties, Inter Font Family, Flexbox/Grid layouts.

## 📂 Project Structure
* `/student-app` - The primary mobile-first interface for students to browse and order.
* `/pages/squad-cart` - The multiplayer collaborative ordering lobby.
* `/pages/vendor-dashboard` - The real-time, low-latency control center for kitchen staff.
* `/pages/queue-engine` - The core database integration and WebSocket channel listeners.
* `/pages/audio` - The mathematical synthesizer engine for UI sounds.
* `/pages/PAyment placeholder` - The glassmorphism checkout and receipt view.

## 🚀 Getting Started (Local Development)
1. Clone this repository.
2. Run `pages/queue-engine/database-migration.sql` inside your Supabase SQL Editor.
3. Add your Supabase URL and Anon Key to `pages/queue-engine/supabase-config.js`.
4. Launch `student-app/index.html` using a local Live Server!
