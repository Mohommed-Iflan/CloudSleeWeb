import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, Minus, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Cart() {
  const [availableItems, setAvailableItems] = useState([]);
  const [unavailableItems, setUnavailableItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchCart = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }

    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        id, product_id, selected_color, selected_size, quantity, price_at_addition,
        products ( id, name, main_images, variant_data )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error("Error fetching cart:", error);
    } else {
      processInventory(data);
    }
    setLoading(false);
  };

  const processInventory = (items) => {
    const available = [];
    const unavailable = [];

    items.forEach(item => {
      const colorData = item.products?.variant_data?.find(v => v.name === item.selected_color);
      const sizeData = colorData?.sizes?.find(s => s.size === item.selected_size);
      const currentStock = Number(sizeData?.stock) || 0;

      if (currentStock > 0) {
        available.push({ ...item, maxStock: currentStock });
      } else {
        unavailable.push(item);
      }
    });

    setAvailableItems(available);
    setUnavailableItems(unavailable);
    setSelectedIds(available.map(i => i.id));
  };

  const updateQuantity = async (itemId, currentQty, adjustment, maxStock) => {
    const newQty = currentQty + adjustment;
    if (newQty < 1 || newQty > maxStock) return;

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: newQty })
      .eq('id', itemId);

    if (!error) {
      setAvailableItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, quantity: newQty } : item
      ));
    }
  };

  const removeItem = async (itemId, isAvailable) => {
    const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
    if (!error) {
      if (isAvailable) {
        setAvailableItems(prev => prev.filter(i => i.id !== itemId));
        setSelectedIds(prev => prev.filter(id => id !== itemId));
      } else {
        setUnavailableItems(prev => prev.filter(i => i.id !== itemId));
      }
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const calculateShipping = () => {
    const itemCount = selectedIds.length;
    if (itemCount === 0) return 0;
    if (itemCount === 1) return 300;
    if (itemCount === 2) return 400;
    return 400 + (itemCount - 2) * 50;
  };

  const calculateSubtotal = () => {
    return availableItems
      .filter(item => selectedIds.includes(item.id))
      .reduce((acc, item) => acc + (Number(item.price_at_addition) * item.quantity), 0);
  };

  const calculateTotal = () => calculateSubtotal() + calculateShipping();

  const handleProceedToCheckout = () => {
    const itemsToBuy = availableItems.filter(item => selectedIds.includes(item.id));
    if (itemsToBuy.length === 0) return;
    navigate('/checkout', { 
      state: { 
        selectedItems: itemsToBuy, 
        subtotal: calculateSubtotal(),
        shippingFee: calculateShipping(),
        totalAmount: calculateTotal() 
      } 
    });
  };

  if (loading) return <div style={styles.loader}>Validating Inventory...</div>;

  return (
    <div style={{...styles.container, padding: isMobile ? '30px 5%' : '60px 8%'}}>
      <header style={styles.header}>
        <h2 style={{...styles.title, fontSize: isMobile ? '20px' : '24px'}}>YOUR SHOPPING BAG</h2>
        <p style={styles.subtitle}>{availableItems.length + unavailableItems.length} ITEMS TOTAL</p>
      </header>

      <div style={{...styles.content, gridTemplateColumns: isMobile ? '1fr' : '1.8fr 1fr', gap: isMobile ? '30px' : '60px'}}>
        <div style={styles.itemList}>
          {availableItems.length > 0 ? (
            availableItems.map((item) => (
              <div key={item.id} style={{...styles.cartCard, flexDirection: isMobile ? 'row' : 'row', alignItems: 'flex-start'}}>
                <div style={styles.checkWrapper}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(item.id)} 
                    onChange={() => toggleSelect(item.id)}
                    style={styles.checkbox}
                  />
                </div>
                <img src={item.products?.main_images?.[0]} alt="" style={{...styles.img, width: isMobile ? '80px' : '110px', height: isMobile ? '80px' : '110px'}} />
                <div style={styles.info}>
                  <h3 style={{...styles.prodName, fontSize: isMobile ? '13px' : '14px'}}>{item.products?.name?.toUpperCase()}</h3>
                  <p style={styles.variantDetails}>{item.selected_color} | SIZE {item.selected_size}</p>
                  
                  <div style={{...styles.qtyRow, flexDirection: isMobile ? 'column' : 'row', alignItems: 'flex-start', gap: isMobile ? '10px' : '15px'}}>
                    <div style={styles.qtyPicker}>
                      <button onClick={() => updateQuantity(item.id, item.quantity, -1, item.maxStock)} style={styles.qtyBtn}><Minus size={12}/></button>
                      <span style={styles.qtyVal}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity, 1, item.maxStock)} style={styles.qtyBtn}><Plus size={12}/></button>
                    </div>
                    <span style={styles.stockStatus}><CheckCircle2 size={12} color="#27ae60"/> {item.maxStock} in stock</span>
                  </div>
                </div>
                <div style={{...styles.priceCol, height: isMobile ? 'auto' : '100px'}}>
                  <p style={{...styles.price, fontSize: isMobile ? '14px' : '16px'}}>Rs. {(item.price_at_addition * item.quantity).toLocaleString()}</p>
                  <button onClick={() => removeItem(item.id, true)} style={{...styles.removeBtn, marginTop: isMobile ? '15px' : '0'}}><Trash2 size={16}/></button>
                </div>
              </div>
            ))
          ) : (
            availableItems.length === 0 && unavailableItems.length === 0 && (
              <div style={styles.empty}>
                <ShoppingBag size={48} color="#ddd" />
                <p>Your bag is currently empty.</p>
                <button onClick={() => navigate('/')} style={styles.shopBtn}>BROWSE COLLECTION</button>
              </div>
            )
          )}

          {unavailableItems.length > 0 && (
            <div style={styles.unavailableSection}>
              <h4 style={styles.unavailableHeader}><AlertCircle size={14}/> UNAVAILABLE</h4>
              <p style={styles.unavailableSub}>Items below recently went out of stock.</p>
              {unavailableItems.map((item) => (
                <div key={item.id} style={styles.unavailableCard}>
                  <div style={{width: '30px'}} />
                  <img src={item.products?.main_images?.[0]} alt="" style={{...styles.imgGray, width: isMobile ? '60px' : '90px', height: isMobile ? '60px' : '90px'}} />
                  <div style={styles.info}>
                    <h3 style={{...styles.prodName, color: '#999', fontSize: isMobile ? '12px' : '14px'}}>{item.products?.name}</h3>
                    <p style={styles.outText}>OUT OF STOCK</p>
                  </div>
                  <button onClick={() => removeItem(item.id, false)} style={styles.removeBtn}><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside style={{...styles.summary, position: isMobile ? 'static' : 'sticky', padding: isMobile ? '25px' : '35px'}}>
          <h3 style={styles.summaryTitle}>ORDER SUMMARY</h3>
          <div style={styles.summaryRow}>
            <span>SUBTOTAL ({selectedIds.length} ITEMS)</span>
            <span>Rs. {calculateSubtotal().toLocaleString()}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>SHIPPING</span>
            <span style={{color: '#1a1a1a', fontWeight: 'bold'}}>
              {selectedIds.length > 0 ? `Rs. ${calculateShipping().toLocaleString()}` : "Rs. 0"}
            </span>
          </div>
          <div style={styles.totalRow}>
            <span>TOTAL</span>
            <span>Rs. {calculateTotal().toLocaleString()}</span>
          </div>
          <button 
            disabled={selectedIds.length === 0} 
            onClick={handleProceedToCheckout} 
            style={{
                ...styles.checkoutBtn, 
                backgroundColor: selectedIds.length === 0 ? '#ccc' : '#000',
                cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            PROCEED TO CHECKOUT <ArrowRight size={18} />
          </button>
          <p style={styles.secureText}>Secure checkout powered by Supabase</p>
        </aside>
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: '1300px', margin: 'auto', fontFamily: "'Inter', sans-serif", color: '#1a1a1a' },
  header: { marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' },
  title: { fontWeight: '900', letterSpacing: '-0.5px' },
  subtitle: { fontSize: '11px', color: '#888', marginTop: '5px' },
  content: { display: 'grid', alignItems: 'start' },
  itemList: { display: 'flex', flexDirection: 'column' },
  cartCard: { display: 'flex', padding: '20px 0', borderBottom: '1px solid #eee', gap: '15px' },
  checkWrapper: { display: 'flex', alignItems: 'center', paddingTop: '5px' },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer', accentColor: '#000' },
  img: { objectFit: 'cover', borderRadius: '8px', backgroundColor: '#f9f9f9' },
  imgGray: { objectFit: 'cover', borderRadius: '8px', filter: 'grayscale(1)', opacity: 0.5 },
  info: { flex: 1 },
  prodName: { fontWeight: '700', marginBottom: '4px', letterSpacing: '0.3px' },
  variantDetails: { fontSize: '10px', color: '#777', textTransform: 'uppercase', marginBottom: '10px' },
  qtyRow: { display: 'flex', gap: '15px' },
  qtyPicker: { display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '6px', overflow: 'hidden' },
  qtyBtn: { padding: '6px 10px', background: '#fff', border: 'none', cursor: 'pointer' },
  qtyVal: { fontSize: '12px', fontWeight: '600', minWidth: '20px', textAlign: 'center' },
  stockStatus: { fontSize: '9px', color: '#27ae60', display: 'flex', alignItems: 'center', gap: '4px' },
  priceCol: { textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
  price: { fontWeight: '800' },
  removeBtn: { border: 'none', background: 'none', cursor: 'pointer', color: '#ccc' },
  summary: { backgroundColor: '#fafafa', borderRadius: '16px', border: '1px solid #f0f0f0', top: '40px' },
  summaryTitle: { fontSize: '15px', fontWeight: '800', marginBottom: '20px', letterSpacing: '1px' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '12px', color: '#555' },
  totalRow: { display: 'flex', justifyContent: 'space-between', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee', fontSize: '18px', fontWeight: '900' },
  checkoutBtn: { width: '100%', padding: '18px', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '14px', marginTop: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  secureText: { textAlign: 'center', fontSize: '9px', color: '#aaa', marginTop: '15px', textTransform: 'uppercase' },
  unavailableSection: { marginTop: '40px', backgroundColor: '#fff5f5', padding: '20px', borderRadius: '12px' },
  unavailableHeader: { fontSize: '12px', color: '#e74c3c', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' },
  unavailableSub: { fontSize: '10px', color: '#888', marginBottom: '15px' },
  unavailableCard: { display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #ffebeb', gap: '15px' },
  outText: { fontSize: '10px', color: '#e74c3c', fontWeight: 'bold', marginTop: '5px' },
  empty: { textAlign: 'center', padding: '60px 0' },
  shopBtn: { padding: '12px 30px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '8px', marginTop: '20px', cursor: 'pointer', fontWeight: '700', fontSize: '11px' },
  loader: { textAlign: 'center', padding: '100px', fontSize: '14px', color: '#888', letterSpacing: '2px' }
};