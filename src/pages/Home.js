import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Products (variant_data is a column here, no join needed)
        const { data: productsData, error: prodError } = await supabase
          .from('products')
          .select('*'); 
        
        if (prodError) throw prodError;
        if (productsData) setProducts(productsData);

        // 2. Get User Session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);
          fetchUserCart(session.user.id);
        } else {
          const savedCart = JSON.parse(localStorage.getItem('temp_cart') || '[]');
          setCart(savedCart);
        }
      } catch (err) {
        console.error("❌ DATA FETCH ERROR:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session) fetchUserCart(session.user.id);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const fetchUserCart = async (userId) => {
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        products (*)
      `)
      .eq('user_id', userId);

    if (error) {
        console.error("Cart fetch error:", error.message);
    } else if (data) {
      // Map the data to include the selected variants if saved in cart_items
      setCart(data.map(item => ({
          ...item.products,
          selected_color: item.selected_color,
          selected_size: item.selected_size
      })).filter(p => p !== null));
    }
  };

  // Helper to get price from JSON for the homepage display
  const getDisplayPrice = (variantData) => {
    if (!variantData || variantData.length === 0) return 0;
    // Drill down: First Color > First Size > Price
    return variantData[0]?.sizes?.[0]?.price || 0;
  };

  const calculateTotal = () => {
    return cart.reduce((acc, item) => {
      // Find price from JSON based on selected variant or default to first
      const colorObj = item.variant_data?.find(v => v.name === item.selected_color) || item.variant_data?.[0];
      const sizeObj = colorObj?.sizes?.find(s => s.size === item.selected_size) || colorObj?.sizes?.[0];
      const price = sizeObj?.price || 0;
      return acc + Number(price);
    }, 0);
  };

  return (
    <div style={styles.container}>
      <header style={styles.hero}>
        <h2 style={styles.heroTitle}>WALK ON CLOUDS.</h2>
        <p style={styles.heroSub}>Premium comfort for your every step.</p>
      </header>

      <main style={styles.main}>
        {loading ? (
          <div style={styles.loader}>LOADING COLLECTION...</div>
        ) : (
          <div style={styles.grid}>
            {products.length === 0 ? (
              <div style={{ textAlign: 'center', gridColumn: '1/-1' }}>
                <p style={{ color: '#999' }}>No products found.</p>
              </div>
            ) : (
              products.map((item) => {
                const displayPrice = getDisplayPrice(item.variant_data);
                const displayImage = item.main_images?.[0] || 'https://via.placeholder.com/350x350?text=No+Image';

                return (
                  <div 
                    key={item.id} 
                    style={styles.card} 
                    onClick={() => navigate(`/product/${item.id}`)}
                  >
                    <div style={styles.imageWrapper}>
                        <img src={displayImage} alt={item.name} style={styles.image} />
                    </div>
                    <h3 style={styles.prodName}>{item.name?.toUpperCase() || 'NEW ARRIVAL'}</h3>
                    <p style={styles.price}>
                      {displayPrice > 0 ? `Rs. ${Number(displayPrice).toLocaleString()}` : 'OUT OF STOCK'}
                    </p>
                    <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/product/${item.id}`);
                      }} 
                      style={styles.addBtn}
                    >
                      VIEW OPTIONS
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {cart.length > 0 && (
        <div style={styles.checkoutBar}>
          <span style={styles.barText}>
            {cart.length} {cart.length === 1 ? 'ITEM' : 'ITEMS'} | TOTAL: Rs. {calculateTotal().toLocaleString()}
          </span>
          <button onClick={() => navigate('/checkout')} style={styles.checkoutBtn}>
            PROCEED TO CHECKOUT
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { fontFamily: "'Inter', sans-serif", backgroundColor: '#ffffff', minHeight: '100vh' },
  hero: { textAlign: 'center', padding: '100px 20px', backgroundColor: '#fafafa' },
  heroTitle: { fontSize: '3.5rem', fontWeight: '900', letterSpacing: '-2px', margin: 0 },
  heroSub: { fontSize: '14px', color: '#888', marginTop: '10px', textTransform: 'uppercase', letterSpacing: '2px' },
  main: { padding: '60px 8%' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '50px' },
  card: { textAlign: 'left', cursor: 'pointer' },
  imageWrapper: { width: '100%', height: '380px', overflow: 'hidden', marginBottom: '20px', borderRadius: '4px', backgroundColor: '#f0f0f0' },
  image: { width: '100%', height: '100%', objectFit: 'cover' },
  prodName: { fontSize: '13px', fontWeight: '700', margin: '0 0 8px 0', letterSpacing: '0.5px' },
  price: { color: '#666', fontSize: '13px', marginBottom: '20px' },
  addBtn: { width: '100%', padding: '16px', border: '1px solid #000', backgroundColor: 'transparent', fontWeight: '700', fontSize: '11px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' },
  checkoutBar: { position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#000', padding: '18px 40px', display: 'flex', gap: '40px', alignItems: 'center', zIndex: 1000, borderRadius: '60px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' },
  barText: { color: '#fff', fontSize: '12px', fontWeight: '600', letterSpacing: '1px' },
  checkoutBtn: { backgroundColor: '#fff', color: '#000', border: 'none', padding: '10px 25px', fontWeight: '800', fontSize: '11px', cursor: 'pointer', borderRadius: '30px' },
  loader: { textAlign: 'center', marginTop: '100px', color: '#aaa', fontSize: '11px', letterSpacing: '3px' }
};