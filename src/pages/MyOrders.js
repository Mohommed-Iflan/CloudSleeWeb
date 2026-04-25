import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Package, X, Upload, Clock, CheckCircle, AlertCircle } from 'lucide-react'; 

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [productImages, setProductImages] = useState({}); 
  const [reviews, setReviews] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  
  const [returnReason, setReturnReason] = useState("");
  const [returnNotes, setReturnNotes] = useState(""); 
  const [returnFiles, setReturnFiles] = useState([]);
  const [previews, setPreviews] = useState([]); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

  const fetchOrderData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }

    const [ordersRes, reviewsRes] = await Promise.all([
      supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('reviews').select('order_id, is_edited').eq('user_id', user.id)
    ]);

    const ordersData = ordersRes.data || [];
    setOrders(ordersData);

    const reviewMap = {};
    reviewsRes.data?.forEach(r => {
      reviewMap[r.order_id] = { exists: true, edited: r.is_edited };
    });
    setReviews(reviewMap);

    if (ordersData.length > 0) {
      const allProductIds = [...new Set(ordersData.flatMap(order => 
        order.items.map(item => item.product_id || item.id)
      ))];

      const { data: productsData } = await supabase
        .from('products')
        .select('id, main_images')
        .in('id', allProductIds);

      const imageMap = {};
      productsData?.forEach(p => {
        if (p.main_images && p.main_images.length > 0) {
          imageMap[p.id] = p.main_images[0];
        }
      });
      setProductImages(imageMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrderData();
  }, []);

  const handleStatusUpdate = async (orderId, newStatus) => {
    const msg = newStatus === 'cancelled' ? "Are you sure you want to cancel this order?" : "Confirm delivery for this order?";
    if (!window.confirm(msg)) return;

    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, status_updated_at: new Date().toISOString() })
      .eq('id', orderId);
    
    if (!error) fetchOrderData();
    else alert(error.message);
  };

  const openPaymentModal = (orderId) => {
    setSelectedOrderId(orderId);
    setShowPaymentModal(true);
  };

  const handleReceiptChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitReceipt = async (e) => {
    e.preventDefault();
    if (!receiptFile) return alert("Please select a receipt image.");
    setIsSubmitting(true);

    try {
      const currentOrder = orders.find(o => o.id === selectedOrderId);
      const uploadCount = currentOrder?.receipt_upload_count || 0;

      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `receipts/${selectedOrderId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('orders')
        .upload(fileName, receiptFile, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('orders').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          payment_receipt_url: urlData.publicUrl,
          status: 'payment reviewing', 
          status_updated_at: new Date().toISOString(),
          receipt_upload_count: uploadCount + 1
        })
        .eq('id', selectedOrderId);

      if (updateError) throw updateError;

      setShowPaymentModal(false);
      setReceiptFile(null);
      setReceiptPreview(null);
      fetchOrderData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReturnModal = (orderId) => {
    setSelectedOrderId(orderId);
    setShowReturnModal(true);
  };

  const closeReturnModal = () => {
    setShowReturnModal(false);
    setReturnReason(""); setReturnNotes(""); setReturnFiles([]); setPreviews([]); setSelectedOrderId(null);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (returnFiles.length + selectedFiles.length > 4) return alert("Max 4 images.");
    setReturnFiles([...returnFiles, ...selectedFiles]);
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!returnReason || returnFiles.length === 0) return alert("Reason and proof required.");
    setIsSubmitting(true);
    try {
      const uploadedUrls = [];
      for (const file of returnFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedOrderId}-${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage.from('returns').upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from('returns').getPublicUrl(fileName);
        uploadedUrls.push(data.publicUrl);
      }
      await supabase.from('returns').insert({
        order_id: selectedOrderId, user_id: user.id, reason: returnReason, notes: returnNotes, images: uploadedUrls, status: 'pending'
      });
      await supabase.from('orders').update({ status: 'return requested', status_updated_at: new Date().toISOString() }).eq('id', selectedOrderId);
      closeReturnModal();
      fetchOrderData();
    } catch (err) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  if (loading) return <div style={styles.loader}>LOADING YOUR HISTORY...</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.pageTitle}>MY ORDERS</h2>
      
      {orders.length === 0 ? (
        <div style={styles.emptyContainer}><Package size={48} color="#ccc" /><p style={styles.emptyMsg}>NO ORDERS PLACED YET.</p></div>
      ) : (
        orders.map((order) => {
          const status = (order.status || "pending").toLowerCase();
          const isBank = order.payment_method === 'Bank Transfer';
          const updatedAt = new Date(order.status_updated_at || order.created_at).getTime();
          const timeSinceUpdate = Date.now() - updatedAt;
          const reviewInfo = reviews[order.id];

          const isCancelled = status === 'cancelled';
          const isShipped = status === 'order shipped';
          const isDelivered = status === 'delivered';
          const isPending = status === 'pending' || status === 'pending_payment';
          const isReviewing = status === 'payment reviewing';
          const isRejected = status === 'payment rejected';

          return (
            <div key={order.id} style={styles.orderCard}>
              <div style={styles.cardHeader}>
                <div><span style={styles.label}>ORDER ID</span><p style={styles.val}>#{order.id?.slice(0, 8).toUpperCase()}</p></div>
                <div><span style={styles.label}>STATUS</span><p style={styles.val}>{status.toUpperCase()}</p></div>
                <div><span style={styles.label}>METHOD</span><p style={styles.val}>{order.payment_method?.toUpperCase()}</p></div>
              </div>

              <div style={styles.itemSection}>
                {order.items?.map((item, i) => {
                  const pId = item.product_id || item.id;
                  return (
                    <div key={i} style={styles.itemRow}>
                      <div style={styles.itemLeft} onClick={() => navigate(`/product/${pId}`)}>
                        <img src={productImages[pId] || 'https://via.placeholder.com/150'} alt="" style={styles.itemThumb} />
                        <div style={styles.itemDetails}>
                          <span style={styles.itemName}>{(item.name || "Product").toUpperCase()}</span>
                          <span style={styles.itemSubText}>{item.selectedSize} | {item.selectedColor}</span>
                        </div>
                      </div>
                      <span style={styles.itemPrice}>Rs. {Number(item.price || 0).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>

              {/* --- PAYMENT STATUS BOXES --- */}
              {isBank && isPending && !order.payment_receipt_url && (
                <div style={{...styles.infoBox, backgroundColor: '#fff9e6', borderColor: '#f1c40f'}}>
                  <p style={{...styles.infoTitle, color: '#9a7d0a'}}>PAYMENT REQUIRED</p>
                  <p style={styles.infoText}>Please upload your bank receipt to process this order.</p>
                </div>
              )}

              {isBank && isReviewing && (
                <div style={styles.waitingBadge}>
                  <Clock size={14} style={{marginRight: '8px'}} />
                  RECEIPT SUBMITTED. WAITING FOR VERIFICATION...
                </div>
              )}

              {isRejected && (
                <div style={{...styles.infoBox, backgroundColor: '#fff5f5', borderColor: '#ffcccc'}}>
                  <p style={{...styles.infoTitle, color: '#e74c3c'}}>PAYMENT REJECTED</p>
                  <p style={styles.infoText}>Your receipt was rejected. Please re-upload or contact WhatsApp support.</p>
                </div>
              )}

              {/* --- ACTION BUTTONS --- */}
              <div style={styles.buttonGroup}>
                {!isShipped && !isDelivered && !isCancelled && (
                  <button onClick={() => handleStatusUpdate(order.id, 'cancelled')} style={styles.btnRed}>CANCEL ORDER</button>
                )}

                {isBank && (isPending || isRejected) && (
                  <button onClick={() => openPaymentModal(order.id)} style={styles.btnUpload}>
                    <Upload size={14} style={{marginRight: '8px'}} /> {isRejected ? "RE-UPLOAD" : "UPLOAD RECEIPT"}
                  </button>
                )}

                {isShipped && (
                  <button onClick={() => handleStatusUpdate(order.id, 'delivered')} style={styles.btnYellow}>CONFIRM DELIVERY</button>
                )}

                {isDelivered && (
                  <>
                    {!reviewInfo?.exists ? (
                      <button 
                        onClick={() => {
                          const firstItem = order.items?.[0];
                          const pId = firstItem?.product_id || firstItem?.id;
                          // Updated navigation to send BOTH IDs
                          navigate(`/review/${order.id}/${pId}`);
                        }} 
                        style={styles.btnGreen}
                      >
                        LEAVE REVIEW
                      </button>
                    ) : <span style={styles.reviewCompleted}>REVIEW SUBMITTED</span>}
                    
                    {timeSinceUpdate <= THREE_DAYS_MS && (
                      <button onClick={() => openReturnModal(order.id)} style={styles.btnReturn}>REQUEST RETURN</button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* --- MODALS --- */}
      {showPaymentModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900' }}>UPLOAD RECEIPT</h3>
              <X onClick={() => setShowPaymentModal(false)} style={{ cursor: 'pointer' }} size={20} />
            </div>
            <form onSubmit={handleSubmitReceipt}>
              <div style={styles.receiptUploadBox}>
                {receiptPreview ? <img src={receiptPreview} alt="" style={styles.receiptPreviewImg} /> : 
                  <div style={styles.uploadPlaceholder}><Upload size={30} color="#ccc" /><p style={{fontSize: '11px'}}>Click to select</p></div>}
                <input type="file" accept="image/*" onChange={handleReceiptChange} style={styles.hiddenFile} />
              </div>
              <button type="submit" disabled={isSubmitting} style={styles.submitBtn}>
                {isSubmitting ? "PROCESSING..." : "SUBMIT PROOF"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showReturnModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900' }}>REQUEST RETURN</h3>
              <X onClick={closeReturnModal} style={{ cursor: 'pointer' }} size={20} />
            </div>
            <form onSubmit={handleSubmitReturn}>
              <select value={returnReason} onChange={(e) => setReturnReason(e.target.value)} style={styles.selectInput} required>
                <option value="">Select Reason</option>
                <option value="Damaged Product">Damaged Product</option>
                <option value="Wrong Item">Wrong Item</option>
              </select>
              <textarea placeholder="Notes" value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} style={styles.textArea} />
              <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{fontSize: '11px'}} />
              <button type="submit" disabled={isSubmitting} style={styles.submitBtn}>SUBMIT RETURN</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '80px 8%', maxWidth: '900px', margin: 'auto', fontFamily: "'Inter', sans-serif" },
  pageTitle: { fontSize: '20px', fontWeight: '900', letterSpacing: '1px', marginBottom: '30px', borderBottom: '1px solid #000', paddingBottom: '10px' },
  orderCard: { border: '1px solid #eee', padding: '25px', marginBottom: '25px', borderRadius: '8px', backgroundColor: '#fff' },
  cardHeader: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' },
  label: { fontSize: '9px', fontWeight: '800', color: '#aaa', letterSpacing: '0.5px' },
  val: { fontSize: '12px', fontWeight: '700', margin: '3px 0 0 0' },
  itemSection: { borderTop: '1px solid #fafafa', paddingTop: '15px', marginBottom: '15px' },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  itemLeft: { display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' },
  itemThumb: { width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' },
  itemDetails: { display: 'flex', flexDirection: 'column' },
  itemName: { fontSize: '12px', fontWeight: '700' },
  itemSubText: { fontSize: '10px', color: '#888' },
  itemPrice: { fontSize: '12px', fontWeight: '700' },
  buttonGroup: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '15px' },
  waitingBadge: { display: 'flex', alignItems: 'center', background: '#f0f7ff', color: '#004085', padding: '10px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', marginBottom: '15px' },
  infoBox: { border: '1px solid #eee', padding: '15px', borderRadius: '6px', marginBottom: '15px', textAlign: 'center' },
  infoTitle: { fontWeight: '900', fontSize: '13px', margin: '0 0 5px 0' },
  infoText: { fontSize: '11px', color: '#666' },
  btnRed: { backgroundColor: '#ff4d4d', color: '#fff', border: 'none', padding: '8px 16px', fontWeight: '700', cursor: 'pointer', borderRadius: '4px', fontSize: '11px' },
  btnYellow: { backgroundColor: '#f1c40f', color: '#000', border: 'none', padding: '8px 16px', fontWeight: '700', cursor: 'pointer', borderRadius: '4px', fontSize: '11px' },
  btnGreen: { backgroundColor: '#2ecc71', color: '#fff', border: 'none', padding: '8px 16px', fontWeight: '700', cursor: 'pointer', borderRadius: '4px', fontSize: '11px' },
  btnUpload: { backgroundColor: '#000', color: '#fff', border: 'none', padding: '8px 16px', fontWeight: '700', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', fontSize: '11px' },
  btnReturn: { backgroundColor: '#fff', color: '#555', border: '1px solid #ddd', padding: '8px 16px', fontWeight: '700', cursor: 'pointer', borderRadius: '4px', fontSize: '11px' },
  reviewCompleted: { fontSize: '10px', color: '#2ecc71', fontWeight: '800' },
  loader: { textAlign: 'center', marginTop: '150px', fontWeight: 'bold' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', padding: '25px', borderRadius: '8px', width: '90%', maxWidth: '350px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' },
  receiptUploadBox: { border: '2px dashed #eee', height: '150px', borderRadius: '8px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' },
  receiptPreviewImg: { width: '100%', height: '100%', objectFit: 'contain' },
  hiddenFile: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' },
  submitBtn: { width: '100%', padding: '12px', backgroundColor: '#000', color: '#fff', border: 'none', fontWeight: '800', cursor: 'pointer', borderRadius: '4px', marginTop: '10px' },
  emptyContainer: { textAlign: 'center', marginTop: '100px' },
  emptyMsg: { color: '#999' },
  selectInput: { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ddd' },
  textArea: { width: '100%', padding: '10px', height: '60px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ddd' }
};