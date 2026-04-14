import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { Truck, CreditCard, Landmark, Wallet, Plus, MessageCircle, X, Trash2, CheckCircle2 } from 'lucide-react';
import './Checkout.css'; 

export default function Checkout() {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showAddressPopup, setShowAddressPopup] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newAddress, setNewAddress] = useState({
    full_name: '', address_line: '', city: '', state_province: '', country: 'Sri Lanka', phone_number: ''
  });

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    prepareCheckout();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const prepareCheckout = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }

    if (location.state?.selectedItems) {
      setOrderItems(location.state.selectedItems);
    } else if (location.state?.items) {
      const formattedItems = location.state.items.map(item => ({
        ...item,
        price_at_addition: item.price,
        selected_color: item.color,
        selected_size: item.size,
        display_image: item.image || item.image_url || item.products?.main_images?.[0]
      }));
      setOrderItems(formattedItems);
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
    if (data?.length > 0 && !selectedAddressId) setSelectedAddressId(data[0].id);
  };

  const handleAddNewAddress = async (e) => {
    e.preventDefault();
    if (addresses.length >= 3) return alert("Maximum 3 addresses allowed.");
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('user_addresses')
      .insert([{ ...newAddress, user_id: user.id }])
      .select().single();

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      setAddresses([...addresses, data]);
      setSelectedAddressId(data.id);
      setIsAddingNew(false);
      setNewAddress({ full_name: '', address_line: '', city: '', state_province: '', country: 'Sri Lanka', phone_number: '' });
    }
  };

  const deleteAddress = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this address?")) return;
    const { error } = await supabase.from('user_addresses').delete().eq('id', id);
    if (!error) {
      const updated = addresses.filter(a => a.id !== id);
      setAddresses(updated);
      if (selectedAddressId === id) setSelectedAddressId(updated[0]?.id || null);
    }
  };

  const calculateShipping = () => orderItems.length === 0 ? 0 : 300;
  const calculateSubtotal = () => orderItems.reduce((acc, i) => acc + (Number(i.price_at_addition || i.price) * (i.quantity || 1)), 0);
  const calculateTotal = () => calculateSubtotal() + calculateShipping();

  const handlePlaceOrder = async () => {
    if (isAnimating) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    const selectedAddress = addresses.find(a => a.id === selectedAddressId);
    if (!selectedAddress) return alert("Please select a shipping address.");

    setIsAnimating(true);

    try {
      const orderStatus = paymentMethod === 'Bank Transfer' ? 'pending_payment' : 'pending';
      
      const finalItems = orderItems.map(item => ({
        ...item,
        image_url: item.display_image || item.image || item.image_url || item.products?.main_images?.[0]
      }));

      // FIX 1: Ensure error name matches (error vs orderError)
      const { data: order, error: insertError } = await supabase.from('orders').insert([{
        user_id: user.id,
        items: finalItems,
        customer_email: user.email,
        total_amount: calculateTotal(),
        shipping_fee: calculateShipping(),
        payment_method: paymentMethod,
        status: orderStatus,
        shipping_address: `${selectedAddress.address_line}, ${selectedAddress.city}`,
        customer_name: selectedAddress.full_name,
        phone: selectedAddress.phone_number
      }]).select().single();

      if (insertError) throw insertError;

      // FIX 2: Correct callback syntax for .map()
      const itemIdsToRemove = orderItems.map(item => item.id);

      const { error: cartError } = await supabase
        .from('cart_items') // Changed to match your screenshot
        .delete()
        .in('id', itemIdsToRemove);

      if (cartError) {
        console.error("Order Placed, but failed to clear cart:", cartError);
      }

      setTimeout(() => {
        navigate('/success', { state: { orderId: order.id } });
      }, 9500);

    } catch (err) {
      setIsAnimating(false);
      alert(`Order Failed: ${err.message}`);
    }
  };

  if (loading) return <div style={styles.loader}>INITIALIZING...</div>;

  const selectedAddrObj = addresses.find(a => a.id === selectedAddressId);

  return (
    <div style={styles.container}>
      {showAddressPopup && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modalContent, width: isMobile ? '95%' : '450px'}}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{isAddingNew ? "ADD NEW ADDRESS" : "SELECT ADDRESS"}</h3>
              <button onClick={() => {setShowAddressPopup(false); setIsAddingNew(false);}} style={styles.closeBtn}><X size={20}/></button>
            </div>

            {!isAddingNew ? (
              <div style={styles.addressListScroll}>
                {addresses.map(addr => (
                  <div 
                    key={addr.id} 
                    style={{...styles.addrItemCard, borderColor: selectedAddressId === addr.id ? '#000' : '#eee'}}
                    onClick={() => {setSelectedAddressId(addr.id); setShowAddressPopup(false);}}
                  >
                    <div style={{flex: 1}}>
                        <p style={{fontSize: '13px', fontWeight: '800'}}>{addr.full_name.toUpperCase()}</p>
                        <p style={{fontSize: '11px', color: '#666'}}>{addr.address_line}, {addr.city}</p>
                    </div>
                    <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                        {selectedAddressId === addr.id && <CheckCircle2 size={18} color="#000" />}
                        <button onClick={(e) => deleteAddress(addr.id, e)} style={styles.deleteBtn}><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
                {addresses.length < 3 ? (
                  <button style={styles.modalAddBtn} onClick={() => setIsAddingNew(true)}>
                    <Plus size={16} /> ADD ANOTHER ADDRESS ({addresses.length}/3)
                  </button>
                ) : (
                  <p style={styles.limitText}>Address limit reached (Max 3)</p>
                )}
              </div>
            ) : (
              <form onSubmit={handleAddNewAddress} style={styles.form}>
                <input placeholder="Full Name" style={styles.input} required value={newAddress.full_name} onChange={(e) => setNewAddress({...newAddress, full_name: e.target.value})} />
                <input placeholder="Address (Street, House No)" style={styles.input} required value={newAddress.address_line} onChange={(e) => setNewAddress({...newAddress, address_line: e.target.value})} />
                <div style={styles.inputGroup}>
                  <input placeholder="City" style={styles.input} required value={newAddress.city} onChange={(e) => setNewAddress({...newAddress, city: e.target.value})} />
                  <input placeholder="Country" style={{...styles.input, backgroundColor: '#f9f9f9'}} readOnly value={newAddress.country} />
                </div>
                <input placeholder="Phone Number" style={styles.input} required value={newAddress.phone_number} onChange={(e) => setNewAddress({...newAddress, phone_number: e.target.value})} />
                <div style={{display: 'flex', gap: '10px'}}>
                    <button type="button" onClick={() => setIsAddingNew(false)} style={{...styles.saveBtn, background: '#eee', color: '#000'}}>BACK</button>
                    <button type="submit" style={{...styles.saveBtn, flex: 2}}>SAVE ADDRESS</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <h2 style={styles.mainTitle}>CHECKOUT</h2>

      <div style={{...styles.topHeaderGrid, gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr'}}>
        <div style={styles.productSide}>
          <p style={styles.sectionLabel}>PRODUCTS TO BE CHECKED OUT</p>
          {orderItems.map((item, idx) => (
            <div key={idx} style={styles.productRow}>
              <img 
                src={item.display_image || item.image || item.image_url || item.products?.main_images?.[0]} 
                alt="" 
                style={styles.productImg} 
                onError={(e) => { e.target.src = 'https://via.placeholder.com/50?text=Product'; }}
              />
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
            <button style={styles.addNewBtn} onClick={() => setShowAddressPopup(true)}>CHANGE</button>
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
            <div style={styles.noAddressBox} onClick={() => {setShowAddressPopup(true); setIsAddingNew(true);}}>
                <p>No address found. Click to add one.</p>
            </div>
          )}
        </div>
      </div>

      <div style={{...styles.mainGrid, gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr'}}>
        <div style={styles.paymentColumn}>
          <p style={styles.sectionLabel}>2. PAYMENT METHOD</p>
          <div style={{...styles.paymentFlexContainer, flexDirection: isMobile ? 'column' : 'row'}}>
            <div style={{...styles.paymentListSide, width: isMobile ? '100%' : 'auto'}}>
              {[
                { id: 'COD', label: 'Cash On Delivery', icon: <Truck size={18}/>, disabled: false },
                { id: 'Bank Transfer', label: 'Bank Transfer', icon: <Landmark size={18}/>, disabled: false },
                { id: 'Card', label: 'Visa / Master Card (Coming Soon)', icon: <CreditCard size={18}/>, disabled: true },
                { id: 'KOKO', label: 'KOKO (Coming Soon)', icon: <Wallet size={18}/>, disabled: true },
              ].map(pay => (
                <div key={pay.id} 
                  style={{
                      ...styles.paymentRowThin, 
                      borderColor: paymentMethod === pay.id ? '#000' : '#f0f0f0', 
                      borderWidth: paymentMethod === pay.id ? '2px' : '1px',
                      opacity: pay.disabled ? 0.4 : 1,
                      cursor: pay.disabled ? 'not-allowed' : 'pointer'
                  }}
                  onClick={() => !pay.disabled && setPaymentMethod(pay.id)}
                >
                  <div style={styles.radioOuter}>{paymentMethod === pay.id && <div style={styles.radioInner} />}</div>
                  {pay.icon}
                  <p style={styles.payLabelThin}>{pay.label}</p>
                </div>
              ))}
            </div>

            <div style={{...styles.detailsSide, width: isMobile ? '100%' : 'auto'}}>
              {paymentMethod === 'Bank Transfer' ? (
                <div style={styles.bankDetailBoxSide}>
                  <p style={styles.bankTitle}>BANK TRANSFER DETAILS</p>
                  <div style={styles.bankGrid}>
                    <div><p style={styles.bankLabel}>Bank</p><b>Commercial Bank</b></div>
                    <div><p style={styles.bankLabel}>Acc Name</p><b>M M IRFANA</b></div>
                    <div><p style={styles.bankLabel}>Acc Number</p><b>8015582856</b></div>
                    <div><p style={styles.bankLabel}>Branch</p><b>Avissawella</b></div>
                  </div>
                  <div style={styles.whatsappNotice}>
                    <MessageCircle size={16} color="#25D366" />
                    <p>WhatsApp receipt to <b>+94 72 637 5288</b></p>
                  </div>
                </div>
              ) : (
                !isMobile && (
                  <div style={styles.emptyDetailPlaceholder}>
                     <p style={{fontSize: '11px', color: '#ccc'}}>Select Bank Transfer to view details</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        <div style={{...styles.summaryColumn, position: isMobile ? 'static' : 'sticky'}}>
          <div style={styles.blackBox}>
            <p style={styles.summaryTitle}>ORDER SUMMARY</p>
            <div style={styles.summaryRow}><span>SUBTOTAL</span><span>Rs. {calculateSubtotal().toLocaleString()}</span></div>
            <div style={styles.summaryRow}><span>SHIPPING FEE</span><span>Rs. 300</span></div>
            <div style={styles.totalRow}><span>TOTAL</span><span>Rs. {calculateTotal().toLocaleString()}</span></div>
            
            <div className="order-btn-container">
              <button 
                className={`order ${isAnimating ? 'animate' : ''}`} 
                onClick={handlePlaceOrder}
                disabled={orderItems.length === 0 || isAnimating || !selectedAddressId}
              >
                <span className="default">Place Order</span>
                <span className="success">
                  Order Placed
                  <svg viewBox="0 0 12 10">
                    <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
                  </svg>
                </span>
                <div className="box"></div>
                <div className="truck">
                  <div className="back"></div>
                  <div className="front">
                    <div className="window"></div>
                  </div>
                  <div className="light top"></div>
                  <div className="light bottom"></div>
                </div>
                <div className="lines"></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '20px 5%', maxWidth: '1400px', margin: 'auto', fontFamily: 'Inter, sans-serif' },
  mainTitle: { fontSize: '24px', fontWeight: '900', marginBottom: '20px', letterSpacing: '-0.5px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  modalContent: { backgroundColor: '#fff', padding: '25px', borderRadius: '20px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  modalTitle: { fontSize: '15px', fontWeight: '900' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '5px' },
  addressListScroll: { overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' },
  addrItemCard: { padding: '15px', border: '1px solid #eee', borderRadius: '12px', display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' },
  deleteBtn: { background: '#fff0f0', color: '#ff4d4d', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' },
  modalAddBtn: { marginTop: '10px', padding: '15px', border: '1px dashed #000', borderRadius: '12px', background: 'none', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  limitText: { textAlign: 'center', fontSize: '11px', color: '#999', marginTop: '10px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '12px', border: '1px solid #eee', borderRadius: '8px', fontSize: '16px', width: '100%', boxSizing: 'border-box' },
  inputGroup: { display: 'flex', gap: '10px' },
  saveBtn: { padding: '15px', background: '#000', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', marginTop: '10px' },
  topHeaderGrid: { display: 'grid', gap: '20px', marginBottom: '30px' },
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
  mainGrid: { display: 'grid', gap: '25px', alignItems: 'start' },
  paymentColumn: { display: 'flex', flexDirection: 'column' },
  paymentFlexContainer: { display: 'flex', gap: '15px', alignItems: 'stretch' },
  paymentListSide: { flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' },
  detailsSide: { flex: 1 },
  paymentRowThin: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', border: '1px solid #f0f0f0', borderRadius: '8px', backgroundColor: '#fff' },
  payLabelThin: { fontSize: '13px', fontWeight: '600' },
  radioOuter: { width: '16px', height: '16px', border: '1px solid #ccc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: '8px', height: '8px', background: '#000', borderRadius: '50%' },
  bankDetailBoxSide: { background: '#fcfcfc', padding: '15px', borderRadius: '10px', border: '1px solid #eee' },
  emptyDetailPlaceholder: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #eee', borderRadius: '10px', padding: '20px', textAlign: 'center' },
  bankGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  bankLabel: { fontSize: '9px', color: '#999' },
  bankTitle: { fontSize: '11px', fontWeight: '900', marginBottom: '10px' },
  whatsappNotice: { marginTop: '15px', display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '8px', fontSize: '10px' },
  summaryColumn: { top: '20px' },
  blackBox: { background: '#000', color: '#fff', padding: '25px', borderRadius: '25px' },
  summaryTitle: { fontSize: '12px', fontWeight: '900', opacity: 0.6 },
  summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '13px' },
  totalRow: { display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: '900', marginTop: '15px', borderTop: '1px solid #333', paddingTop: '15px' },
  sectionLabel: { fontSize: '10px', fontWeight: '900', color: '#999', textTransform: 'uppercase', marginBottom: '12px' },
  addNewBtn: { background: '#000', color: '#fff', border: 'none', padding: '5px 12px', fontSize: '10px', borderRadius: '4px', cursor: 'pointer' },
  flexBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  loader: { textAlign: 'center', marginTop: '100px', fontSize: '14px', color: '#999' }
};