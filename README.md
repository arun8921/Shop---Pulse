# Shop-Pulse

Full-stack project: Node.js/Express + MariaDB backend, React frontend.
See backend/ and frontend/ folders for their own setup notes.

## Quick start

1. Backend:
   cd backend
   mysql -u root -p < sql/schema.sql
   cp .env.example .env   # fill in your DB password + a JWT secret
   npm install
   npm run dev

2. Frontend (separate terminal):
   cd frontend
   npm install
   npm start

Both must be running at the same time (backend on :5000, frontend on :3000).

## What's new in this version
- Customers can cancel their own orders (while still 'placed' or 'confirmed')
  via a new "My Orders" page.
- Product search now returns shop coordinates too, so map markers show up
  during product search, not just the default nearby-browse view.
- Shop registration now has a click-to-pin-location map (LocationPicker
  component) instead of only typed coordinates or GPS auto-fill — click
  anywhere on the mini-map to drop a pin, or drag the pin to fine-tune, in
  addition to the "Use my current location" button.
# Shop---Pulse
