import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function ProductDetails() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(0);
  const [mainImage, setMainImage] = useState("");
  const [loading, setLoading] = useState(true);
  
  // State for Image Preview
  const [fullScreenIndex, setFullScreenIndex] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: prod } = await supabase.from('products').select('*').eq('id', productId).single();

      if (prod) {
        setProduct(prod);
        setMainImage(prod.main_images?.[0] || "");
        const { data: revs } = await supabase.from('reviews').select('*').eq('product_id', productId);
        if (revs) setReviews(revs);
      }
      setLoading(false);
    };
    fetchData();
  }, [productId]);

  // Handle Keyboard for Preview
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (fullScreenIndex === null) return;
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') setFullScreenIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullScreenIndex]);

  const currentVariant = product?.variant_data?.[selectedColorIndex];
  const currentSizeOption = currentVariant?.sizes?.[selectedSizeIndex];
  const displayPrice = currentSizeOption?.price || 0;
  const isOutOfStock = (Number(currentSizeOption?.stock) || 0) <= 0;
  const gallery = product?.main_images || [];

  // Helper functions for Preview navigation
  const nextImage = (e) => {
    if (e) e.stopPropagation();
    setFullScreenIndex((prev) => (prev + 1) % gallery.length);
  };
  const prevImage = (e) => {
    if (e) e.stopPropagation();
    setFullScreenIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
  };

  const getDeliveryRange = () => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() + 2);
    const end = new Date(today);
    end.setDate(today.getDate() + 4);
    const options = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  const handleBuyNow = () => {
    if (isOutOfStock) { alert("This size is currently out of stock!"); return; }
    navigate('/checkout', { 
      state: { 
        directItem: { 
          id: product.id, name: product.name, price: displayPrice,
          image_url: mainImage, selectedColor: currentVariant.name, selectedSize: currentSizeOption.size
        } 
      } 
    });
  };

  if (loading) return <div style={{textAlign:'center', padding:'100px'}}>Loading...</div>;
  if (!product) return <div style={{textAlign:'center', padding:'100px'}}>Product Not Found</div>;

  return (
    <div style={styles.container}>
      
      {/* --- FULL SCREEN IMAGE PREVIEW MODAL --- */}
      {fullScreenIndex !== null && (
        <div onClick={() => setFullScreenIndex(null)} style={styles.fullScreenOverlay}>
          <button style={{...styles.navBtn, top: '20px', right: '20px', fontSize: '30px'}}>✕</button>
          <button onClick={prevImage} style={{...styles.navBtn, left: '20px'}}>❮</button>
          <img src={gallery[fullScreenIndex]} style={styles.fullScreenImg} alt="Preview" />
          <button onClick={nextImage} style={{...styles.navBtn, right: '20px'}}>❯</button>
          <p style={styles.counterText}>{fullScreenIndex + 1} / {gallery.length}</p>
        </div>
      )}

      <div style={styles.topSection}>
        {/* IMAGE COLUMN */}
        <div style={styles.imageColumn}>
          <div style={styles.heroWrapper}>
            <img 
                src={mainImage} 
                alt={product.name} 
                style={styles.mainHeroImg} 
                onClick={() => {
                    const idx = gallery.indexOf(mainImage);
                    setFullScreenIndex(idx !== -1 ? idx : 0);
                }}
            />
          </div>
          <div style={styles.thumbnailRow}>
            {gallery.map((img, i) => (
              <img key={i} src={img} onClick={() => setMainImage(img)}
                style={{ ...styles.thumb, border: mainImage === img ? '2px solid #00bee1' : '1px solid #eee' }}
              />
            ))}
          </div>
        </div>

        {/* INFO COLUMN */}
        <div style={styles.infoColumn}>
          <h1 style={styles.title}>{product.name.toUpperCase()}</h1>
          <p style={styles.price}>Rs. {Number(displayPrice).toLocaleString()}</p>
          
          <div style={styles.selectionBox}>
            <p style={styles.label}>COLOR: {currentVariant?.name || "SELECT"}</p>
            <div style={styles.variantGrid}>
              {product.variant_data?.map((c, i) => (
                <div key={i} 
                  onClick={() => { setSelectedColorIndex(i); setSelectedSizeIndex(0); }}
                  style={{ 
                    ...styles.colorSwatch, 
                    backgroundImage: `url(${c.imageUrl})`, 
                    outline: selectedColorIndex === i ? '3px solid #000' : 'none' 
                  }}
                />
              ))}
            </div>

            <p style={styles.label}>SIZE: {currentSizeOption?.size || "SELECT"}</p>
            <div style={styles.variantGrid}>
              {currentVariant?.sizes?.map((s, i) => (
                <button key={i} onClick={() => setSelectedSizeIndex(i)}
                  style={{ 
                    ...styles.sizeBtn, 
                    backgroundColor: selectedSizeIndex === i ? '#000' : '#fff', 
                    color: selectedSizeIndex === i ? '#fff' : '#000',
                    opacity: (Number(s.stock) <= 0) ? 0.4 : 1,
                  }}
                > {s.size} </button>
              ))}
            </div>
            
            <div style={styles.stockStatusContainer}>
              <div style={{ ...styles.stockIndicator, backgroundColor: isOutOfStock ? '#ff4d4d' : '#27ae60' }} />
              <span style={{ fontSize: '14px', fontWeight: '700', color: isOutOfStock ? '#ff4d4d' : '#27ae60' }}>
                {isOutOfStock ? "OUT OF STOCK" : `IN STOCK: ${currentSizeOption?.stock} AVAILABLE`}
              </span>
            </div>
          </div>

          <div style={styles.actionButtons}>
            <button disabled={isOutOfStock} style={{...styles.buyBtn, backgroundColor: isOutOfStock ? '#ccc' : '#00bee1'}} onClick={handleBuyNow}>
              {isOutOfStock ? "SOLD OUT" : "BUY NOW"}
            </button>
            <button disabled={isOutOfStock} style={{...styles.cartBtn, opacity: isOutOfStock ? 0.5 : 1}} onClick={() => {}}>
              ADD TO CART
            </button>
          </div>
        </div>
      </div>

      {/* TRUST BAR */}
      <div style={styles.trustBar}>
        <div style={styles.trustItem}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
          <div style={styles.trustText}>
            <strong>Delivery: {getDeliveryRange()}</strong>
            <span>Charges: Rs. 300</span>
          </div>
        </div>

        <div style={styles.trustItem}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          <div style={styles.trustText}>
            <strong>Easy Returns</strong>
            <span>Within 3 days after delivery</span>
          </div>
        </div>

        <div style={styles.trustItem}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          <div style={styles.trustText}>
            <strong>Payment Methods</strong>
            <div style={styles.paymentIcons}>
              <img src="https://cdn-icons-png.flaticon.com/512/349/349221.png" alt="Visa" style={styles.cardLogo} />
              <img src="https://cdn-icons-png.flaticon.com/512/349/349228.png" alt="Mastercard" style={styles.cardLogo} />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" style={styles.cardLogo} />
              <span style={styles.codBadge}>COD</span>
            </div>
          </div>
        </div>

        <div style={{ ...styles.trustItem, borderRight: 'none' }}>
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Sri-lanka_-_Delapouite_-_game-icons.svg/640px-Sri-lanka_-_Delapouite_-_game-icons.svg.png" alt="Sri Lanka" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
          <div style={styles.trustText}>
            <strong>Islandwide Delivery</strong>
            <span>All over Sri Lanka</span>
          </div>
        </div>
      </div>

      <div style={styles.descContainer}>
        <h2 style={styles.sectionTitle}>Product Description</h2>
        <div style={styles.descriptionContent}>
          {product.description || "No description available for this product."}
        </div>
      </div>

      <div style={styles.reviewSection}>
        <h3 style={styles.reviewTitle}>CUSTOMER REVIEWS ({reviews.length})</h3>
        {reviews.map((rev, i) => (
            <div key={i} style={styles.reviewCard}>
              <div style={{color:'#ffc107', marginBottom:'10px'}}>{"★".repeat(rev.rating)}{"☆".repeat(5-rev.rating)}</div>
              <p style={{fontSize:'15px', lineHeight:'1.6'}}>{rev.comment}</p>
            </div>
          ))
        }
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', fontFamily: 'sans-serif' },
  topSection: { display: 'flex', gap: '40px', flexWrap: 'wrap', marginBottom: '40px' },
  imageColumn: { flex: '1.2', minWidth: '300px' },
  heroWrapper: { width: '100%', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f9f9f9', height: '550px' },
  mainHeroImg: { width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' },
  thumbnailRow: { display: 'flex', gap: '10px', marginTop: '15px', overflowX: 'auto' },
  thumb: { width: '70px', height: '70px', cursor: 'pointer', borderRadius: '8px', objectFit: 'cover' },
  infoColumn: { flex: '1', minWidth: '300px' },
  title: { fontSize: '28px', fontWeight: 'bold', color: '#111' },
  price: { fontSize: '32px', color: '#ff4d4d', fontWeight: 'bold', margin: '20px 0' },
  selectionBox: { padding: '24px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #eee' },
  label: { fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase', color: '#555' },
  variantGrid: { display: 'flex', gap: '12px', marginBottom: '25px', flexWrap: 'wrap' },
  colorSwatch: { width: '45px', height: '45px', borderRadius: '50%', cursor: 'pointer', backgroundSize: 'cover', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  sizeBtn: { padding: '12px 18px', border: '1px solid #ddd', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold' },
  stockStatusContainer: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px' },
  stockIndicator: { width: '10px', height: '10px', borderRadius: '50%' },
  actionButtons: { display: 'flex', gap: '15px', marginTop: '30px' },
  buyBtn: { flex: 1.5, padding: '18px', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  cartBtn: { flex: 1, padding: '18px', background: '#fff', border: '2px solid #222', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  trustBar: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', padding: '30px', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '16px', marginBottom: '50px' },
  trustItem: { display: 'flex', alignItems: 'center', gap: '14px', borderRight: '1px solid #f0f0f0', paddingRight: '10px' },
  trustText: { display: 'flex', flexDirection: 'column', fontSize: '14px', color: '#333' },
  paymentIcons: { display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' },
  cardLogo: { height: '15px', width: 'auto' },
  codBadge: { fontSize: '10px', border: '1.5px solid #333', padding: '1px 5px', borderRadius: '4px', fontWeight: '900' },
  descContainer: { marginBottom: '60px', borderBottom: '1px solid #eee', paddingBottom: '40px' },
  sectionTitle: { fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' },
  descriptionContent: { lineHeight: '1.8', color: '#444', fontSize: '16px', whiteSpace: 'pre-line' },
  reviewSection: { marginTop: '40px' },
  reviewTitle: { fontSize: '22px', fontWeight: 'bold', marginBottom: '30px' },
  reviewCard: { paddingBottom: '25px', borderBottom: '1px solid #eee', marginBottom: '25px' },

  // PREVIEW MODAL STYLES
  fullScreenOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  fullScreenImg: { maxHeight: '90%', maxWidth: '90%', objectFit: 'contain' },
  navBtn: { position: 'absolute', background: 'none', border: 'none', color: '#fff', fontSize: '50px', cursor: 'pointer', padding: '20px', zIndex: 10000 },
  counterText: { position: 'absolute', bottom: '20px', color: '#fff', fontSize: '14px' }
};