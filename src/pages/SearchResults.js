import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ShoppingBag, ArrowLeft } from 'lucide-react'; 

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q"); 
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      // Logic: Find products where query is in name OR description OR tags
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.ilike.%${query}%`);

      if (!error) setProducts(data);
      setLoading(false);
    };

    if (query) fetchResults();
  }, [query]);

  if (loading) return <div style={styles.loader}>Searching our collection...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ArrowLeft size={18} /> BACK
        </button>
        <h2 style={styles.title}>RESULTS FOR "{query?.toUpperCase()}"</h2>
      </div>

      {products.length > 0 ? (
        <div style={styles.grid}>
          {products.map((item) => {
            // SAFE DATA EXTRACTION
            // 1. Get first image from main_images array
            const displayImg = item.main_images?.[0] || 'https://via.placeholder.com/300';
            
            // 2. Get first price from the first color and first size
            const displayPrice = item.variant_data?.[0]?.sizes?.[0]?.price;

            return (
              <div key={item.id} style={styles.card} onClick={() => navigate(`/product/${item.id}`)}>
                <div style={styles.imgWrapper}>
                  <img src={displayImg} alt={item.name} style={styles.img} />
                </div>
                <h3 style={styles.productName}>{item.name}</h3>
                
                {/* 3. Safety check for .toLocaleString() */}
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
          <p>No products match your search. Try different keywords.</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '40px 8%', maxWidth: '1400px', margin: 'auto', fontFamily: 'Inter, sans-serif' },
  header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '12px' },
  title: { fontSize: '18px', fontWeight: '900', letterSpacing: '1px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '30px' },
  card: { cursor: 'pointer', transition: 'transform 0.2s' },
  imgWrapper: { overflow: 'hidden', borderRadius: '8px', backgroundColor: '#f9f9f9', aspectRatio: '1/1' },
  img: { width: '100%', height: '100%', objectFit: 'cover' },
  productName: { fontSize: '14px', fontWeight: '600', marginTop: '15px', color: '#333' },
  price: { fontSize: '14px', fontWeight: '800', marginTop: '5px' },
  emptyState: { textAlign: 'center', marginTop: '100px', color: '#999' },
  loader: { textAlign: 'center', padding: '100px', fontWeight: '600', color: '#666' }
};