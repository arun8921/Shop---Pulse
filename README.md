# Shop-Pulse

Shop-Pulse is a full-stack local shop discovery and ordering platform that connects customers with nearby independent shops in real time.

The platform allows customers to discover nearby shops, search for products, check availability, place and track orders, while shop owners can manage their shops, products and orders. Administrators can manage the platform through a dedicated admin panel.

## Tech Stack

### Frontend
- React.js
- React Router
- Tailwind CSS
- Lucide React
- Leaflet / OpenStreetMap

### Backend
- Node.js
- Express.js
- REST API

### Database
- MariaDB

### Authentication & Security
- JWT-based authentication
- Role-based access control
- Protected routes

### Development Tools
- Git
- GitHub
- VS Code
- Postman

---

## Main Features

### Customer

- User registration and login
- Discover nearby shops using location
- Search for products
- Filter shops based on distance
- View shop details
- View product availability
- Place orders
- View order history
- Cancel eligible orders
- Track order status
- Customer dashboard
- Light / dark theme

### Shop Owner

- Owner authentication
- Shop owner dashboard
- Manage shop information
- Add and manage products
- Manage product availability and stock
- View incoming orders
- Update order status
- Monitor shop activity

### Administrator

- Admin authentication
- Admin dashboard
- Manage users and platform data
- Monitor shops and customers
- Administrative controls

### Location & Maps

Shop-Pulse uses map-based location functionality to help customers discover nearby shops.

Features include:

- Current location detection
- Radius-based shop discovery
- Interactive map
- Shop markers
- Product-search-based shop locations
- Manual location selection
- Click-to-place location pin
- Location fine-tuning using the map

---

## Application Flow

```text
                    Shop-Pulse
                        |
             +----------+----------+
             |                     |
          Customer              Shop Owner
             |                     |
       Discover Shops         Manage Shop
             |                     |
       Search Products        Manage Products
             |                     |
        Place Orders          Manage Orders
             |
        Track Orders

                  Administrator
                       |
                Admin Dashboard
                       |
              Platform Management
