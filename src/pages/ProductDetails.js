import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// --- PHYSICS ENGINE (White Wires) ---
const RopeAnimation = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let ropes = [];
    let mouse = { x: -1000, y: -1000, radius: 100 };

    class Dot {
      constructor(x, y) {
        this.pos = { x, y };
        this.oldPos = { x, y };
        this.friction = 0.97;
        this.gravity = 0.4;
        this.pinned = false;
        this.radius = 2;
      }
      update() {
        if (this.pinned) return;
        let vx = (this.pos.x - this.oldPos.x) * this.friction;
        let vy = (this.pos.y - this.oldPos.y) * this.friction + this.gravity;
        this.oldPos = { ...this.pos };
        let dx = mouse.x - this.pos.x;
        let dy = mouse.y - this.pos.y;
        let d = Math.sqrt(dx * dx + dy * dy);
        if (d < mouse.radius) {
          let force = (mouse.radius - d) / mouse.radius;
          this.pos.x -= (dx / d) * force * 10;
          this.pos.y -= (dy / d) * force * 10;
        }
        this.pos.x += vx; this.pos.y += vy;
      }
      draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }
    }

    class Stick {
      constructor(p1, p2, length) { this.p1 = p1; this.p2 = p2; this.length = length; }
      update() {
        let dx = this.p2.pos.x - this.p1.pos.x;
        let dy = this.p2.pos.y - this.p1.pos.y;
        let d = Math.sqrt(dx * dx + dy * dy);
        let diff = (this.length - d) / d * 0.3;
        let ox = dx * diff; let oy = dy * diff;
        if (!this.p1.pinned) { this.p1.pos.x -= ox; this.p1.pos.y -= oy; }
        if (!this.p2.pinned) { this.p2.pos.x += ox; this.p2.pos.y += oy; }
      }
    }

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = 350;
      ropes = [];
      const totalRopes = canvas.width * 0.05;
      for (let i = 0; i < totalRopes; i++) {
        let x = Math.random() * canvas.width;
        let dots = []; let sticks = [];
        let segments = 6; let gap = 15;
        for (let j = 0; j < segments; j++) dots.push(new Dot(x, j * gap));
        dots[0].pinned = true;
        for (let j = 0; j < segments - 1; j++) sticks.push(new Stick(dots[j], dots[j + 1], gap));
        ropes.push({ dots, sticks });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ropes.forEach(r => {
        r.dots.forEach(d => d.update());
        for (let i = 0; i < 5; i++) r.sticks.forEach(s => s.update());
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.moveTo(r.dots[0].pos.x, r.dots[0].pos.y);
        r.dots.forEach(d => ctx.lineTo(d.pos.x, d.pos.y));
        ctx.stroke();
        r.dots[r.dots.length - 1].draw(ctx);
      });
      requestAnimationFrame(animate);
    };

    window.addEventListener('resize', init);
    const handleMouse = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    init(); animate();
    window.addEventListener('mousemove', handleMouse);
    return () => {
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('resize', init);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 0, pointerEvents: 'none' }} />;
};

export default function ProductDetails() {
  const { productId } = useParams();
  const navigate = useNavigate();
  
  // --- STATE ---
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(0);
  const [mainImage, setMainImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  
  // Lightbox State
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Fetch Product
      const { data: prod } = await supabase.from('products').select('*').eq('id', productId).single();
      if (prod) {
        setProduct(prod);
        setMainImage(prod.main_images?.[0] || "");
      }
      // Fetch Reviews (Assuming a 'reviews' table exists)
      const { data: revs } = await supabase.from('reviews').select('*').eq('product_id', productId).order('created_at', { ascending: false });
      if (revs) setReviews(revs);
      
      setLoading(false);
    };
    fetchData();
  }, [productId]);

  // --- DERIVED STATE ---
  const currentVariant = product?.variant_data?.[selectedColorIndex];
  const currentSizeOption = currentVariant?.sizes?.[selectedSizeIndex];
  const displayPrice = currentSizeOption?.price || 0;
  const stockCount = Number(currentSizeOption?.stock) || 0;
  const isOutOfStock = stockCount <= 0;
  const gallery = product?.main_images || [];

  // --- HELPERS ---
  const getDeliveryRange = () => {
    const today = new Date();
    const start = new Date(today);
    const end = new Date(today);
    start.setDate(today.getDate() + 3);
    end.setDate(today.getDate() + 5);
    const options = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  const openLightbox = (img) => {
    const index = gallery.indexOf(img);
    setLightboxIndex(index !== -1 ? index : 0);
    setIsLightboxOpen(true);
  };

  const nextImage = (e) => {
    e.stopPropagation();
    setLightboxIndex((prev) => (prev + 1) % gallery.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setLightboxIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
  };

  const handleAddToCart = async () => {
    if (isOutOfStock) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("Please login!"); navigate('/login'); return; }
    try {
      const { data: existingItem } = await supabase.from('cart_items').select('id, quantity').eq('user_id', user.id).eq('product_id', product.id).eq('selected_color', currentVariant.name).eq('selected_size', currentSizeOption.size).single();
      if (existingItem) {
        await supabase.from('cart_items').update({ quantity: existingItem.quantity + 1 }).eq('id', existingItem.id);
      } else {
        await supabase.from('cart_items').insert([{ user_id: user.id, product_id: product.id, quantity: 1, selected_color: currentVariant.name, selected_size: currentSizeOption.size, price_at_addition: displayPrice }]);
      }
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) { alert("Error adding to cart"); }
  };

  const handleBuyNow = async () => {
    if (isOutOfStock) return;
    const purchaseData = {
      items: [{
        id: product.id,
        name: product.name,
        price: displayPrice,
        image: mainImage,
        color: currentVariant.name,
        size: currentSizeOption.size,
        quantity: 1
      }],
      isDirectPurchase: true,
      total: displayPrice
    };
    navigate('/checkout', { state: purchaseData });
  };

  if (loading) return <div style={{textAlign:'center', padding:'100px'}}>Loading...</div>;
  if (!product) return <div style={{textAlign:'center', padding:'100px'}}>Product Not Found</div>;

  return (
    <div style={styles.pageWrapper}>
      <header style={styles.heroHeader}>
        <RopeAnimation />
      </header>

      {/* FULL SCREEN LIGHTBOX */}
      {isLightboxOpen && (
        <div style={styles.lightboxOverlay} onClick={() => setIsLightboxOpen(false)}>
          <button style={styles.closeBtn} onClick={() => setIsLightboxOpen(false)}>✕</button>
          <button style={styles.navBtnLeft} onClick={prevImage}>←</button>
          <img src={gallery[lightboxIndex]} alt="full screen" style={styles.lightboxImg} />
          <button style={styles.navBtnRight} onClick={nextImage}>→</button>
          <div style={styles.lightboxCounter}>{lightboxIndex + 1} / {gallery.length}</div>
        </div>
      )}

      {showToast && (
        <div style={styles.toast}>
          <div style={styles.toastContent}>
            <span>✅ Added to cart!</span>
            <button onClick={() => navigate('/cart')} style={styles.toastLink}>VIEW</button>
          </div>
        </div>
      )}

      <div style={styles.container}>
        {/* PRODUCT SECTION */}
        <div className="glass-layout-container">
          <div className="glass-thumb-sidebar">
            {gallery.map((img, i) => (
              <div key={i} className={`glass-thumb-item ${mainImage === img ? 'active' : ''}`} onClick={() => setMainImage(img)}>
                <img src={img} alt="thumb" />
              </div>
            ))}
          </div>

          <div className="glass-main-card">
             <div className="glass-image-section" onClick={() => openLightbox(mainImage)}>
                <img src={mainImage} alt={product.name} className="glass-hero-img" style={{cursor: 'zoom-in'}} />
             </div>
             
             <div className="glass-controls-section">
                <div className="glass-text-group">
                  <h3 className="glass-title">{product.name}</h3>
                  <p className="glass-price">Rs. {Number(displayPrice).toLocaleString()}</p>
                </div>

                <div className="glass-selectors">
                   <div className="stock-container">
                      <span className={`stock-dot ${isOutOfStock ? 'out' : 'in'}`}></span>
                      <span className="stock-label">
                        {isOutOfStock ? 'Out of Stock' : `${stockCount} in stock`}
                      </span>
                   </div>

                   <p className="glass-label">COLOR: {currentVariant?.name}</p>
                   <div className="glass-swatch-row">
                      {product.variant_data?.map((c, i) => (
                        <div key={i} 
                             onClick={() => { setSelectedColorIndex(i); setSelectedSizeIndex(0); }}
                             className={`glass-swatch ${selectedColorIndex === i ? 'selected' : ''}`}
                             style={{ backgroundImage: `url(${c.imageUrl})` }} />
                      ))}
                   </div>

                   <p className="glass-label">SIZE: {currentSizeOption?.size}</p>
                   <div className="glass-size-row">
                      {currentVariant?.sizes?.map((s, i) => (
                        <button key={i} onClick={() => setSelectedSizeIndex(i)}
                                className={`glass-size-btn ${selectedSizeIndex === i ? 'active' : ''}`}
                                disabled={Number(s.stock) <= 0}>
                          {s.size}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="glass-action-stack">
                   <button disabled={isOutOfStock} onClick={handleAddToCart} className="glass-cart-btn">
                     {isOutOfStock ? "SOLD OUT" : "ADD TO CART"}
                   </button>
                   <button disabled={isOutOfStock} onClick={handleBuyNow} className="glass-buy-btn">
                     BUY NOW
                   </button>
                </div>
             </div>
          </div>
        </div>

        {/* TRUST BAR SECTION */}
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
            <img src="https://bewdtedexomudpelsrxj.supabase.co/storage/v1/object/public/icons/sri-lanka-country-map-thick-outline-icon-vector-50459471.jpg" alt="Sri Lanka" style={{ width: '45px', height: '45px', objectFit: 'contain' }} />
            <div style={styles.trustText}>
              <strong>Islandwide Delivery</strong>
              <span>All over Sri Lanka</span>
            </div>
          </div>
        </div>

        {/* DESCRIPTION & REVIEWS SECTION */}
        <div className="bottom-content">
           <h2 style={styles.sectionTitle}>Product Details</h2>
           <p style={styles.description}>{product.description}</p>
           
           <hr style={{margin: '40px 0', opacity: 0.1}} />

           <h2 style={styles.sectionTitle}>Customer Reviews ({reviews.length})</h2>
           <div style={styles.reviewsList}>
             {reviews.length > 0 ? (
               reviews.map((rev) => (
                 <div key={rev.id} style={styles.reviewCard}>
                   <div style={styles.reviewHeader}>
                     <span style={styles.reviewerName}>{rev.user_name || "Anonymous User"}</span>
                     <span style={styles.reviewStars}>{"★".repeat(rev.rating)}{"☆".repeat(5-rev.rating)}</span>
                   </div>
                   <p style={styles.reviewComment}>{rev.comment}</p>
                   <small style={{color: '#999'}}>{new Date(rev.created_at).toLocaleDateString()}</small>
                 </div>
               ))
             ) : (
               <p style={{color: '#888', fontStyle: 'italic'}}>No reviews yet for this product.</p>
             )}
           </div>
        </div>
      </div>

      <style>{`
        .glass-layout-container { display: flex; gap: 30px; margin-top: -260px; position: relative; z-index: 10; font-family: 'Poppins', sans-serif; justify-content: flex-start; align-items: flex-start; flex-wrap: wrap; }
        .glass-thumb-sidebar { display: flex; flex-direction: column; gap: 15px; }
        .glass-thumb-item { width: 70px; height: 70px; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3); border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.3s; overflow: hidden; }
        .glass-thumb-item img { width: 80%; }
        .glass-thumb-item.active { border-color: #fff; background: rgba(255,255,255,0.4); }
        .glass-main-card { flex: 1; max-width: 1500px; background: rgba(255,255,255,0.1); backdrop-filter: blur(25px); border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 40px 60px rgba(0,0,0,0.15); border-radius: 40px; display: flex; overflow: hidden; }
        .glass-image-section { flex: 1.2; display: flex; align-items: center; justify-content: center; padding: 40px; background: rgba(255,255,255,0.05); }
        .glass-hero-img { width: 100%; transition: 0.5s; }
        .glass-controls-section { flex: 1; padding: 40px; display: flex; flex-direction: column; justify-content: center; text-align: left; }
        .glass-title { font-size: 24px; font-weight: 800; color: #ffffff; margin-bottom: 5px; }
        .glass-price { font-size: 20px; font-weight: 700; color: #ff4d4d; margin-bottom: 20px; }
        .stock-container { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; }
        .stock-dot { width: 10px; height: 10px; border-radius: 50%; }
        .stock-dot.in { background-color: #27ae60; }
        .stock-dot.out { background-color: #e74c3c; }
        .stock-label { font-size: 13px; font-weight: 600; color: #333; }
        .glass-label { font-size: 10px; font-weight: 800; color: #555; margin-bottom: 8px; text-transform: uppercase; }
        .glass-swatch-row { display: flex; gap: 10px; margin-bottom: 20px; }
        .glass-swatch { width: 32px; height: 32px; border-radius: 50%; border: 2px solid #fff; cursor: pointer; background-size: cover; }
        .glass-swatch.selected { outline: 2px solid #000; outline-offset: 2px; }
        .glass-size-row { display: flex; gap: 8px; margin-bottom: 30px; }
        .glass-size-btn { width: 38px; height: 38px; background: #fff; border: none; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer; }
        .glass-size-btn.active { background: #000; color: #fff; }
        .glass-action-stack { display: flex; flex-direction: column; gap: 10px; width: 100%; }
        .glass-cart-btn, .glass-buy-btn { width: 100%; padding: 14px; border-radius: 12px; font-weight: 700; cursor: pointer; }
        .glass-cart-btn { background: #000; color: #fff; border: none; }
        .glass-buy-btn { background: transparent; color: #000; border: 2px solid #000; }
        .bottom-content { margin-top: 60px; padding: 0 20px 0 100px; max-width: 900px; }
        @media (max-width: 768px) {
          .glass-layout-container { margin-top: -200px; flex-direction: column; align-items: center; padding: 0 20px; }
          .glass-thumb-sidebar { flex-direction: row; order: 2; margin-bottom: 20px; }
          .glass-main-card { flex-direction: column; border-radius: 25px; width: 100%; }
          .glass-title { color: #000000; }
          .glass-image-section { padding: 20px; }
          .glass-controls-section { padding: 25px; }
          .bottom-content { padding: 0 20px; text-align: center; margin-top: 40px; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  pageWrapper: { backgroundColor: '#fff', minHeight: '100vh', paddingBottom: '100px' },
  heroHeader: { height: '350px', backgroundColor: '#000', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  container: { maxWidth: '1400px', margin: '0 auto' },
  sectionTitle: { fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '15px' },
  description: { lineHeight: '1.6', color: '#666', fontSize: '14px', marginBottom: '40px' },
  toast: { position: 'fixed', top: '20px', right: '20px', left: '20px', backgroundColor: '#000', color: '#fff', padding: '15px', borderRadius: '12px', zIndex: 1000 },
  toastLink: { marginLeft: '10px', background: '#fff', border: 'none', padding: '5px 10px', borderRadius: '5px', fontWeight: '900' },
  
  // Lightbox
  lightboxOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  lightboxImg: { maxWidth: '90%', maxHeight: '85%', objectFit: 'contain' },
  closeBtn: { position: 'absolute', top: '20px', right: '30px', background: 'none', border: 'none', color: '#fff', fontSize: '30px', cursor: 'pointer' },
  navBtnLeft: { position: 'absolute', left: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '40px', padding: '10px 20px', borderRadius: '50%', cursor: 'pointer' },
  navBtnRight: { position: 'absolute', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '40px', padding: '10px 20px', borderRadius: '50%', cursor: 'pointer' },
  lightboxCounter: { position: 'absolute', bottom: '20px', color: '#fff', fontWeight: '600' },

  // Trust Bar
  trustBar: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
    gap: '20px', 
    padding: '30px', 
    backgroundColor: '#fff', 
    border: '1px solid #eee', 
    borderRadius: '16px', 
    margin: '40px 20px 50px 20px', 
    position: 'relative', 
    zIndex: 10 
  },
  trustItem: { display: 'flex', alignItems: 'center', gap: '14px', borderRight: '1px solid #f0f0f0', paddingRight: '10px' },
  trustText: { display: 'flex', flexDirection: 'column', fontSize: '14px', color: '#333' },
  paymentIcons: { display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' },
  cardLogo: { height: '15px', width: 'auto' },
  codBadge: { fontSize: '10px', border: '1.5px solid #333', padding: '1px 5px', borderRadius: '4px', fontWeight: '900' },

  // Reviews
  reviewsList: { display: 'flex', flexDirection: 'column', gap: '20px' },
  reviewCard: { padding: '20px', borderBottom: '1px solid #eee' },
  reviewHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
  reviewerName: { fontWeight: '700', fontSize: '15px' },
  reviewStars: { color: '#ffcc00' },
  reviewComment: { fontSize: '14px', color: '#444', marginBottom: '10px' }
};