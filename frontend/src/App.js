import React, { useState, useEffect } from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { CartProvider } from "./context/CartContext";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import PrivateRoute from "./components/PrivateRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Register from "./pages/Register";
import CustomerHome from "./pages/CustomerHome";
import ShopDetail from "./pages/ShopDetail";
import MyOrders from "./pages/MyOrders";
import CustomerDashboard from "./pages/CustomerDashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";
import Cart from "./pages/Cart";

// Guests see the marketing landing page; logged-in users go straight to the
// functional shop-discovery view.
function Home() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <CustomerHome /> : <Landing />;
}

function RoleDashboard() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.role === "owner") return <OwnerDashboard />;
  if (user?.role === "admin") return <AdminPanel />;
  if (user?.role === "customer") return <CustomerDashboard />;
  return <Navigate to="/" replace />;
}

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <ThemeProvider>
    <AuthProvider>
      <CartProvider>
      <BrowserRouter>
        <div className="h-screen flex flex-col overflow-hidden bg-bg w-full relative">
          <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
          <div className="flex flex-1 overflow-hidden min-h-0 relative">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <main className="flex-1 overflow-y-auto relative w-full">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/discover" element={<CustomerHome />} />
                <Route path="/shops/:shopId" element={<ShopDetail />} />
                <Route
                  path="/my-orders"
                  element={
                    <PrivateRoute allowedRoles={["customer"]}>
                      <MyOrders />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/cart"
                  element={
                    <PrivateRoute allowedRoles={["customer"]}>
                      <Cart />
                    </PrivateRoute>
                  }
                />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<PrivateRoute><RoleDashboard /></PrivateRoute>} />
                <Route
                  path="/owner/dashboard"
                  element={
                    <PrivateRoute allowedRoles={["owner"]}>
                      <OwnerDashboard />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <PrivateRoute allowedRoles={["admin"]}>
                      <AdminPanel />
                    </PrivateRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
      </CartProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
