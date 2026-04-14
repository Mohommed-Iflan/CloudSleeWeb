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
import Footer from './components/Footer'; 
import SearchResults from './pages/SearchResults';
import Cart from './pages/Cart';
import AddProduct from './pages/AddProduct';
import AdminProducts from './pages/AdminProducts'; 
import AdminOrders from './pages/AdminOrders';
import AllProducts from './pages/AllProducts';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ScrollToTop from './components/ScrollToTop';
import ContactUs from './pages/ContactUs';
import Settings from './pages/Settings';
import ResetPassword from './pages/ResetPassword';




// Helper component for Admin Access
const AdminRoute = ({ children, user, adminEmail }) => {
  if (!user) return <Navigate to="/login" replace />; 
  if (user.email !== adminEmail) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); 
  const ADMIN_EMAIL = "mohommediflaan@gmail.com";

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (authLoading) {
    return (
      <div style={loaderStyles}>
        <div className="spinner"></div>
        <p>Loading session...</p>
      </div>
    );
  }

  return (
    <Router>
      <ScrollToTop />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar user={user} />
        
        <main style={{ flex: 1 }}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/product/:productId" element={<ProductDetails />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/cart" element={<Cart user={user} />} />
            <Route path="/all-products" element={<AllProducts />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/contact" element={<ContactUs />} />
            
            {/* Protected User Routes */}
            <Route path="/settings" element={user ? <Settings user={user} /> : <Navigate to="/login" />} />
            <Route path="/checkout" element={user ? <Checkout user={user} /> : <Navigate to="/login" />} />
            <Route path="/success" element={<Success />} />
            <Route path="/my-orders" element={user ? <MyOrders user={user} /> : <Navigate to="/login" />} />
            <Route path="/review/:orderId" element={user ? <ReviewPage user={user} /> : <Navigate to="/login" />} />
            <Route path="/return/:orderId" element={user ? <ReturnPage user={user} /> : <Navigate to="/login" />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected Admin Routes */}
            <Route 
              path="/admin/orders" 
              element={
                <AdminRoute user={user} adminEmail={ADMIN_EMAIL}>
                  <AdminOrders />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <AdminRoute user={user} adminEmail={ADMIN_EMAIL}>
                  <AdminProducts />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/add-product" 
              element={
                <AdminRoute user={user} adminEmail={ADMIN_EMAIL}>
                  <AddProduct />
                </AdminRoute>
              } 
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

const loaderStyles = { 
  display: 'flex', 
  flexDirection: 'column',
  justifyContent: 'center', 
  alignItems: 'center', 
  height: '100vh', 
  fontFamily: "'Inter', sans-serif",
  color: '#666',
  gap: '15px'
};

export default App;