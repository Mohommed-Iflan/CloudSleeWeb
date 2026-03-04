import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Page Imports
import Home from './pages/Home';
import Login from './pages/Login';
import Checkout from './pages/Checkout';
import Success from './pages/Success';
import MyOrders from './pages/MyOrders';
import ReviewPage from './pages/ReviewPage';
import ReturnPage from './pages/ReturnPage';
import ProductDetails from './pages/ProductDetails';
import Navbar from './components/Navbar';
import Footer from './components/Footer'; // 1. IMPORT FOOTER
import SearchResults from './pages/SearchResults';
import Cart from './pages/Cart';
import AddProduct from './pages/AddProduct';
import AdminProducts from './pages/AdminProducts'; 
import AdminOrders from './pages/AdminOrders';
import AllProducts from './pages/AllProducts';

const AdminRoute = ({ children, user, adminEmail }) => {
  if (!user) return null; 
  if (user.email !== adminEmail) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const ADMIN_EMAIL = "mohommediflaan@gmail.com";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  return (
    <Router>
      {/* 2. WRAPPER FOR STICKY FOOTER */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        
        {/* 3. MAIN CONTENT GROWS TO FILL SPACE */}
        <main style={{ flex: 1 }}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/product/:productId" element={<ProductDetails />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/all-products" element={<AllProducts />} />
            
            {/* Order & Checkout Routes */}
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/success" element={<Success />} />
            <Route path="/my-orders" element={<MyOrders />} />
            <Route path="/review/:orderId" element={<ReviewPage />} />
            <Route path="/return/:orderId" element={<ReturnPage />} />

            {/* Protected Admin Routes */}
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin" element={<AdminProducts />} />
            <Route 
              path="/admin/add-product" 
              element={
                <AdminRoute user={user} adminEmail={ADMIN_EMAIL}>
                  <AddProduct />
                </AdminRoute>
              } 
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* 4. FOOTER SHOWS ON ALL PAGES */}
        <Footer />
      </div>
    </Router>
  );
}

export default App;