import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Search, X, ExternalLink } from 'lucide-react'; 

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // New States for Admin Review
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchTotalOrders();
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = orders.filter(order => {
      const name = (order.customer_name || "").toLowerCase();
      const id = order.id.toLowerCase();
      const phone = (order.phone || "").toLowerCase();
      return name.includes(term) || id.includes(term) || phone.includes(term);
    });
    setFilteredOrders(filtered);
  }, [searchTerm, orders]);

  const fetchTotalOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setOrders(data);
      setFilteredOrders(data);
    }
    setLoading(false);
  };

  const updateStatus = async (orderId, newStatus) => {
    const confirmAction = window.confirm(`Are you sure you want to mark this order as ${newStatus.toUpperCase()}?`);
    if (!confirmAction) return;

    if (newStatus === 'cancelled') {
      const orderToCancel = orders.find(o => o.id === orderId);
      if (orderToCancel && orderToCancel.items) {
        for (const item of orderToCancel.items) {
          const { data: product } = await supabase
            .from('products')
            .select('variant_data')
            .eq('id', item.id)
            .single();

          if (product && product.variant_data) {
            const updatedVariants = [...product.variant_data];
            const colorIndex = updatedVariants.findIndex(v => v.name === item.selectedColor);
            if (colorIndex !== -1) {
              const sizeIndex = updatedVariants[colorIndex].sizes.findIndex(s => s.size === item.selectedSize);
              if (sizeIndex !== -1) {
                const currentStock = parseInt(updatedVariants[colorIndex].sizes[sizeIndex].stock || 0);
                const quantityToReturn = parseInt(item.quantity || 1); 
                updatedVariants[colorIndex].sizes[sizeIndex].stock = currentStock + quantityToReturn;

                await supabase
                  .from('products')
                  .update({ variant_data: updatedVariants })
                  .eq('id', item.id);
              }
            }
          }
        }
      }
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      alert("Error updating status: " + error.message);
    } else {
      fetchTotalOrders();
    }
  };

  // --- NEW: FETCH RETURN DETAILS ---
  const fetchReturnDetails = async (order) => {
  setIsProcessing(true); // Show a small loading state
  
  const { data, error } = await supabase
    .from('returns')
    .select('*')
    .eq('order_id', order.id)
    .maybeSingle(); // .maybeSingle() is safer than .single()

  if (error) {
    console.error("Supabase Error:", error);
    alert("Database Error: " + error.message);
  } else if (!data) {
    alert("No return record found for this Order ID. Please check if the return was submitted correctly.");
  } else {
    setSelectedReturn({ ...data, orderData: order });
    setShowReturnModal(true);
  }
  
  setIsProcessing(false);
};

  // --- NEW: HANDLE ADMIN DECISION ---
  const handleReturnDecision = async (decision) => {
    setIsProcessing(true);
    const newStatus = decision === 'accept' ? 'return accepted' : 'return rejected';
    const returnTableStatus = decision === 'accept' ? 'approved' : 'rejected';

    try {
      // 1. Update Returns Table
      await supabase
        .from('returns')
        .update({ status: returnTableStatus })
        .eq('id', selectedReturn.id);

      // 2. Update Orders Table
      await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', selectedReturn.order_id);

      alert(`Return ${decision}ed successfully.`);
      setShowReturnModal(false);
      fetchTotalOrders();
    } catch (err) {
      alert("Error processing decision.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div style={styles.loader}>LOADING ORDERS...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>ADMIN ORDER MANAGEMENT</h2>
        <div style={styles.searchWrapper}>
          <Search size={18} style={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search Name, Order ID..." 
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <table style={styles.table}>
        <thead>
          <tr style={styles.thRow}>
            <th style={styles.th}>ORDER INFO</th>
            <th style={styles.th}>CUSTOMER & ADDRESS</th>
            <th style={styles.th}>ITEMS</th>
            <th style={styles.th}>TOTAL</th>
            <th style={styles.th}>STATUS & ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map((order) => (
            <tr key={order.id} style={styles.tr}>
              <td style={styles.td}>
                <span style={styles.idText}>#{order.id.slice(0, 8).toUpperCase()}</span>
                <p style={styles.dateText}>{new Date(order.created_at).toLocaleDateString()}</p>
              </td>

              <td style={styles.td}>
                <p style={{margin: '0 0 5px 0'}}>
                  <strong>{order.customer_name || "Guest User"}</strong>
                </p>
                <p style={styles.phoneText}>{order.phone}</p>
                <p style={styles.addressText}>{order.shipping_address}</p>
              </td>

              <td style={styles.td}>
                {order.items?.map((item, idx) => (
                  <div key={idx} style={styles.itemDetail}>
                    {item.image_url && <img src={item.image_url} alt="" style={styles.thumb} />}
                    <div>
                      <p style={styles.itemName}>{item.name}</p>
                      <p style={styles.itemMeta}>
                        {item.selectedColor} | Size: {item.selectedSize} | <strong>Qty: {item.quantity}</strong>
                      </p>
                    </div>
                  </div>
                ))}
              </td>

              <td style={styles.td}><strong>LKR {Number(order.total_amount).toLocaleString()}</strong></td>

              <td style={styles.td}>
                <div style={{marginBottom: '10px'}}>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: getStatusColor(order.status)
                  }}>
                    {(order.status || 'pending').toUpperCase()}
                  </span>
                </div>

                <div style={styles.actionGroup}>
                  {(!order.status || order.status === 'pending') && (
                    <>
                      <button onClick={() => updateStatus(order.id, 'order confirmed')} style={styles.btnConfirm}>CONFIRM</button>
                      <button onClick={() => updateStatus(order.id, 'cancelled')} style={styles.btnCancel}>CANCEL</button>
                    </>
                  )}
                  {order.status === 'order confirmed' && (
                    <button onClick={() => updateStatus(order.id, 'order shipped')} style={styles.btnShip}>MARK AS SHIPPED</button>
                  )}
                  {order.status === 'order shipped' && (
                    <button onClick={() => updateStatus(order.id, 'delivered')} style={styles.btnDeliver}>CONFIRM DELIVERY</button>
                  )}
                  {/* NEW: RETURN ACTION */}
                  {order.status === 'return requested' && (
                    <button onClick={() => fetchReturnDetails(order)} style={styles.btnReviewReturn}>REVIEW RETURN</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* --- ADMIN RETURN REVIEW MODAL --- */}
      {showReturnModal && selectedReturn && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>REVIEW RETURN REQUEST</h3>
              <X onClick={() => setShowReturnModal(false)} style={{ cursor: 'pointer' }} size={20} />
            </div>
            
            <div style={styles.modalBody}>
              <section style={styles.modalSection}>
                <label style={styles.modalLabel}>CUSTOMER INFO</label>
                <p style={styles.modalVal}><strong>Name:</strong> {selectedReturn.orderData.customer_name}</p>
                <p style={styles.modalVal}><strong>Phone:</strong> {selectedReturn.orderData.phone}</p>
                <p style={styles.modalVal}><strong>Address:</strong> {selectedReturn.orderData.shipping_address}</p>
              </section>

              <section style={styles.modalSection}>
                <label style={styles.modalLabel}>RETURN DETAILS</label>
                <p style={styles.modalVal}><strong>Reason:</strong> {selectedReturn.reason}</p>
                <p style={styles.modalVal}><strong>Notes:</strong> {selectedReturn.notes || "No additional notes provided."}</p>
              </section>

              <section style={styles.modalSection}>
                <label style={styles.modalLabel}>SUBMITTED PROOF ({selectedReturn.images?.length || 0})</label>
                <div style={styles.adminImageGrid}>
                  {selectedReturn.images?.map((img, i) => (
                    <div key={i} style={styles.adminImageWrapper}>
                      <img src={img} alt="" style={styles.adminProofImg} />
                      <a href={img} target="_blank" rel="noreferrer" style={styles.zoomLink}><ExternalLink size={12}/></a>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div style={styles.modalFooter}>
              <button 
                disabled={isProcessing} 
                onClick={() => handleReturnDecision('accept')} 
                style={styles.btnGreenFull}
              >
                {isProcessing ? "WAIT..." : "ACCEPT RETURN"}
              </button>
              <button 
                disabled={isProcessing} 
                onClick={() => handleReturnDecision('reject')} 
                style={styles.btnRedFull}
              >
                {isProcessing ? "WAIT..." : "REJECT RETURN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const getStatusColor = (status) => {
  switch (status) {
    case 'order confirmed': return '#3498db';
    case 'order shipped': return '#f1c40f';
    case 'delivered': return '#2ecc71';
    case 'cancelled': return '#e74c3c';
    case 'return requested': return '#e67e22';
    case 'return accepted': return '#27ae60';
    case 'return rejected': return '#c0392b';
    default: return '#95a5a6';
  }
};

const styles = {
  container: { padding: '40px 5%', fontFamily: 'Inter, sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  title: { fontWeight: '900', margin: 0 },
  searchWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: '12px', color: '#888' },
  searchInput: { padding: '10px 10px 10px 35px', borderRadius: '8px', border: '1px solid #ddd', width: '250px' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  thRow: { borderBottom: '2px solid #000' },
  th: { textAlign: 'left', padding: '15px', fontSize: '11px', color: '#888' },
  tr: { borderBottom: '1px solid #eee' },
  td: { padding: '15px', verticalAlign: 'top' },
  idText: { fontWeight: '800', fontSize: '13px' },
  dateText: { fontSize: '11px', color: '#999' },
  phoneText: { fontSize: '12px', fontWeight: '600' },
  addressText: { fontSize: '11px', color: '#666', maxWidth: '180px' },
  itemDetail: { display: 'flex', alignItems: 'center', marginBottom: '8px' },
  thumb: { width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', marginRight: '10px' },
  itemName: { margin: 0, fontWeight: '700', fontSize: '12px' },
  itemMeta: { margin: 0, fontSize: '10px', color: '#888' },
  statusBadge: { padding: '4px 8px', borderRadius: '4px', color: '#fff', fontSize: '10px', fontWeight: '800' },
  actionGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  btnConfirm: { backgroundColor: '#2ecc71', color: '#fff', border: 'none', padding: '8px', cursor: 'pointer', borderRadius: '4px', fontWeight: '700', fontSize: '10px' },
  btnCancel: { backgroundColor: '#e74c3c', color: '#fff', border: 'none', padding: '8px', cursor: 'pointer', borderRadius: '4px', fontWeight: '700', fontSize: '10px' },
  btnShip: { backgroundColor: '#3498db', color: '#fff', border: 'none', padding: '8px', cursor: 'pointer', borderRadius: '4px', fontWeight: '700', fontSize: '10px' },
  btnDeliver: { backgroundColor: '#9b59b6', color: '#fff', border: 'none', padding: '8px', cursor: 'pointer', borderRadius: '4px', fontWeight: '700', fontSize: '10px' },
  btnReviewReturn: { backgroundColor: '#e67e22', color: '#fff', border: 'none', padding: '8px', cursor: 'pointer', borderRadius: '4px', fontWeight: '700', fontSize: '10px' },
  loader: { textAlign: 'center', marginTop: '100px', fontWeight: '800' },

  // Admin Modal Styles
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' },
  modalLabel: { fontSize: '10px', fontWeight: '900', color: '#aaa', letterSpacing: '1px', display: 'block', marginBottom: '8px' },
  modalVal: { fontSize: '13px', margin: '0 0 5px 0', color: '#333' },
  modalSection: { marginBottom: '25px' },
  adminImageGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' },
  adminImageWrapper: { position: 'relative', height: '100px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #eee' },
  adminProofImg: { width: '100%', height: '100%', objectFit: 'cover' },
  zoomLink: { position: 'absolute', bottom: '5px', right: '5px', backgroundColor: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' },
  modalFooter: { display: 'flex', gap: '10px', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' },
  btnGreenFull: { flex: 1, backgroundColor: '#2ecc71', color: '#fff', border: 'none', padding: '12px', fontWeight: '800', cursor: 'pointer', borderRadius: '4px', fontSize: '12px' },
  btnRedFull: { flex: 1, backgroundColor: '#ff4d4d', color: '#fff', border: 'none', padding: '12px', fontWeight: '800', cursor: 'pointer', borderRadius: '4px', fontSize: '12px' }
};