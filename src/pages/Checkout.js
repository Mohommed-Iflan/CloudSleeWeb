import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { Truck, MapPin, CreditCard, Landmark, Wallet, Plus, MessageCircle, X } from 'lucide-react';

export default function Checkout() {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  
  // Modal & New Address State
  const [showAddressPopup, setShowAddressPopup] = useState(false);
  const [newAddress, setNewAddress] = useState({
    full_name: '',
    address_line: '',
    city: '',
    state_province: '',
    country: 'Sri Lanka', // Defaulting to satisfy NOT NULL constraint
    phone_number: ''
  });

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
    } else if (location.state?.directItem) {
      setOrderItems([{
        ...location.state.directItem,
        quantity: 1,
        price_at_addition: location.state.directItem.price,
        selected_color: location.state.directItem.selectedColor,
        selected_size: location.state.directItem.selectedSize
      }]);
    } else {
      navigate('/cart');
      return;
    }
    await fetchAddresses(user.id);
    setLoading(false);
  };

  const fetchAddresses = async (userId) => {
    const { data } = await supabase.from('user_addresses').select('*').eq('user_id', userId);
    setAddresses(data || []);
    if (data?.length > 0) setSelectedAddressId(data[0].id);
  };

  const handleAddNewAddress = async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('user_addresses')
      .insert([{ ...newAddress, user_id: user.id }])
      .select()
      .single();

    if (error) {
      alert(`Database Error: ${error.message}`);
    } else {
      setAddresses([...addresses, data]);
      setSelectedAddressId(data.id);
      setShowAddressPopup(false);
      setNewAddress({ full_name: '', address_line: '', city: '', state_province: '', country: 'Sri Lanka', phone_number: '' });
    }
  };

  const calculateShipping = () => orderItems.length === 0 ? 0 : 300;
  const calculateSubtotal = () => orderItems.reduce((acc, i) => acc + (Number(i.price_at_addition || i.price) * (i.quantity || 1)), 0);
  const calculateTotal = () => calculateSubtotal() + calculateShipping();

  const handlePlaceOrder = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const selectedAddress = addresses.find(a => a.id === selectedAddressId);
      if (!selectedAddress) return alert("Please select a shipping address.");

      const orderStatus = paymentMethod === 'Bank Transfer' ? 'pending_payment' : 'pending';

      const { data: order, error } = await supabase.from('orders').insert([{
        user_id: user.id,
        items: orderItems,
        customer_email: user.email,
        total_amount: calculateTotal(),
        shipping_fee: calculateShipping(),
        payment_method: paymentMethod,
        status: orderStatus,
        shipping_address: `${selectedAddress.address_line}, ${selectedAddress.city}`,
        customer_name: selectedAddress.full_name,
        phone: selectedAddress.phone_number
      }]).select().single();

      if (error) throw error;
      navigate('/success', { state: { orderId: order.id } });
    } catch (err) {
      alert(`Order Failed: ${err.message}`);
    }
  };

  if (loading) return <div style={styles.loader}>INITIALIZING...</div>;

  const selectedAddrObj = addresses.find(a => a.id === selectedAddressId);

  return (
    <div style={styles.container}>
      {/* ADDRESS POPUP MODAL */}
      {showAddressPopup && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>ADD NEW ADDRESS</h3>
              <button onClick={() => setShowAddressPopup(false)} style={styles.closeBtn}><X size={20}/></button>
            </div>
            <form onSubmit={handleAddNewAddress} style={styles.form}>
              <input placeholder="Full Name" style={styles.input} required value={newAddress.full_name} onChange={(e) => setNewAddress({...newAddress, full_name: e.target.value})} />
              <input placeholder="Address (Street, House No)" style={styles.input} required value={newAddress.address_line} onChange={(e) => setNewAddress({...newAddress, address_line: e.target.value})} />
              <div style={styles.inputGroup}>
                <input placeholder="City" style={styles.input} required value={newAddress.city} onChange={(e) => setNewAddress({...newAddress, city: e.target.value})} />
                <input placeholder="Country" style={{...styles.input, backgroundColor: '#f9f9f9'}} readOnly value={newAddress.country} />
              </div>
              <input placeholder="Phone Number" style={styles.input} required value={newAddress.phone_number} onChange={(e) => setNewAddress({...newAddress, phone_number: e.target.value})} />
              <button type="submit" style={styles.saveBtn}>SAVE ADDRESS</button>
            </form>
          </div>
        </div>
      )}

      <h2 style={styles.mainTitle}>CHECKOUT</h2>

      {/* TOP: PRODUCT & ADDRESS SIDE-BY-SIDE */}
      <div style={styles.topHeaderGrid}>
        <div style={styles.productSide}>
          <p style={styles.sectionLabel}>PRODUCTS TO BE CHECKED OUT</p>
          {orderItems.map((item, idx) => (
            <div key={idx} style={styles.productRow}>
              <img src={item.products?.main_images?.[0] || item.image_url} alt="" style={styles.productImg} />
              <div style={{ flex: 1 }}>
                <p style={styles.productName}>{(item.products?.name || item.name || "Product").toUpperCase()}</p>
                <p style={styles.productMeta}>{item.selected_color || item.selectedColor} | SIZE {item.selected_size || item.selectedSize} (x{item.quantity})</p>
              </div>
              <p style={styles.itemPriceInline}>Rs. {Number(item.price_at_addition || item.price).toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div style={styles.addressSide}>
          <div style={styles.flexBetween}>
            <p style={styles.sectionLabel}>SHIPPING ADDRESS</p>
            <button style={styles.addNewBtn} onClick={() => setShowAddressPopup(true)}><Plus size={12} /> ADD NEW</button>
          </div>
          {selectedAddrObj ? (
            <div style={styles.selectedAddrBar}>
              <div style={{flex: 1}}>
                <p style={styles.addrName}>{selectedAddrObj.full_name.toUpperCase()}</p>
                <p style={styles.addrText}>{selectedAddrObj.address_line}, {selectedAddrObj.city}</p>
                <p style={styles.addrText}>{selectedAddrObj.phone_number}</p>
              </div>
            </div>
          ) : (
            <div style={styles.noAddressBox} onClick={() => setShowAddressPopup(true)}>
                <p>No address found. Click to add one.</p>
            </div>
          )}
        </div>
      </div>

      <div style={styles.mainGrid}>
        {/* PAYMENT OPTIONS (THIN STYLE) */}
        <div style={styles.paymentColumn}>
          <p style={styles.sectionLabel}>2. PAYMENT METHOD</p>
          <div style={styles.paymentList}>
            {[
              { id: 'COD', label: 'Cash On Delivery', icon: <Truck size={18}/> },
              { id: 'Card', label: 'Visa / Master Card', icon: <CreditCard size={18}/> },
              { id: 'KOKO', label: 'KOKO (Buy Now Pay Later)', icon: <Wallet size={18}/> },
              { id: 'Bank Transfer', label: 'Bank Transfer', icon: <Landmark size={18}/> }
            ].map(pay => (
              <div key={pay.id} 
                style={{...styles.paymentRowThin, borderColor: paymentMethod === pay.id ? '#000' : '#f0f0f0', borderWidth: paymentMethod === pay.id ? '2px' : '1px'}}
                onClick={() => setPaymentMethod(pay.id)}
              >
                <div style={styles.radioOuter}>{paymentMethod === pay.id && <div style={styles.radioInner} />}</div>
                {pay.icon}
                <p style={styles.payLabelThin}>{pay.label}</p>
              </div>
            ))}
          </div>

          {paymentMethod === 'Bank Transfer' && (
            <div style={styles.bankDetailBox}>
              <p style={styles.bankTitle}>BANK TRANSFER DETAILS</p>
              <div style={styles.bankGrid}>
                <div><p style={styles.bankLabel}>Bank</p><b>Commercial Bank</b></div>
                <div><p style={styles.bankLabel}>Acc Name</p><b>CloudSlee Slipper Store</b></div>
                <div><p style={styles.bankLabel}>Acc Number</p><b>8010045623</b></div>
                <div><p style={styles.bankLabel}>Branch</p><b>Dehiowita</b></div>
              </div>
              <div style={styles.whatsappNotice}>
                <MessageCircle size={16} color="#25D366" />
                <p>WhatsApp receipt to <b>+94 72 637 5288</b> after payment.</p>
              </div>
            </div>
          )}
        </div>

        {/* ORDER SUMMARY (STAYING SYNCED) */}
        <div style={styles.summaryColumn}>
          <div style={styles.blackBox}>
            <p style={styles.summaryTitle}>ORDER SUMMARY</p>
            <div style={styles.summaryRow}><span>SUBTOTAL</span><span>Rs. {calculateSubtotal().toLocaleString()}</span></div>
            <div style={styles.summaryRow}><span>SHIPPING FEE</span><span>Rs. 300</span></div>
            <div style={styles.totalRow}><span>TOTAL</span><span>Rs. {calculateTotal().toLocaleString()}</span></div>
            <button style={styles.confirmBtn} onClick={handlePlaceOrder}>PLACE ORDER</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '30px 5%', maxWidth: '1400px', margin: 'auto', fontFamily: 'Inter, sans-serif' },
  mainTitle: { fontSize: '24px', fontWeight: '900', marginBottom: '30px', letterSpacing: '-0.5px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  modalContent: { backgroundColor: '#fff', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '450px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  modalTitle: { fontSize: '15px', fontWeight: '900' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '12px', border: '1px solid #eee', borderRadius: '8px', fontSize: '14px', width: '100%', boxSizing: 'border-box' },
  inputGroup: { display: 'flex', gap: '10px' },
  saveBtn: { padding: '15px', background: '#000', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', marginTop: '10px' },
  topHeaderGrid: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '25px', marginBottom: '40px' },
  productSide: { background: '#fff', padding: '20px', borderRadius: '15px', border: '1px solid #eee' },
  productRow: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' },
  productImg: { width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' },
  productName: { fontSize: '12px', fontWeight: '700' },
  productMeta: { fontSize: '10px', color: '#888' },
  itemPriceInline: { fontSize: '13px', fontWeight: '800', marginLeft: 'auto' },
  addressSide: { background: '#fff', padding: '20px', borderRadius: '15px', border: '1px solid #eee' },
  selectedAddrBar: { display: 'flex', gap: '15px', alignItems: 'flex-start', marginTop: '10px' },
  addrName: { fontSize: '13px', fontWeight: '800' },
  addrText: { fontSize: '12px', color: '#666', lineHeight: '1.4' },
  noAddressBox: { padding: '20px', border: '1px dashed #ccc', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', color: '#999' },
  mainGrid: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px', alignItems: 'start' },
  paymentColumn: { display: 'flex', flexDirection: 'column' },
  paymentList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  paymentRowThin: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', border: '1px solid #f0f0f0', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#fff' },
  payLabelThin: { fontSize: '13px', fontWeight: '600' },
  radioOuter: { width: '16px', height: '16px', border: '1px solid #ccc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: '8px', height: '8px', background: '#000', borderRadius: '50%' },
  bankDetailBox: { marginTop: '15px', background: '#fcfcfc', padding: '15px', borderRadius: '10px', border: '1px solid #eee' },
  bankGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  bankLabel: { fontSize: '9px', color: '#999' },
  bankTitle: { fontSize: '11px', fontWeight: '900' },
  whatsappNotice: { marginTop: '15px', display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '8px', fontSize: '10px' },
  summaryColumn: { position: 'sticky', top: '20px' },
  blackBox: { background: '#000', color: '#fff', padding: '35px', borderRadius: '25px' },
  summaryTitle: { fontSize: '12px', fontWeight: '900', opacity: 0.6 },
  summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '13px' },
  totalRow: { display: 'flex', justifyContent: 'space-between', fontSize: '24px', fontWeight: '900', marginTop: '15px', borderTop: '1px solid #333', paddingTop: '15px' },
  confirmBtn: {
  width: '100%',
  padding: '18px',
  background: '#fff',
  color: '#000',
  border: 'none',
  borderRadius: '10px',
  fontWeight: '900',
  fontSize: '14px',
  // ADD THIS LINE:
  marginTop: '30px', 
  cursor: 'pointer',
  transition: 'background 0.3s ease',
},
  sectionLabel: { fontSize: '10px', fontWeight: '900', color: '#999', textTransform: 'uppercase', marginBottom: '12px' },
  addNewBtn: { background: '#000', color: '#fff', border: 'none', padding: '5px 10px', fontSize: '10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' },
  flexBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  loader: { textAlign: 'center', marginTop: '100px', fontSize: '14px', color: '#999' }
};