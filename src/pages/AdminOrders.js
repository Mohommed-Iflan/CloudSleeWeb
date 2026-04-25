import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Search, X, ExternalLink, Image as ImageIcon, Upload, Eye } from 'lucide-react';
import emailjs from '@emailjs/browser';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef(null);
  const [uploadingForOrderId, setUploadingForOrderId] = useState(null);

  useEffect(() => {
    fetchTotalOrders();
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = orders.filter(order => {
      const name = (order.customer_name || "").toLowerCase();
      const id = (order.id || "").toLowerCase();
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

  const handleManualUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadingForOrderId) return;

    setIsProcessing(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uploadingForOrderId}_${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      // 1. Upload to storage bucket "orders"
      const { error: uploadError } = await supabase.storage
        .from('orders')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('orders')
        .getPublicUrl(filePath);

      // 3. Update Order table
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          payment_receipt_url: publicUrl,
          status: 'payment reviewing' 
        })
        .eq('id', uploadingForOrderId);

      if (updateError) throw updateError;

      alert("Receipt uploaded and status updated to Reviewing!");
      fetchTotalOrders();
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setIsProcessing(false);
      setUploadingForOrderId(null);
    }
  };

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
    const confirmAction = window.confirm(`Mark as ${newStatus.toUpperCase()}?`);
    if (!confirmAction) return;

    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) alert(error.message); else fetchTotalOrders();
  };

  if (loading) return <div style={styles.loader}>LOADING ORDERS...</div>;

  return (
    <div style={styles.container}>
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleManualUpload}
        accept="image/*"
      />

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
            <th style={styles.th}>CUSTOMER</th>
            <th style={styles.th}>ITEMS (SIZE/COLOR)</th>
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
                      <p style={styles.itemMeta}>
                        {item.selected_color || item.color} | 
                        <strong> Size: {item.selected_size || item.size} </strong> | 
                        Qty: {item.quantity}
                      </p>
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
                  {/* Bank Transfer Specialist Actions */}
                  {order.payment_method === 'Bank Transfer' && (
                    <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                       {!order.payment_receipt_url ? (
                         <button 
                            onClick={() => { setUploadingForOrderId(order.id); fileInputRef.current.click(); }} 
                            style={styles.btnUpload}
                          >
                           <Upload size={12} style={{marginRight: '4px'}}/> UPLOAD RECEIPT
                         </button>
                       ) : (
                         <a href={order.payment_receipt_url} target="_blank" rel="noreferrer" style={styles.viewReceiptLink}>
                           <Eye size={12} style={{marginRight: '4px'}}/> VIEW RECEIPT
                         </a>
                       )}
                    </div>
                  )}

                  {/* Review Button logic */}
                  {order.payment_receipt_url && (order.status === 'payment reviewing' || order.status === 'pending') && (
                    <button onClick={() => openReceiptReview(order)} style={styles.btnReceipt}>
                        <ImageIcon size={12} style={{marginRight: '5px'}}/> REVIEW & ACCEPT
                    </button>
                  )}

                  {/* Standard Workflow */}
                  {(order.status === 'pending' || !order.status) && (
                    <button onClick={() => updateStatus(order.id, 'order confirmed')} style={styles.btnConfirm}>CONFIRM ORDER</button>
                  )}

                  {(order.status === 'payment accepted' || order.status === 'order confirmed') && (
                    <button onClick={() => updateStatus(order.id, 'order shipped')} style={styles.btnShip}>MARK AS SHIPPED</button>
                  )}

                  {order.status === 'order shipped' && (
                    <button onClick={() => updateStatus(order.id, 'delivered')} style={styles.btnDeliver}>CONFIRM DELIVERY</button>
                  )}

                  {['pending', 'payment rejected', 'pending_payment'].includes(order.status) && (
                    <button onClick={() => updateStatus(order.id, 'cancelled')} style={styles.btnCancel}>CANCEL ORDER</button>
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
              <h3 style={{ margin: 0, fontWeight: '900' }}>BANK RECEIPT REVIEW</h3>
              <X onClick={() => setShowReceiptModal(false)} style={{ cursor: 'pointer' }} size={20} />
            </div>
            <div style={styles.modalBody}>
              <img src={selectedReceiptOrder.payment_receipt_url} alt="Receipt" style={styles.fullReceiptImg} />
              <div style={{marginTop: '15px'}}>
                <p style={styles.modalVal}><strong>Order ID:</strong> {selectedReceiptOrder.id}</p>
                <p style={styles.modalVal}><strong>Total:</strong> LKR {Number(selectedReceiptOrder.total_amount).toLocaleString()}</p>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button disabled={isProcessing} onClick={() => handleReceiptDecision('accept')} style={styles.btnGreenFull}>ACCEPT PAYMENT</button>
              <button disabled={isProcessing} onClick={() => handleReceiptDecision('reject')} style={styles.btnRedFull}>REJECT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const getStatusColor = (status) => {
  switch (status) {
    case 'payment reviewing': return '#9b59b6'; 
    case 'payment accepted': return '#2ecc71';
    case 'payment rejected': return '#e74c3c';
    case 'order confirmed': return '#3498db';
    case 'order shipped': return '#f1c40f';
    case 'delivered': return '#16a085';
    case 'cancelled': return '#e74c3c';
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
  paymentTypeBadge: { fontSize: '9px', background: '#e1f5fe', color: '#01579b', padding: '2px 5px', borderRadius: '3px', fontWeight: 'bold', display: 'inline-block', marginTop: '5px' },
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
  btnUpload: { backgroundColor: '#f39c12', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  viewReceiptLink: { textDecoration: 'none', color: '#34495e', background: '#f0f0f0', padding: '6px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', display: 'flex', alignItems: 'center' },
  loader: { textAlign: 'center', marginTop: '100px', fontWeight: '800' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '500px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  modalBody: { marginBottom: '20px' },
  fullReceiptImg: { width: '100%', borderRadius: '8px', border: '1px solid #ddd' },
  modalVal: { fontSize: '13px', margin: '5px 0' },
  modalFooter: { display: 'flex', gap: '10px' },
  btnGreenFull: { flex: 1, backgroundColor: '#2ecc71', color: '#fff', border: 'none', padding: '12px', fontWeight: '800', cursor: 'pointer', borderRadius: '4px' },
  btnRedFull: { flex: 1, backgroundColor: '#ff4d4d', color: '#fff', border: 'none', padding: '12px', fontWeight: '800', cursor: 'pointer', borderRadius: '4px' }
};