# Shop-Pulse — Frontend Starter

A React app wired to your working backend. Covers: login/register, customer
home (nearby shop search + map + product search), shop detail (products,
ordering, reviews), owner dashboard (shop status, products, incoming orders),
and an admin panel (shop verification + CSV bulk upload).

## 1. Prerequisites
- Your backend must already be running on `http://localhost:5000`
  (if it's on a different port, edit `src/api/axiosClient.js`)

## 2. Install and run

```bash
cd frontend
npm install
npm start
```

This opens `http://localhost:3000` in your browser automatically.

## 3. How to use it

1. **Register** as a customer, then log out and register again as an **owner**
   (use a different email) — you'll need both roles to see the full picture.
2. As the **owner**: you'll land on an empty dashboard prompting you to
   register a shop. Fill in the form (use "Use my current location" to
   auto-fill latitude/longitude), then toggle it open, and add a few products.
3. As the **customer**: go to the home page, allow location access (or it'll
   default to a fallback location), and you should see your shop on the map
   and in the list. Try the product search box too.
4. Click "View shop" on any shop card to see its full product list, place an
   order, and leave a review.
5. As the **owner** again: go to your dashboard to see the incoming order and
   move it through Confirmed → Out for delivery → Delivered.
6. For the **admin panel**: register a user with role admin directly via the
   backend (the registration dropdown in the UI only offers customer/owner on
   purpose, since admin accounts shouldn't be self-service in a real app):
   ```bash
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name": "Admin", "email": "admin@shoppulse.com", "password": "password123", "role": "admin"}'
   ```
   Then log in with that email/password in the UI — you'll be redirected to `/admin`.

## 4. Notes on what's simplified for the mini-project scope

- **Polling, not WebSockets**: shop status on the customer home page refreshes
  every 25 seconds via polling (`src/pages/CustomerHome.jsx`), matching the
  backend design decision.
- **No image uploads yet**: products are text/price/status only, matching the
  current backend schema.
- **Map markers on product search**: the product search endpoint doesn't
  currently return shop latitude/longitude, so map markers only show for the
  default nearby-shops view, not for product search results. The shop list
  still works either way. (Easy to fix later by adding lat/lng to the
  `/products/search` SQL query if you want markers there too.)

## Project structure
```
frontend/
  public/index.html
  src/
    api/axiosClient.js       -> shared axios instance, attaches JWT automatically
    context/AuthContext.js   -> login/register/logout state, shared app-wide
    components/
      Navbar.js
      PrivateRoute.js        -> route guard (login required + optional role check)
    pages/
      Login.jsx / Register.jsx
      CustomerHome.jsx       -> nearby search, radius filter, map, product search
      ShopDetail.jsx         -> products, ordering, reviews
      OwnerDashboard.jsx     -> shop registration, status toggle, products, orders
      AdminPanel.jsx         -> shop verification, CSV bulk upload
      NotFound.jsx
    index.css                -> design tokens (colors, type, the pulse-dot signature)
    App.js                   -> routing
    index.js                 -> entry point
```
