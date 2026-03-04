import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Checkout() {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    prepareCheckout();
  }, []);

  const prepareCheckout = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }

    if (location.state?.selectedItems) {
      setOrderItems(location.state.selectedItems);
    } 
    else if (location.state?.directItem) {
      setOrderItems([{
        ...location.state.directItem,
        quantity: 1,
        price_at_addition: location.state.directItem.price 
      }]);
    } 
    else {
      navigate('/cart');
      return;
    }

    await fetchAddresses(user.id);
    setLoading(false);
  };

  const fetchAddresses = async (userId) => {
    const { data } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });
    
    setAddresses(data || []);
    if (data?.length > 0) {
      const defaultAddr = data.find(a => a.is_default) || data[0];
      setSelectedAddressId(defaultAddr.id);
    }
  };

  const adjustStock = async (items, adjustment) => {
    for (const item of items) {
      const pId = String(item.id || item.product_id || '');
      const pColor = item.selectedColor; 
      const pSize = String(item.selectedSize || '');
      const pAdj = parseInt(adjustment);

      if (!pColor || pColor === "undefined" || !pSize || pSize === "undefined") {
        console.error("BALANCING FAILED: Item missing selection details!", item);
        continue; 
      }

      const { error } = await supabase.rpc('update_variant_stock', {
        p_product_id: pId,
        p_color_name: pColor,
        p_size_val: pSize,
        p_adjustment: pAdj
      });

      if (error) console.error("RPC Error:", error.message);
    }
  };

  const handlePlaceOrder = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const selectedAddress = addresses.find(a => a.id === selectedAddressId);
    
    if (!selectedAddress) { alert("PLEASE SELECT A SHIPPING ADDRESS."); return; }

    const totalAmount = calculateSubtotal();
    const fullAddressString = `${selectedAddress.address_line}, ${selectedAddress.city}, ${selectedAddress.state_province}`;

    // 1. Create the Order (Adding customer_email)
    const { data: order, error: orderError } = await supabase.from('orders').insert([{
      user_id: user.id,
      items: orderItems, 
      total_amount: totalAmount,
      shipping_address: fullAddressString,
      phone: selectedAddress.phone_number,
      customer_name: selectedAddress.full_name,
      customer_email: user.email, // <--- ADD THIS LINE (Gets email from logged-in user)
      status: 'pending'
    }]).select().single();

    if (orderError) throw orderError;

    // ... (rest of your stock and cleanup logic)

   // Inside your Checkout component, where you finish the order:
navigate('/success', { 
  state: { 
    orderId: order.id, 
    orderItems: orderItems // <--- MAKE SURE THIS IS ADDED
  } 
});

  } catch (err) {
    console.error(err);
    alert(`ORDER FAILED: ${err.message}`);
  }
};

  const calculateSubtotal = () => {
    return orderItems.reduce((acc, i) => 
      acc + (Number(i.price_at_addition || i.price) * (i.quantity || 1)), 0
    );
  };

  if (loading) return <div style={styles.loader}>SECURE CHECKOUT INITIALIZING...</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>CHECKOUT</h2>
      <div style={styles.grid}>
        <div style={styles.leftCol}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>SHIPPING ADDRESS</h3>
            <button onClick={() => setShowAddressForm(!showAddressForm)} style={styles.manageBtn}>
              {showAddressForm ? "CANCEL" : "ADD NEW ADDRESS"}
            </button>
          </div>

          {!showAddressForm && (
            <div style={styles.addressGrid}>
              {addresses.map((addr) => (
                <div 
                  key={addr.id} 
                  onClick={() => setSelectedAddressId(addr.id)}
                  style={{
                    ...styles.addressCard,
                    borderColor: selectedAddressId === addr.id ? '#000' : '#eee',
                    backgroundColor: selectedAddressId === addr.id ? '#fafafa' : '#fff'
                  }}
                >
                  <p style={styles.addrName}>{addr.full_name.toUpperCase()}</p>
                  <p style={styles.addrText}>{addr.address_line}, {addr.city}</p>
                  <p style={styles.addrText}>{addr.phone_number}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.rightCol}>
          <div style={styles.summaryCard}>
            <h3 style={styles.sectionTitle}>YOUR ORDER</h3>
            <div style={styles.itemList}>
              {orderItems.map((item, idx) => (
                <div key={idx} style={styles.itemRow}>
                  <div style={{flex: 1}}>
                    <p style={styles.itemName}>{item.name}</p>
                    <p style={styles.itemMeta}>
                      {item.selectedColor} | SIZE {item.selectedSize} (x{item.quantity || 1})
                    </p>
                  </div>
                  <p style={styles.itemPrice}>
                    Rs. {(Number(item.price_at_addition || item.price) * (item.quantity || 1)).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            
            <div style={styles.totalRow}>
              <span>TOTAL AMOUNT</span>
              <span>Rs. {calculateSubtotal().toLocaleString()}</span>
            </div>

            <button 
              onClick={handlePlaceOrder} 
              disabled={!selectedAddressId || orderItems.length === 0}
              style={{
                ...styles.confirmBtn,
                backgroundColor: (selectedAddressId) ? '#000' : '#ccc'
              }}
            >
              CONFIRM ORDER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '60px 8%', maxWidth: '1200px', margin: 'auto', fontFamily: 'Inter, sans-serif' },
  title: { fontSize: '22px', fontWeight: '900', marginBottom: '40px' },
  grid: { display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '50px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  sectionTitle: { fontSize: '13px', fontWeight: '800', letterSpacing: '1px' },
  manageBtn: { background: 'none', border: '1px solid #000', padding: '6px 12px', fontSize: '10px', cursor: 'pointer' },
  addressGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '15px' },
  addressCard: { padding: '20px', border: '1px solid #eee', cursor: 'pointer' },
  addrName: { fontSize: '13px', fontWeight: '700', marginBottom: '5px' },
  addrText: { fontSize: '12px', color: '#666' },
  summaryCard: { padding: '30px', backgroundColor: '#fafafa', borderRadius: '12px' },
  itemRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' },
  itemName: { fontSize: '12px', fontWeight: '700' },
  itemMeta: { fontSize: '10px', color: '#888' },
  itemPrice: { fontSize: '12px', fontWeight: '600' },
  totalRow: { display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '16px', marginTop: '20px' },
  confirmBtn: { width: '100%', padding: '18px', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', marginTop: '25px', cursor: 'pointer' },
  loader: { textAlign: 'center', marginTop: '100px' }
};