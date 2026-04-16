import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Search, X, ExternalLink, Image as ImageIcon } from 'lucide-react';
import emailjs from '@emailjs/browser';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  
  // Receipt Review States
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);
  
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

  // --- EMAIL SENDER FUNCTION ---
  const sendOrderEmail = async (order, type) => {
    const serviceId = 'YOUR_SERVICE_ID';
    const publicKey = 'YOUR_PUBLIC_KEY';
    
    let templateId = '';
    let statusMessage = '';

    if (type === 'PAYMENT_CONFIRMED') {
      templateId = 'TEMPLATE_PAYMENT_CONFIRMED'; 
      statusMessage = "Your payment has been verified! We are now preparing your order.";
    } else if (type === 'PAYMENT_REJECTED') {
      templateId = 'TEMPLATE_PAYMENT_REJECTED'; 
      statusMessage = "Your payment receipt was rejected. Please upload a clear image of the bank slip.";
    }

    const templateParams = {
      to_name: order.customer_name || "Valued Customer",
      to_email: order.email, 
      order_id: order.id.slice(0, 8).toUpperCase(),
      total_amount: order.total_amount,
      message: statusMessage,
    };

    try {
      await emailjs.send(serviceId, templateId, templateParams, publicKey);
    } catch (error) {
      console.error("Email notification failed:", error);
    }
  };

  // --- RECEIPT HANDLERS ---
  const openReceiptReview = (order) => {
    setSelectedReceiptOrder(order);
    setShowReceiptModal(true);
  };

  const handleReceiptDecision = async (decision) => {
    if (!window.confirm(`Are you sure you want to ${decision} this receipt?`)) return;
    setIsProcessing(true);

    try {
      if (decision === 'accept') {
        await supabase
          .from('orders')
          .update({ status: 'payment accepted' })
          .eq('id', selectedReceiptOrder.id);

        await sendOrderEmail(selectedReceiptOrder, 'PAYMENT_CONFIRMED');

      } else {
        if (selectedReceiptOrder.payment_receipt_url) {
          const oldPath = selectedReceiptOrder.payment_receipt_url.split('/public/orders/')[1];
          if (oldPath) {
            await supabase.storage.from('orders').remove([oldPath]);
          }
        }

        await supabase
          .from('orders')
          .update({ 
            status: 'payment rejected',
            payment_receipt_url: null
          })
          .eq('id', selectedReceiptOrder.id);

        await sendOrderEmail(selectedReceiptOrder, 'PAYMENT_REJECTED');
      }

      alert(`Receipt ${decision}ed successfully.`);
      setShowReceiptModal(false);
      fetchTotalOrders();
    } catch (err) {
      alert("Error processing receipt: " + err.message);
    } finally {
      setIsProcessing(false);
    }
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
            .eq('id', item.product_id || item.id)
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

                await supabase.from('products').update({ variant_data: updatedVariants }).eq('id', item.product_id || item.id);
              }
            }
          }
        }
      }
    }

    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) alert(error.message); else fetchTotalOrders();
  };

  const fetchReturnDetails = async (order) => {
    setIsProcessing(true);
    const { data, error } = await supabase.from('returns').select('*').eq('order_id', order.id).maybeSingle();
    if (error) alert(error.message); 
    else if (!data) alert("No return record found.");
    else { setSelectedReturn({ ...data, orderData: order }); setShowReturnModal(true); }
    setIsProcessing(false);
  };

  const handleReturnDecision = async (decision) => {
    setIsProcessing(true);
    const newStatus = decision === 'accept' ? 'return accepted' : 'return rejected';
    const returnTableStatus = decision === 'accept' ? 'approved' : 'rejected';
    try {
      await supabase.from('returns').update({ status: returnTableStatus }).eq('id', selectedReturn.id);
      await supabase.from('orders').update({ status: newStatus }).eq('id', selectedReturn.order_id);
      alert(`Return ${decision}ed successfully.`);
      setShowReturnModal(false);
      fetchTotalOrders();
    } catch (err) { alert("Error processing decision."); } finally { setIsProcessing(false); }
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
                {order.payment_method === 'Bank Transfer' && (
                  <span style={styles.paymentTypeBadge}>BANK TRANSFER</span>
                )}
              </td>

              <td style={styles.td}>
                <p style={{margin: '0 0 5px 0'}}><strong>{order.customer_name || "Guest User"}</strong></p>
                <p style={styles.phoneText}>{order.phone}</p>
                <p style={styles.addressText}>{order.shipping_address}</p>
              </td>

              <td style={styles.td}>
                {order.items?.map((item, idx) => (
                  <div key={idx} style={styles.itemDetail}>
                    {item.image_url && <img src={item.image_url} alt="" style={styles.thumb} />}
                    <div>
                      <p style={styles.itemName}>{item.name}</p>
                      <p style={styles.itemMeta}>{item.selectedColor} | Size: {item.selectedSize} | Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </td>

              <td style={styles.td}><strong>LKR {Number(order.total_amount).toLocaleString()}</strong></td>

              <td style={styles.td}>
                <div style={{marginBottom: '10px'}}>
                  <span style={{ ...styles.statusBadge, backgroundColor: getStatusColor(order.status) }}>
                    {(order.status || 'pending').toUpperCase()}
                  </span>
                </div>

                <div style={styles.actionGroup}>
                  {/* Updated to show Review button when status is 'payment reviewing' */}
                  {order.payment_receipt_url && (order.status === 'payment reviewing' || order.status === 'pending') && (
                    <button onClick={() => openReceiptReview(order)} style={styles.btnReceipt}>
                        <ImageIcon size={12} style={{marginRight: '5px'}}/> REVIEW RECEIPT
                    </button>
                  )}

                  {(order.status === 'payment accepted' || order.status === 'order confirmed') && (
                    <button onClick={() => updateStatus(order.id, 'order shipped')} style={styles.btnShip}>MARK AS SHIPPED</button>
                  )}
                  
                  {order.status === 'order shipped' && (
                    <button onClick={() => updateStatus(order.id, 'delivered')} style={styles.btnDeliver}>CONFIRM DELIVERY</button>
                  )}

                  {(order.status === 'pending_payment' || order.status === 'payment rejected') && (
                     <button onClick={() => updateStatus(order.id, 'cancelled')} style={styles.btnCancel}>CANCEL ORDER</button>
                  )}

                  {order.status === 'return requested' && (
                    <button onClick={() => fetchReturnDetails(order)} style={styles.btnReviewReturn}>REVIEW RETURN</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* --- RECEIPT REVIEW MODAL --- */}
      {showReceiptModal && selectedReceiptOrder && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>BANK RECEIPT REVIEW</h3>
              <X onClick={() => setShowReceiptModal(false)} style={{ cursor: 'pointer' }} size={20} />
            </div>
            <div style={styles.modalBody}>
              <img 
                src={selectedReceiptOrder.payment_receipt_url} 
                alt="Receipt" 
                style={styles.fullReceiptImg} 
              />
              <div style={{marginTop: '15px'}}>
                <p style={styles.modalVal}><strong>Order ID:</strong> {selectedReceiptOrder.id}</p>
                <p style={styles.modalVal}><strong>Total:</strong> Rs. {Number(selectedReceiptOrder.total_amount).toLocaleString()}</p>
                <p style={{fontSize: '11px', color: '#666', background: '#f0f0f0', padding: '10px', borderRadius: '4px'}}>
                   Accepting will set status to "PAYMENT ACCEPTED". Rejecting will set to "PAYMENT REJECTED".
                </p>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button disabled={isProcessing} onClick={() => handleReceiptDecision('accept')} style={styles.btnGreenFull}>ACCEPT PAYMENT</button>
              <button disabled={isProcessing} onClick={() => handleReceiptDecision('reject')} style={styles.btnRedFull}>REJECT & RESET</button>
            </div>
          </div>
        </div>
      )}

      {/* --- RETURN REVIEW MODAL --- */}
      {showReturnModal && selectedReturn && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>REVIEW RETURN REQUEST</h3>
              <X onClick={() => setShowReturnModal(false)} style={{ cursor: 'pointer' }} size={20} />
            </div>
            <div style={styles.modalBody}>
              <p style={styles.modalVal}><strong>Reason:</strong> {selectedReturn.reason}</p>
              <div style={styles.adminImageGrid}>
                {selectedReturn.images?.map((img, i) => (
                  <div key={i} style={styles.adminImageWrapper}>
                    <img src={img} alt="" style={styles.adminProofImg} />
                    <a href={img} target="_blank" rel="noreferrer" style={styles.zoomLink}><ExternalLink size={12}/></a>
                  </div>
                ))}
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button disabled={isProcessing} onClick={() => handleReturnDecision('accept')} style={styles.btnGreenFull}>ACCEPT</button>
              <button disabled={isProcessing} onClick={() => handleReturnDecision('reject')} style={styles.btnRedFull}>REJECT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const getStatusColor = (status) => {
  switch (status) {
    case 'payment reviewing': return '#9b59b6'; // Purple for reviewing
    case 'payment accepted': return '#2ecc71';
    case 'payment rejected': return '#e74c3c';
    case 'order confirmed': return '#3498db';
    case 'order shipped': return '#f1c40f';
    case 'delivered': return '#16a085';
    case 'cancelled': return '#e74c3c';
    case 'return requested': return '#e67e22';
    case 'pending_payment': return '#f39c12';
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
  paymentTypeBadge: { fontSize: '9px', background: '#eee', padding: '2px 5px', borderRadius: '3px', fontWeight: 'bold', display: 'inline-block', marginTop: '5px' },
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
  btnReceipt: { backgroundColor: '#000', color: '#fff', border: 'none', padding: '8px', cursor: 'pointer', borderRadius: '4px', fontWeight: '700', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnReviewReturn: { backgroundColor: '#e67e22', color: '#fff', border: 'none', padding: '8px', cursor: 'pointer', borderRadius: '4px', fontWeight: '700', fontSize: '10px' },
  loader: { textAlign: 'center', marginTop: '100px', fontWeight: '800' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  modalBody: { marginBottom: '20px' },
  fullReceiptImg: { width: '100%', borderRadius: '8px', border: '1px solid #ddd' },
  modalVal: { fontSize: '13px', margin: '5px 0' },
  adminImageGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' },
  adminImageWrapper: { position: 'relative', height: '100px', borderRadius: '4px', overflow: 'hidden' },
  adminProofImg: { width: '100%', height: '100%', objectFit: 'cover' },
  zoomLink: { position: 'absolute', bottom: '5px', right: '5px', backgroundColor: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalFooter: { display: 'flex', gap: '10px' },
  btnGreenFull: { flex: 1, backgroundColor: '#2ecc71', color: '#fff', border: 'none', padding: '12px', fontWeight: '800', cursor: 'pointer', borderRadius: '4px' },
  btnRedFull: { flex: 1, backgroundColor: '#ff4d4d', color: '#fff', border: 'none', padding: '12px', fontWeight: '800', cursor: 'pointer', borderRadius: '4px' }
};