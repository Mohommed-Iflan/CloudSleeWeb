import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ShoppingBag, ArrowLeft, ListFilter } from 'lucide-react'; 

export default function AllProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState('newest'); // State for filter
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllProducts = async () => {
      setLoading(true);
      
      let query = supabase.from('products').select('*');

      // Sort by Created At (Newest/Oldest)
      if (sortOption === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else if (sortOption === 'newest') {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (!error) {
        let sortedData = data;

        // Manual sort for Price (since price is nested in JSON)
        if (sortOption === 'price_low') {
          sortedData = [...data].sort((a, b) => 
            (a.variant_data?.[0]?.sizes?.[0]?.price || 0) - (b.variant_data?.[0]?.sizes?.[0]?.price || 0)
          );
        } else if (sortOption === 'price_high') {
          sortedData = [...data].sort((a, b) => 
            (b.variant_data?.[0]?.sizes?.[0]?.price || 0) - (a.variant_data?.[0]?.sizes?.[0]?.price || 0)
          );
        }

        setProducts(sortedData);
      }
      setLoading(false);
    };

    fetchAllProducts();
  }, [sortOption]); // Re-fetch when sortOption changes

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <ArrowLeft size={18} /> BACK
          </button>
          <h2 style={styles.title}>SHOP ALL PRODUCTS</h2>
        </div>

        {/* --- FILTER DROP-DOWN --- */}
        <div style={styles.filterWrapper}>
          <ListFilter size={16} color="#666" />
          <select 
            style={styles.select} 
            value={sortOption} 
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={styles.loader}>Loading our collection...</div>
      ) : products.length > 0 ? (
        <div style={styles.grid}>
          {products.map((item) => {
            const displayImg = item.main_images?.[0] || 'https://via.placeholder.com/300';
            const displayPrice = item.variant_data?.[0]?.sizes?.[0]?.price;

            return (
              <div key={item.id} style={styles.card} onClick={() => navigate(`/product/${item.id}`)}>
                <div style={styles.imgWrapper}>
                  <img src={displayImg} alt={item.name} style={styles.img} />
                </div>
                <h3 style={styles.productName}>{item.name.toUpperCase()}</h3>
                <p style={styles.price}>
                  Rs. {displayPrice ? Number(displayPrice).toLocaleString() : "0.00"}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={styles.emptyState}>
          <ShoppingBag size={48} color="#ccc" />
          <p>Our store is currently being updated. Check back soon!</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '40px 8%', maxWidth: '1400px', margin: 'auto', fontFamily: 'Inter, sans-serif' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '12px' },
  title: { fontSize: '18px', fontWeight: '900', letterSpacing: '1px' },
  
  // Filter Styles
  filterWrapper: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f5f5f5', padding: '5px 15px', borderRadius: '25px' },
  select: { border: 'none', background: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer', outline: 'none', color: '#333' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '30px' },
  card: { cursor: 'pointer', transition: 'transform 0.2s' },
  imgWrapper: { overflow: 'hidden', borderRadius: '8px', backgroundColor: '#f9f9f9', aspectRatio: '1/1' },
  img: { width: '100%', height: '100%', objectFit: 'cover' },
  productName: { fontSize: '13px', fontWeight: '600', marginTop: '15px', color: '#333', letterSpacing: '0.5px' },
  price: { fontSize: '14px', fontWeight: '800', marginTop: '5px' },
  emptyState: { textAlign: 'center', marginTop: '100px', color: '#999' },
  loader: { textAlign: 'center', padding: '100px', fontWeight: '600', color: '#666' }
};