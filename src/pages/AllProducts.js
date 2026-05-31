import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ShoppingBag, ArrowLeft, ListFilter, Users } from 'lucide-react'; 

export default function AllProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState('newest'); 
  const [genderFilter, setGenderFilter] = useState('all'); 
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllProducts = async () => {
      setLoading(true);
      
      let query = supabase.from('products').select('*');

      if (genderFilter !== 'all') {
        query = query.eq('gender', genderFilter);
      }

      if (sortOption === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else if (sortOption === 'newest') {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (!error) {
        let sortedData = data;

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
  }, [sortOption, genderFilter]);

  return (
    <div style={styles.container} className="catalog-root-wrapper">
      <div style={styles.header} className="catalog-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }} className="catalog-title-group">
          <button onClick={() => navigate(-1)} style={styles.backBtn} className="catalog-back-btn">
            <ArrowLeft size={18} /> BACK
          </button>
          <h2 style={styles.title} className="catalog-main-title">SHOP ALL PRODUCTS</h2>
        </div>

        <div style={styles.controlsGroup} className="catalog-filter-controls">
          {/* --- GENDER FILTER --- */}
          <div style={styles.filterWrapper} className="catalog-dropdown-wrapper">
            <Users size={16} color="#666" />
            <select 
              style={styles.select} 
              value={genderFilter} 
              onChange={(e) => setGenderFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="Men">Men</option>
              <option value="Women">Women</option>
              <option value="Kids">Kids</option>
              <option value="Unisex">Unisex</option>
            </select>
          </div>

          {/* --- SORT DROP-DOWN --- */}
          <div style={styles.filterWrapper} className="catalog-dropdown-wrapper">
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
      </div>

      {loading ? (
        <div style={styles.loader}>Loading our collection...</div>
      ) : products.length > 0 ? (
        <div style={styles.grid} className="catalog-products-grid">
          {products.map((item) => {
            const displayImg = item.main_images?.[0] || 'https://via.placeholder.com/300';
            const displayPrice = item.variant_data?.[0]?.sizes?.[0]?.price;

            return (
              <div key={item.id} style={styles.card} className="catalog-card-item" onClick={() => navigate(`/product/${item.id}`)}>
                <div style={styles.imgWrapper} className="catalog-img-wrapper">
                  <img src={displayImg} alt={item.name} style={styles.img} className="catalog-img-tag" />
                </div>
                <h3 style={styles.productName} className="catalog-item-title">{item.name.toUpperCase()}</h3>
                <p style={styles.genderLabel} className="catalog-item-gender">{item.gender}</p>
                <p style={styles.price} className="catalog-item-catchy-price">
                  Rs. {displayPrice ? Number(displayPrice).toLocaleString() : "0.00"}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={styles.emptyState}>
          <ShoppingBag size={48} color="#ccc" />
          <p>No products found in this category.</p>
        </div>
      )}

      {/* PERSISTENT MOBILE AND VIEWPORT CSS OVERRIDES */}
      <style>{`
        /* --- BLOCK HORIZONTAL OVERFLOW SAFELY ON CORE CONTAINERS --- */
        html, body, #root {
          max-width: 100vw !important;
          overflow-x: hidden !important;
          box-sizing: border-box !important;
        }

        /* --- MOBILE VIEWPORT STYLES (Max width 767px) --- */
        @media (max-width: 767px) {
          .catalog-root-wrapper {
            max-width: 100vw !important;
            width: 100vw !important;
            overflow-x: hidden !important;
            padding: 15px 10px !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            box-sizing: border-box !important;
          }

          .catalog-header-bar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
            margin-bottom: 20px !important;
            width: 100% !important;
          }

          .catalog-filter-controls {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
            width: 100% !important;
          }

          .catalog-products-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 20px 12px !important;
            width: 100% !important;
            margin: 0 !important;
          }

          @media (min-width: 480px) {
            .catalog-products-grid {
              grid-template-columns: repeat(3, 1fr) !important;
            }
          }

          .catalog-card-item {
            width: 100% !important;
            box-sizing: border-box !important;
            display: flex;
            flex-direction: column;
          }

          .catalog-img-wrapper {
            width: 100% !important;
            height: auto !important;
            aspect-ratio: 1/1 !important;
            border-radius: 8px !important;
          }

          .catalog-item-title {
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important; 
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            line-height: 1.3 !important;
            text-align: center !important;
            margin-top: 8px !important;
            margin-bottom: 2px !important;
            color: #222 !important;
            letter-spacing: 0.2px !important;
            height: 2.6em !important; 
          }

          .catalog-item-gender {
            display: none !important;
          }

          .catalog-item-catchy-price {
            color: #d94040 !important; 
            font-size: 12px !important;
            font-weight: 700 !important;
            text-align: center !important;
            margin-top: 2px !important;
            display: block !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: { padding: '40px 8%', maxWidth: '1400px', margin: 'auto', fontFamily: 'Inter, sans-serif', width: '100%' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '12px' },
  title: { fontSize: '18px', fontWeight: '900', letterSpacing: '1px' },
  
  controlsGroup: { display: 'flex', gap: '10px' },
  filterWrapper: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f5f5f5', padding: '5px 15px', borderRadius: '25px' },
  select: { border: 'none', background: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer', outline: 'none', color: '#333' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '30px' },
  card: { cursor: 'pointer', transition: 'transform 0.2s' },
  imgWrapper: { overflow: 'hidden', borderRadius: '8px', backgroundColor: '#f9f9f9', aspectRatio: '1/1' },
  img: { width: '100%', height: '100%', objectFit: 'cover' },
  productName: { fontSize: '13px', fontWeight: '600', marginTop: '15px', color: '#333', letterSpacing: '0.5px' },
  genderLabel: { fontSize: '11px', color: '#888', margin: '2px 0' },
  price: { fontSize: '14px', fontWeight: '800', marginTop: '5px' },
  emptyState: { textAlign: 'center', marginTop: '100px', color: '#999', width: '100%' },
  loader: { textAlign: 'center', padding: '100px', fontWeight: '600', color: '#666' }
};