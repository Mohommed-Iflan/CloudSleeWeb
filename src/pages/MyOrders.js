import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Package, X, Upload, ExternalLink, Clock, CheckCircle } from 'lucide-react'; 
import emailjs from '@emailjs/browser';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [productImages, setProductImages] = useState({}); 
  const [reviews, setReviews] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // --- MODAL STATES ---
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

  const HOURS_48 = 48 * 60 * 60 * 1000;
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

  // --- EMAIL HELPER ---
  const sendOrderEmail = async (order, type) => {
    // Replace these with your actual EmailJS credentials
    const serviceId = 'YOUR_SERVICE_ID';
    const publicKey = 'YOUR_PUBLIC_KEY';
    let templateId = '';
    let statusMessage = '';

    if (type === 'RECEIPT_SUBMITTED') {
      templateId = 'TEMPLATE_RECEIPT_SUBMITTED';
      statusMessage = "We have received your payment receipt. Our team is verifying it now.";
    } else {
      return;
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
      console.log("Confirmation email sent.");
    } catch (error) {
      console.error("Email notification failed:", error);
    }
  };

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

      if (uploadCount >= 5) throw new Error("Upload limit reached. Please contact support.");

      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `receipts/${selectedOrderId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('orders')
        .upload(fileName, receiptFile, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('orders').getPublicUrl(fileName);

      // Status changed to 'payment reviewing'
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

      // Trigger Email
      await sendOrderEmail(currentOrder, 'RECEIPT_SUBMITTED');
      
      alert("Receipt submitted! We are verifying your payment.");
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

  const removeImage = (index) => {
    setReturnFiles(returnFiles.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
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

  const handleStatusUpdate = async (order, newStatus) => {
    if (newStatus === 'cancelled' && !window.confirm("Cancel this order?")) return;
    const { error } = await supabase.from('orders').update({ status: newStatus, status_updated_at: new Date().toISOString() }).eq('id', order.id);
    if (!error) fetchOrderData();
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
          const updatedAt = new Date(order.status_updated_at || order.created_at).getTime();
          const timeSinceUpdate = Date.now() - updatedAt;
          const reviewInfo = reviews[order.id];

          // --- LOGIC CHECKS ---
          const isPendingUpload = status === 'pending_payment';
          const isWaitingVerification = status === 'payment reviewing' || status === 'pending';
          const isRejected = status === 'payment rejected';
          const isAccepted = status === 'payment accepted';

          return (
            <div key={order.id} style={styles.orderCard}>
              <div style={styles.cardHeader}>
                <div><span style={styles.label}>ORDER ID</span><p style={styles.val}>#{order.id?.slice(0, 8).toUpperCase()}</p></div>
                <div><span style={styles.label}>STATUS</span>
                  <p style={{ ...styles.val, color: 
                    isRejected ? '#ff4d4d' : 
                    isAccepted ? '#2ecc71' : 
                    isPendingUpload ? '#f39c12' : 
                    isWaitingVerification ? '#9b59b6' : '#000' }}>
                    {status.toUpperCase()}
                  </p>
                </div>
                <div><span style={styles.label}>TOTAL</span><p style={styles.val}>Rs. {Number(order.total_amount || 0).toLocaleString()}</p></div>
              </div>

              <div style={styles.itemSection}>
                {order.items?.map((item, i) => {
                  const pId = item.product_id || item.id;
                  return (
                    <div key={i} style={styles.itemRow}>
                      <div style={{ ...styles.itemLeft, cursor: 'pointer' }} onClick={() => navigate(`/product/${pId}`)}>
                        <img src={productImages[pId] || 'https://via.placeholder.com/150'} alt="" style={styles.itemThumb} />
                        <div style={styles.itemDetails}>
                          <span style={styles.itemName}>{(item.name || "Product").toUpperCase()}</span>
                          <span style={styles.itemSubText}>Size: {item.selectedSize} | Color: {item.selectedColor}</span>
                        </div>
                      </div>
                      <span style={styles.itemPrice}>Rs. {Number(item.price || 0).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>

              {/* 1. PAYMENT REQUIRED */}
              {isPendingUpload && (
                <div style={{...styles.infoBox, backgroundColor: '#fff9e6', borderColor: '#f1c40f'}}>
                  <p style={{...styles.infoTitle, color: '#9a7d0a'}}>PAYMENT REQUIRED</p>
                  <p style={styles.infoText}>Please upload your bank receipt to process the order.</p>
                </div>
              )}

              {/* 2. REJECTED BOX */}
              {isRejected && (
                <div style={{...styles.infoBox, backgroundColor: '#fff5f5', borderColor: '#ffcccc'}}>
                  <p style={{...styles.infoTitle, color: '#e74c3c'}}>PAYMENT REJECTED</p>
                  <p style={styles.infoText}>Your receipt was rejected. Please upload a clear image or contact WhatsApp.</p>
                  <a href="https://wa.me/message/HICDYL3OHH2YA1" target="_blank" rel="noreferrer" style={styles.waLinkLarge}>
                    HELP VIA WHATSAPP
                  </a>
                </div>
              )}

              {/* 3. WAITING VERIFICATION */}
              {isWaitingVerification && (
                <div style={styles.waitingBadge}>
                    <Clock size={14} style={{marginRight: '8px'}} />
                    RECEIPT SUBMITTED. WAITING FOR VERIFICATION...
                </div>
              )}

              {/* 4. PAYMENT ACCEPTED */}
              {isAccepted && (
                <div style={{...styles.infoBox, backgroundColor: '#eefcf5', borderColor: '#2ecc71'}}>
                  <p style={{...styles.infoTitle, color: '#27ae60', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'}}>
                    <CheckCircle size={14} /> PAYMENT ACCEPTED
                  </p>
                  <p style={styles.infoText}>Your payment is verified. We are preparing your items.</p>
                </div>
              )}

              {order.payment_receipt_url && (
                <div style={styles.viewReceiptSection}>
                  <span style={styles.label}>LAST UPLOADED RECEIPT</span>
                  <a href={order.payment_receipt_url} target="_blank" rel="noreferrer" style={styles.receiptLink}>VIEW RECEIPT</a>
                </div>
              )}

              <div style={styles.buttonGroup}>
                {(isPendingUpload || isRejected) && (
                  <button onClick={() => openPaymentModal(order.id)} style={styles.btnUpload}>
                    <Upload size={14} style={{marginRight: '8px'}} /> 
                    {isRejected ? "RE-UPLOAD RECEIPT" : "UPLOAD RECEIPT"}
                  </button>
                )}

                {isPendingUpload && (
                  <button onClick={() => handleStatusUpdate(order, 'cancelled')} style={styles.btnRed}>CANCEL ORDER</button>
                )}

                {status === 'order shipped' && timeSinceUpdate >= HOURS_48 && (
                  <button onClick={() => handleStatusUpdate(order, 'delivered')} style={styles.btnYellow}>CONFIRM DELIVERY</button>
                )}

                {status === 'delivered' && (
                  <>
                    {!reviewInfo?.exists ? (
                      <button onClick={() => navigate(`/review/${order.id}`)} style={styles.btnGreen}>LEAVE REVIEW</button>
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

      {/* --- PAYMENT RECEIPT MODAL --- */}
      {showPaymentModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900' }}>UPLOAD BANK RECEIPT</h3>
              <X onClick={() => setShowPaymentModal(false)} style={{ cursor: 'pointer' }} size={20} />
            </div>
            <form onSubmit={handleSubmitReceipt}>
              <div style={styles.receiptUploadBox}>
                {receiptPreview ? <img src={receiptPreview} alt="Receipt" style={styles.receiptPreviewImg} /> : 
                  <div style={styles.uploadPlaceholder}><Upload size={30} color="#ccc" /><p style={{fontSize: '12px', color: '#999'}}>Click to select image</p></div>}
                <input type="file" accept="image/*" onChange={handleReceiptChange} style={styles.hiddenFile} />
              </div>
              <button type="submit" disabled={isSubmitting} style={{ ...styles.submitBtn, marginTop: '20px' }}>
                {isSubmitting ? "UPLOADING..." : "SUBMIT PAYMENT PROOF"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- RETURN MODAL --- */}
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
                <option value="Size Issue">Size Issue</option>
                <option value="Quality not as expected">Quality not as expected</option>
              </select>
              <textarea placeholder="Additional notes" value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} style={styles.textArea} />
              <input type="file" multiple accept="image/*" onChange={handleFileChange} />
              <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                {previews.map((src, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={src} alt="" style={{ width: '50px', height: '50px', objectFit: 'cover' }} />
                    <X size={12} style={styles.removeImgIcon} onClick={() => removeImage(i)} />
                  </div>
                ))}
              </div>
              <button type="submit" disabled={isSubmitting} style={{ ...styles.submitBtn, marginTop: '20px' }}>
                {isSubmitting ? "SUBMITTING..." : "SUBMIT RETURN"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '80px 8%', maxWidth: '1000px', margin: 'auto', fontFamily: "'Inter', sans-serif" },
  pageTitle: { fontSize: '22px', fontWeight: '900', letterSpacing: '2px', marginBottom: '40px', borderBottom: '1px solid #000', paddingBottom: '15px' },
  orderCard: { border: '1px solid #eee', padding: '30px', marginBottom: '30px', borderRadius: '4px' },
  cardHeader: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '25px' },
  label: { fontSize: '10px', fontWeight: '800', color: '#aaa' },
  val: { fontSize: '14px', fontWeight: '700', margin: '5px 0 0 0' },
  itemSection: { borderTop: '1px solid #fafafa', paddingTop: '20px', marginBottom: '25px' },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  itemLeft: { display: 'flex', alignItems: 'center', gap: '15px' },
  itemThumb: { width: '70px', height: '70px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #eee' },
  itemDetails: { display: 'flex', flexDirection: 'column' },
  itemName: { fontSize: '13px', fontWeight: '700' },
  itemSubText: { fontSize: '11px', color: '#888' },
  itemPrice: { fontSize: '13px', fontWeight: '700' },
  waitingBadge: { display: 'flex', alignItems: 'center', background: '#f0f7ff', border: '1px solid #cce5ff', color: '#004085', padding: '12px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', marginBottom: '15px' },
  viewReceiptSection: { marginBottom: '20px', padding: '10px', background: '#f9f9f9', borderRadius: '4px' },
  receiptLink: { display: 'block', fontSize: '11px', fontWeight: '700', color: '#000', marginTop: '5px', textDecoration: 'underline' },
  buttonGroup: { display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' },
  infoBox: { border: '1px solid #eee', padding: '20px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' },
  infoTitle: { fontWeight: '900', fontSize: '14px', margin: '0 0 10px 0', letterSpacing: '1px' },
  infoText: { fontSize: '12px', color: '#333', marginBottom: '10px' },
  waLinkLarge: { color: '#25D366', fontSize: '12px', fontWeight: '800', textDecoration: 'underline', display: 'block' },
  btnRed: { backgroundColor: '#ff4d4d', color: '#fff', border: 'none', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', borderRadius: '4px' },
  btnYellow: { backgroundColor: '#f1c40f', color: '#000', border: 'none', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', borderRadius: '4px' },
  btnGreen: { backgroundColor: '#2ecc71', color: '#fff', border: 'none', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', borderRadius: '4px' },
  btnUpload: { backgroundColor: '#000', color: '#fff', border: 'none', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center' },
  btnReturn: { backgroundColor: '#fff', color: '#555', border: '1px solid #ddd', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', borderRadius: '4px' },
  reviewCompleted: { fontSize: '11px', color: '#2ecc71', fontWeight: '800' },
  loader: { textAlign: 'center', marginTop: '150px', fontWeight: 'bold' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', padding: '30px', borderRadius: '8px', width: '90%', maxWidth: '400px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  receiptUploadBox: { border: '2px dashed #eee', height: '180px', borderRadius: '8px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  uploadPlaceholder: { textAlign: 'center' },
  receiptPreviewImg: { width: '100%', height: '100%', objectFit: 'contain' },
  hiddenFile: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' },
  submitBtn: { width: '100%', padding: '15px', backgroundColor: '#000', color: '#fff', border: 'none', fontWeight: '800', cursor: 'pointer' },
  emptyContainer: { textAlign: 'center', marginTop: '100px' },
  emptyMsg: { color: '#999' },
  selectInput: { width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px' },
  textArea: { width: '100%', padding: '10px', height: '80px', marginBottom: '15px', borderRadius: '4px' },
  removeImgIcon: { position: 'absolute', top: 0, right: 0, background: '#fff', cursor: 'pointer' }
};