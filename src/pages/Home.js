import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// --- PHYSICS & CLEAN RENDERING ENGINE ---
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
        this.radius = 3; // Size of the white bulb
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

        this.pos.x += vx;
        this.pos.y += vy;
      }
      drawSimpleBulb(ctx) {
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }
    }

    class Stick {
      constructor(p1, p2, length) {
        this.p1 = p1; this.p2 = p2; this.length = length;
      }
      update() {
        let dx = this.p2.pos.x - this.p1.pos.x;
        let dy = this.p2.pos.y - this.p1.pos.y;
        let d = Math.sqrt(dx * dx + dy * dy);
        let diff = (this.length - d) / d * 0.3;
        let ox = dx * diff;
        let oy = dy * diff;
        if (!this.p1.pinned) { this.p1.pos.x -= ox; this.p1.pos.y -= oy; }
        if (!this.p2.pinned) { this.p2.pos.x += ox; this.p2.pos.y += oy; }
      }
    }

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = 500;
      ropes = [];
      const totalRopes = canvas.width * 0.05;
      for (let i = 0; i < totalRopes; i++) {
        let x = Math.random() * canvas.width;
        let dots = [];
        let sticks = [];
        let segments = 10;
        let gap = Math.random() * 10 + 15;
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
        for (let i = 0; i < 10; i++) r.sticks.forEach(s => s.update());
        
        // DRAW WHITE WIRE
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; // Clean White Wire
        ctx.lineWidth = 1;
        ctx.moveTo(r.dots[0].pos.x, r.dots[0].pos.y);
        r.dots.forEach(d => ctx.lineTo(d.pos.x, d.pos.y));
        ctx.stroke();

        // DRAW SIMPLE WHITE BULB (Last dot only)
        r.dots[r.dots.length - 1].drawSimpleBulb(ctx);
      });
      requestAnimationFrame(animate);
    };

    window.addEventListener('resize', init);
    const handleMouse = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    init();
    animate();
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 0, pointerEvents: 'none' }} />;
};

// --- MAIN HOME COMPONENT ---
export default function Home() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: productsData, error: prodError } = await supabase.from('products').select('*'); 
        if (prodError) throw prodError;
        if (productsData) setProducts(productsData);

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          fetchUserCart(session.user.id);
        } else {
          setCart(JSON.parse(localStorage.getItem('temp_cart') || '[]'));
        }
      } catch (err) {
        console.error("❌ FETCH ERROR:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchUserCart = async (userId) => {
    const { data } = await supabase.from('cart_items').select('*, products(*)').eq('user_id', userId);
    if (data) setCart(data.map(item => ({ ...item.products, selected_color: item.selected_color, selected_size: item.selected_size })).filter(p => p !== null));
  };

  const calculateTotal = () => {
    return cart.reduce((acc, item) => {
      const colorObj = item.variant_data?.find(v => v.name === item.selected_color) || item.variant_data?.[0];
      const sizeObj = colorObj?.sizes?.find(s => s.size === item.selected_size) || colorObj?.sizes?.[0];
      return acc + Number(sizeObj?.price || 0);
    }, 0);
  };

  return (
    <div style={styles.container}>
      <header style={styles.hero}>
        <RopeAnimation />
        <div style={styles.heroContent}>
          <h2 style={styles.heroTitle}>WALK ON CLOUDS.</h2>
          <p style={styles.heroSub}>Premium comfort for your every step.</p>
        </div>
      </header>

      <main style={styles.main}>
        {loading ? (
          <div style={styles.loader}>LOADING COLLECTION...</div>
        ) : (
          <div style={styles.grid}>
            {products.map((item) => (
              <div key={item.id} style={styles.card} onClick={() => navigate(`/product/${item.id}`)}>
                <div style={styles.imageWrapper}>
                  <img src={item.main_images?.[0]} alt={item.name} style={styles.image} />
                </div>
                <h3 style={styles.prodName}>{item.name?.toUpperCase()}</h3>
                <p style={styles.price}>
                    Rs. {Number(item.variant_data?.[0]?.sizes?.[0]?.price || 0).toLocaleString()}
                </p>
                <button style={styles.addBtn}>VIEW OPTIONS</button>
              </div>
            ))}
          </div>
        )}
      </main>

      {cart.length > 0 && (
        <div style={styles.checkoutBar}>
          <span style={styles.barText}>{cart.length} ITEMS | Rs. {calculateTotal().toLocaleString()}</span>
          <button onClick={() => navigate('/checkout')} style={styles.checkoutBtn}>CHECKOUT</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { fontFamily: "'Inter', sans-serif", backgroundColor: '#ffffff', minHeight: '100vh', color: '#000' },
  hero: { 
    position: 'relative', 
    textAlign: 'center', 
    padding: '200px 20px', 
    backgroundColor: '#000', 
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: { position: 'relative', zIndex: 1, pointerEvents: 'none' },
  heroTitle: { fontSize: '4rem', fontWeight: '900', letterSpacing: '-2px', margin: 0, color: '#fff' }, 
  heroSub: { fontSize: '13px', color: '#888', marginTop: '10px', textTransform: 'uppercase', letterSpacing: '3px' },
  main: { padding: '60px 8%', backgroundColor: '#fff' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '50px' },
  card: { textAlign: 'left', cursor: 'pointer' },
  imageWrapper: { width: '100%', height: '380px', overflow: 'hidden', marginBottom: '20px', borderRadius: '4px', backgroundColor: '#f5f5f5' },
  image: { width: '100%', height: '100%', objectFit: 'cover' },
  prodName: { fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '5px', color: '#000' }, 
  price: { color: '#666', fontSize: '12px', marginBottom: '15px' },
  addBtn: { width: '100%', padding: '15px', border: '1px solid #000', backgroundColor: '#000', color: '#fff', fontWeight: '700', fontSize: '10px', cursor: 'pointer', letterSpacing: '1px' }, 
  checkoutBar: { position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#000', padding: '15px 35px', display: 'flex', gap: '30px', alignItems: 'center', zIndex: 1000, borderRadius: '50px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' },
  barText: { color: '#fff', fontSize: '11px', fontWeight: '600', letterSpacing: '1px' },
  checkoutBtn: { backgroundColor: '#fff', color: '#000', border: 'none', padding: '8px 20px', fontWeight: '800', fontSize: '10px', cursor: 'pointer', borderRadius: '25px' },
  loader: { textAlign: 'center', marginTop: '100px', color: '#999', fontSize: '11px', letterSpacing: '2px' }
};