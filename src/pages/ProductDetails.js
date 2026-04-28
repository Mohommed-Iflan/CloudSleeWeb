import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Star, User, Calendar, CheckCircle, MessageSquare } from 'lucide-react';

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
        let diff = (this.length - d) / (d || 1) * 0.3;
        let ox = dx * diff; let oy = dy * diff;
        if (!this.p1.pinned) { this.p1.pos.x -= ox; this.p1.pos.y -= oy; }
        if (!this.p2.pinned) { this.p2.pos.x += ox; this.p2.pos.y += oy; }
      }
    }

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = 350;
      ropes = [];
      const totalRopes = Math.max(20, canvas.width * 0.05);
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
  
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(0);
  const [mainImage, setMainImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxGallery, setLightboxGallery] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: prod } = await supabase.from('products').select('*').eq('id', productId).single();
        if (prod) {
          setProduct(prod);
          setMainImage(prod.main_images?.[0] || "");
        }
        
        const { data: revs } = await supabase.from('reviews')
          .select('*')
          .eq('product_id', productId)
          .order('created_at', { ascending: false });
        if (revs) setReviews(revs);
      } catch (err) {
        console.error("Fetch error:", err);
      }
      setLoading(false);
    };
    fetchData();
  }, [productId]);

  const getDeliveryRange = () => {
    const today = new Date();
    const start = new Date();
    const end = new Date();
    start.setDate(today.getDate() + 2);
    end.setDate(today.getDate() + 5);
    return `${start.getDate()} ${start.toLocaleString('default', { month: 'short' })} - ${end.getDate()} ${end.toLocaleString('default', { month: 'short' })}`;
  };

  const currentVariant = product?.variant_data?.[selectedColorIndex];
  const currentSizeOption = currentVariant?.sizes?.[selectedSizeIndex];
  const displayPrice = currentSizeOption?.price || product?.price || 0;
  const stockCount = Number(currentSizeOption?.stock) || 0;
  const isOutOfStock = stockCount <= 0;
  const gallery = product?.main_images || [];

  const openLightbox = (img, customGallery = null) => {
    const activeGallery = customGallery || gallery;
    setLightboxGallery(activeGallery);
    const index = activeGallery.indexOf(img);
    setLightboxIndex(index !== -1 ? index : 0);
    setIsLightboxOpen(true);
  };

  const nextImage = (e) => {
    e.stopPropagation();
    setLightboxIndex((prev) => (prev + 1) % lightboxGallery.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setLightboxIndex((prev) => (prev - 1 + lightboxGallery.length) % lightboxGallery.length);
  };

  const handleAddToCart = async () => {
    if (isOutOfStock) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("Please login!"); navigate('/login'); return; }
    try {
      const { data: existingItem } = await supabase.from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .eq('selected_color', currentVariant?.name)
        .eq('selected_size', currentSizeOption?.size)
        .single();

      if (existingItem) {
        await supabase.from('cart_items').update({ quantity: existingItem.quantity + 1 }).eq('id', existingItem.id);
      } else {
        await supabase.from('cart_items').insert([{ 
          user_id: user.id, 
          product_id: product.id, 
          quantity: 1, 
          selected_color: currentVariant?.name, 
          selected_size: currentSizeOption?.size, 
          price_at_addition: displayPrice 
        }]);
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
        color: currentVariant?.name,
        size: currentSizeOption?.size,
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
          {lightboxGallery.length > 1 && <button style={styles.navBtnLeft} onClick={prevImage}>←</button>}
          <img src={lightboxGallery[lightboxIndex]} alt="full screen" style={styles.lightboxImg} />
          {lightboxGallery.length > 1 && <button style={styles.navBtnRight} onClick={nextImage}>→</button>}
          <div style={styles.lightboxCounter}>{lightboxIndex + 1} / {lightboxGallery.length}</div>
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
        <div className="glass-layout-container">
          <div className="glass-thumb-sidebar">
            {gallery.map((img, i) => (
              <div key={i} className={`glass-thumb-item ${mainImage === img ? 'active' : ''}`} onClick={() => setMainImage(img)}>
                <img src={img} alt="thumb" />
              </div>
            ))}
          </div>

          <div className="glass-main-card">
             {/* LEFT SIDE: Absolute positioning ensures it fills without pushing height */}
             <div className="glass-image-section">
                <div className="img-clip-container" onClick={() => openLightbox(mainImage)}>
                   <img src={mainImage} alt={product.name} className="glass-hero-img" />
                </div>
             </div>
             
             {/* RIGHT SIDE: The Master height controller */}
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
                             style={{ backgroundImage: `url(${c.imageUrl || mainImage})`, backgroundColor: '#eee' }} />
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
                <img src="https://cdn-icons-png.flaticon.com/512/349/349228.png" alt="American Express" style={styles.cardLogo} />
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

        {/* DESCRIPTION & REVIEWS */}
        <div className="bottom-content">
            <h2 style={styles.sectionTitle}>Product Details</h2>
            
            <div 
              style={styles.description} 
              dangerouslySetInnerHTML={{ __html: product.description }} 
            />
            
            <hr style={{margin: '40px 0', opacity: 0.1}} />

            <div style={styles.reviewSectionHeader}>
               <h2 style={styles.sectionTitle}>Customer Reviews ({reviews.length})</h2>
               <div style={styles.ratingSummary}>
                  <span style={styles.bigRating}>
                     {reviews.length > 0 
                       ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
                       : "0.0"}
                  </span>
                  <Star size={20} fill="#f57224" color="#f57224" />
               </div>
            </div>

            <div style={styles.reviewsList}>
              {reviews.length > 0 ? (
                reviews.map((rev) => (
                  <div key={rev.id} style={styles.reviewCard}>
                     <div style={styles.reviewSidebar}>
                        <div style={styles.avatar}><User size={20} color="#666" /></div>
                     </div>
                     
                     <div style={styles.reviewContent}>
                        <div style={styles.reviewMeta}>
                            <span style={styles.reviewerName}>{rev.user_name || "Anonymous User"}</span>
                            <span style={styles.verifiedBadge}><CheckCircle size={12} /> Verified Purchase</span>
                        </div>

                        <div style={styles.starRow}>
                           {[...Array(5)].map((_, i) => (
                             <Star 
                               key={i} 
                               size={16} 
                               fill={i < rev.rating ? "#f57224" : "none"} 
                               color={i < rev.rating ? "#f57224" : "#ddd"} 
                             />
                           ))}
                           <span style={styles.reviewDate}>
                             <Calendar size={12} style={{marginRight: '4px'}} />
                             {new Date(rev.created_at).toLocaleDateString()}
                           </span>
                        </div>

                        <p style={styles.reviewComment}>{rev.comment}</p>

                        {rev.images && rev.images.length > 0 && (
                          <div style={styles.reviewImageGrid}>
                            {rev.images.map((imgUrl, idx) => (
                              <img 
                                key={idx} 
                                src={imgUrl} 
                                alt="review" 
                                style={styles.reviewImg} 
                                onClick={() => openLightbox(imgUrl, rev.images)}
                              />
                            ))}
                          </div>
                        )}
                     </div>
                  </div>
                ))
              ) : (
                <div style={styles.emptyReviews}>
                  <MessageSquare size={40} color="#eee" />
                  <p>No reviews yet. Be the first to review!</p>
                </div>
              )}
            </div>
        </div>
      </div>

      <style>{`
        .glass-layout-container { display: flex; gap: 30px; margin-top: -260px; position: relative; z-index: 10; font-family: 'Poppins', sans-serif; justify-content: flex-start; align-items: flex-start; flex-wrap: wrap; }
        .glass-thumb-sidebar { display: flex; flex-direction: column; gap: 15px; }
        .glass-thumb-item { width: 70px; height: 70px; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3); border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.3s; overflow: hidden; }
        .glass-thumb-item img { width: 100%; height: 100%; object-fit: cover; }
        .glass-thumb-item.active { border-color: #fff; background: rgba(255,255,255,0.4); }
        
        .glass-main-card { 
          flex: 1; 
          min-width: 320px; 
          max-width: 1500px; 
          background: rgba(255,255,255,0.1); 
          backdrop-filter: blur(25px); 
          border: 1px solid rgba(255,255,255,0.3); 
          box-shadow: 0 40px 60px rgba(0,0,0,0.15); 
          border-radius: 40px; 
          display: flex; 
          overflow: hidden; 
          position: relative;
          min-height: 500px; /* Minimum card height */
        }

        /* Fixed the height issue here */
        .glass-image-section { 
          flex: 1; 
          position: relative;
          background: rgba(255,255,255,0.05); 
        }

        .img-clip-container {
          position: absolute;
          top: 30px;
          left: 30px;
          right: 30px;
          bottom: 30px;
          overflow: hidden;
          border-radius: 20px; /* Rounded corners for image area */
          cursor: zoom-in;
        }

        .glass-hero-img { 
          width: 100%; 
          height: 100%; 
          object-fit: cover; 
          transition: 0.5s; 
          border-radius: 20px; /* Rounded image corners */
        }

        .glass-controls-section { 
          flex: 1; 
          padding: 60px 50px; 
          display: flex; 
          flex-direction: column; 
          justify-content: center; 
          text-align: left; 
          z-index: 2;
        }

        .glass-title { font-size: 28px; font-weight: 800; color: #ffffff; margin-bottom: 5px; }
        .glass-price { font-size: 24px; font-weight: 700; color: #ff4d4d; margin-bottom: 30px; }
        .stock-container { display: flex; align-items: center; gap: 8px; margin-bottom: 25px; }
        .stock-dot { width: 10px; height: 10px; border-radius: 50%; }
        .stock-dot.in { background-color: #27ae60; }
        .stock-dot.out { background-color: #e74c3c; }
        .stock-label { font-size: 13px; font-weight: 600; color: #333; }
        .glass-label { font-size: 11px; font-weight: 800; color: #555; margin-bottom: 10px; text-transform: uppercase; }
        .glass-swatch-row { display: flex; gap: 12px; margin-bottom: 25px; }
        .glass-swatch { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #fff; cursor: pointer; background-size: cover; background-position: center; transition: 0.2s; }
        .glass-swatch:hover { transform: scale(1.1); }
        .glass-swatch.selected { outline: 2px solid #000; outline-offset: 2px; }
        .glass-size-row { display: flex; gap: 10px; margin-bottom: 40px; }
        .glass-size-btn { width: 45px; height: 45px; background: #fff; border: 1px solid #ddd; border-radius: 10px; font-weight: 800; font-size: 12px; cursor: pointer; transition: 0.2s; }
        .glass-size-btn:hover:not(:disabled) { border-color: #000; }
        .glass-size-btn.active { background: #000; color: #fff; border-color: #000; }
        .glass-action-stack { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 400px; }
        .glass-cart-btn, .glass-buy-btn { width: 100%; padding: 16px; border-radius: 14px; font-weight: 700; cursor: pointer; transition: 0.3s; font-size: 14px; letter-spacing: 1px; }
        .glass-cart-btn { background: #000; color: #fff; border: none; }
        .glass-cart-btn:hover { background: #333; transform: translateY(-2px); }
        .glass-buy-btn { background: transparent; color: #000; border: 2px solid #000; }
        .glass-buy-btn:hover { background: #000; color: #fff; }
        
        .bottom-content { margin-top: 60px; padding: 0 20px 0 100px; max-width: 900px; }
        .bottom-content ul, .bottom-content ol { padding-left: 20px; margin-bottom: 15px; }

        @media (max-width: 992px) {
           .glass-main-card { flex-direction: column; height: auto; min-height: 0; }
           .glass-image-section { height: 450px; flex: none; }
           .img-clip-container { position: relative; top: 0; left: 0; right: 0; bottom: 0; height: 100%; border-radius: 0; }
           .glass-controls-section { padding: 40px 30px; text-align: center; align-items: center; }
           .glass-swatch-row, .glass-size-row { justify-content: center; }
           .glass-action-stack { margin: 0 auto; }
           .bottom-content { padding: 0 20px; margin-top: 40px; }
           .glass-title { color: #000; }
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
  description: { lineHeight: '1.8', color: '#444', fontSize: '15px', marginBottom: '40px', textAlign: 'left' },
  toast: { position: 'fixed', top: '20px', right: '20px', left: '20px', backgroundColor: '#000', color: '#fff', padding: '15px', borderRadius: '12px', zIndex: 1000 },
  toastContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  toastLink: { background: '#fff', border: 'none', padding: '5px 12px', borderRadius: '5px', fontWeight: '900', cursor: 'pointer' },
  lightboxOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  lightboxImg: { maxWidth: '90%', maxHeight: '85%', objectFit: 'contain' },
  closeBtn: { position: 'absolute', top: '20px', right: '30px', background: 'none', border: 'none', color: '#fff', fontSize: '30px', cursor: 'pointer' },
  navBtnLeft: { position: 'absolute', left: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '40px', padding: '10px 20px', borderRadius: '50%', cursor: 'pointer' },
  navBtnRight: { position: 'absolute', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '40px', padding: '10px 20px', borderRadius: '50%', cursor: 'pointer' },
  lightboxCounter: { position: 'absolute', bottom: '20px', color: '#fff', fontWeight: '600' },
  trustBar: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', padding: '30px', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '16px', margin: '40px 20px 50px 20px', position: 'relative', zIndex: 10 },
  trustItem: { display: 'flex', alignItems: 'center', gap: '14px', borderRight: '1px solid #f0f0f0', paddingRight: '10px' },
  trustText: { display: 'flex', flexDirection: 'column', fontSize: '13px', color: '#333' },
  paymentIcons: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' },
  cardLogo: { height: '18px', objectFit: 'contain' },
  codBadge: { fontSize: '9px', border: '1px solid #333', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' },
  reviewSectionHeader: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' },
  ratingSummary: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fff8f4', padding: '8px 15px', borderRadius: '20px', border: '1px solid #ffe7d6' },
  bigRating: { fontSize: '20px', fontWeight: 'bold', color: '#f57224' },
  reviewsList: { display: 'flex', flexDirection: 'column', gap: '15px' },
  reviewCard: { display: 'flex', gap: '20px', padding: '25px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #f0f0f0' },
  reviewSidebar: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  avatar: { width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  reviewContent: { flex: 1 },
  reviewMeta: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' },
  reviewerName: { fontWeight: '700', fontSize: '15px', color: '#333' },
  verifiedBadge: { fontSize: '11px', color: '#27ae60', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' },
  starRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' },
  reviewDate: { fontSize: '12px', color: '#999', display: 'flex', alignItems: 'center' },
  reviewComment: { fontSize: '14px', color: '#555', lineHeight: '1.6', marginBottom: '15px' },
  reviewImageGrid: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  reviewImg: { width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover', cursor: 'pointer', border: '1px solid #eee' },
  emptyReviews: { textAlign: 'center', padding: '50px', backgroundColor: '#fafafa', borderRadius: '20px', color: '#999' }
};