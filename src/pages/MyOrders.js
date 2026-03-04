import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Package, X, Upload } from 'lucide-react'; 

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [productImages, setProductImages] = useState({}); 
  const [reviews, setReviews] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // --- NEW STATES FOR RETURN MODAL ---
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnNotes, setReturnNotes] = useState(""); // NEW
  const [returnFiles, setReturnFiles] = useState([]);
  const [previews, setPreviews] = useState([]); // NEW: For showing images immediately
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Time Constants
  const HOURS_48 = 48 * 60 * 60 * 1000;
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 72 hours total window

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

  const adjustStock = async (items) => {
    if (!items) return;
    for (const item of items) {
      const pId = String(item.product_id || item.id || '');
      const pColor = item.selectedColor || item.selected_color; 
      const pSize = String(item.selectedSize || item.selected_size || '');
      const pQty = parseInt(item.quantity || 1);

      const { error } = await supabase.rpc('update_variant_stock', {
        p_product_id: pId,
        p_color_name: pColor,
        p_size_val: pSize,
        p_adjustment: pQty 
      });
      if (error) console.error("Refund error:", error.message);
    }
  };

  const handleStatusUpdate = async (order, newStatus) => {
    if (newStatus === 'cancelled') {
      const confirmCancel = window.confirm("Are you sure you want to cancel this order?");
      if (!confirmCancel) return; 
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, status_updated_at: new Date().toISOString() })
      .eq('id', order.id);

    if (!error) {
      if (newStatus === 'cancelled') await adjustStock(order.items);
      fetchOrderData();
    }
  };

  // --- NEW RETURN HANDLERS ---
  const openReturnModal = (orderId) => {
    setSelectedOrderId(orderId);
    setShowReturnModal(true);
  };

  const closeReturnModal = () => {
    setShowReturnModal(false);
    setReturnReason("");
    setReturnNotes("");
    setReturnFiles([]);
    setPreviews([]);
    setSelectedOrderId(null);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    if (returnFiles.length + selectedFiles.length > 4) {
      alert("Maximum 4 images allowed.");
      return;
    }

    // Update Files
    const updatedFiles = [...returnFiles, ...selectedFiles];
    setReturnFiles(updatedFiles);

    // Update Previews
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeImage = (index) => {
    const updatedFiles = returnFiles.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setReturnFiles(updatedFiles);
    setPreviews(updatedPreviews);
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!returnReason || returnFiles.length === 0) return alert("Reason and proof are required.");
    
    setIsSubmitting(true);

    try {
      const uploadedUrls = [];
      for (const file of returnFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedOrderId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('returns')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('returns').getPublicUrl(fileName);
        uploadedUrls.push(urlData.publicUrl);
      }

      // Insert into new 'returns' table
      const { error: returnError } = await supabase
        .from('returns')
        .insert({
          order_id: selectedOrderId,
          user_id: user.id,
          reason: returnReason,
          notes: returnNotes,
          images: uploadedUrls,
          status: 'pending'
        });

      if (returnError) throw returnError;

      // Update main order status
      await supabase
        .from('orders')
        .update({ status: 'return requested', status_updated_at: new Date().toISOString() })
        .eq('id', selectedOrderId);

      alert("Return request submitted successfully.");
      closeReturnModal();
      fetchOrderData();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div style={styles.loader}>LOADING YOUR HISTORY...</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.pageTitle}>MY ORDERS</h2>
      
      {orders.length === 0 ? (
        <div style={styles.emptyContainer}>
           <Package size={48} color="#ccc" />
           <p style={styles.emptyMsg}>NO ORDERS PLACED YET.</p>
        </div>
      ) : (
        orders.map((order) => {
          const status = (order.status || "pending").toLowerCase();
          const updatedAt = new Date(order.status_updated_at || order.created_at).getTime();
          const timeSinceUpdate = Date.now() - updatedAt;
          const reviewInfo = reviews[order.id];

          return (
            <div key={order.id} style={styles.orderCard}>
              <div style={styles.cardHeader}>
                <div>
                  <span style={styles.label}>ORDER ID</span>
                  <p style={styles.val}>#{order.id?.slice(0, 8).toUpperCase()}</p>
                </div>
                <div>
                  <span style={styles.label}>STATUS</span>
                  <p style={{ 
                    ...styles.val, 
                    color: status.includes('cancel') || status.includes('return') ? '#ff4d4d' : '#2ecc71' 
                  }}>
                    {status.toUpperCase()}
                  </p>
                </div>
                <div>
                  <span style={styles.label}>TOTAL</span>
                  <p style={styles.val}>Rs. {Number(order.total_amount || 0).toLocaleString()}</p>
                </div>
              </div>

              <div style={styles.itemSection}>
                {order.items?.map((item, i) => {
                  const pId = item.product_id || item.id;
                  return (
                    <div key={i} style={styles.itemRow}>
                      <div style={styles.itemLeft}>
                        <img src={productImages[pId] || 'https://via.placeholder.com/150'} alt="" style={styles.itemThumb} />
                        <div style={styles.itemDetails}>
                          <span style={styles.itemName}>{(item.name || "Product").toUpperCase()}</span>
                          <span style={styles.itemSubText}>
                            Size: {item.selectedSize || item.selected_size} | Color: {item.selectedColor || item.selected_color} (x{item.quantity || 1})
                          </span>
                        </div>
                      </div>
                      <span style={styles.itemPrice}>Rs. {Number(item.price || 0).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>

              <div style={styles.buttonGroup}>
                {status === 'pending' && (
                  <button onClick={() => handleStatusUpdate(order, 'cancelled')} style={styles.btnRed}>CANCEL ORDER</button>
                )}

                {status === 'order shipped' && timeSinceUpdate >= HOURS_48 && (
                  <button onClick={() => handleStatusUpdate(order, 'delivered')} style={styles.btnYellow}>CONFIRM DELIVERY</button>
                )}

                {status === 'delivered' && (
                  <>
                    {!reviewInfo?.exists ? (
                      <button onClick={() => navigate(`/review/${order.id}`)} style={styles.btnGreen}>LEAVE REVIEW</button>
                    ) : (
                      <span style={styles.reviewCompleted}>REVIEW SUBMITTED</span>
                    )}

                    {timeSinceUpdate <= THREE_DAYS_MS ? (
                      <button onClick={() => openReturnModal(order.id)} style={styles.btnReturn}>
                        REQUEST RETURN
                      </button>
                    ) : (
                      <span style={styles.expiredText}>Return window closed</span>
                    )}
                  </>
                )}

                {status === 'return requested' && (
                  <span style={styles.returnBadge}>RETURN PENDING REVIEW</span>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* --- RETURN MODAL --- */}
      {showReturnModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>RETURN FORM</h3>
              <X onClick={closeReturnModal} style={{ cursor: 'pointer' }} size={20} />
            </div>
            
            <form onSubmit={handleSubmitReturn}>
              <label style={styles.modalLabel}>REASON FOR RETURN</label>
              <select 
                value={returnReason} 
                onChange={(e) => setReturnReason(e.target.value)} 
                style={styles.modalInput}
                required
              >
                <option value="">Select a reason</option>
                <option value="Damage">Damaged Product</option>
                <option value="Wrong Item">Wrong Item Received</option>
                <option value="Quality">Quality Issue</option>
                <option value="Other">Other</option>
              </select>

              <label style={styles.modalLabel}>ADDITIONAL DETAILS</label>
              <textarea 
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Please describe the issue in detail..."
                style={styles.modalTextArea}
                required={returnReason === 'Other'}
              />

              <label style={styles.modalLabel}>PROOF IMAGES (MAX 4)</label>
              <div style={styles.previewGrid}>
                {previews.map((src, index) => (
                  <div key={index} style={styles.previewItem}>
                    <img src={src} alt="" style={styles.previewImg} />
                    <button type="button" onClick={() => removeImage(index)} style={styles.removeBtn}>
                      <X size={10} color="#fff" />
                    </button>
                  </div>
                ))}
                
                {returnFiles.length < 4 && (
                  <div style={styles.fileBoxSmall}>
                    <Upload size={18} color="#888" />
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      style={styles.hiddenFile} 
                    />
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting} 
                style={{ ...styles.submitBtn, opacity: isSubmitting ? 0.7 : 1 }}
              >
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
  buttonGroup: { display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' },
  btnRed: { backgroundColor: '#ff4d4d', color: '#fff', border: 'none', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', borderRadius: '4px' },
  btnYellow: { backgroundColor: '#f1c40f', color: '#000', border: 'none', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', borderRadius: '4px' },
  btnGreen: { backgroundColor: '#2ecc71', color: '#fff', border: 'none', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', borderRadius: '4px' },
  btnReturn: { backgroundColor: '#fff', color: '#555', border: '1px solid #ddd', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', borderRadius: '4px' },
  reviewCompleted: { fontSize: '11px', color: '#2ecc71', fontWeight: '800' },
  expiredText: { fontSize: '11px', color: '#999', fontStyle: 'italic' },
  returnBadge: { fontSize: '11px', color: '#ff4d4d', fontWeight: '800' },
  loader: { textAlign: 'center', marginTop: '150px', fontWeight: 'bold' },
  emptyContainer: { textAlign: 'center', marginTop: '100px' },
  emptyMsg: { color: '#999' },

  // --- MODAL STYLES ---
  modalOverlay: { 
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', 
    justifyContent: 'center', alignItems: 'center', zIndex: 1000 
  },
  modalContent: { 
    backgroundColor: '#fff', padding: '30px', borderRadius: '8px', 
    width: '90%', maxWidth: '400px' 
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  modalLabel: { fontSize: '10px', fontWeight: '800', display: 'block', marginBottom: '8px' },
  modalInput: { width: '100%', padding: '12px', marginBottom: '20px', border: '1px solid #eee', outline: 'none' },
  modalTextArea: { width: '100%', padding: '12px', marginBottom: '20px', border: '1px solid #eee', outline: 'none', height: '80px', resize: 'none', fontFamily: 'inherit', fontSize: '13px' },
  
  // Preview Grid Styles
  previewGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' },
  previewItem: { position: 'relative', width: '100%', height: '70px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #eee' },
  previewImg: { width: '100%', height: '100%', objectFit: 'cover' },
  removeBtn: { position: 'absolute', top: '2px', right: '2px', backgroundColor: 'rgba(255, 77, 77, 0.9)', border: 'none', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  
  fileBoxSmall: { border: '2px dashed #eee', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRadius: '4px' },
  hiddenFile: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' },
  submitBtn: { width: '100%', padding: '15px', backgroundColor: '#000', color: '#fff', border: 'none', fontWeight: '800', cursor: 'pointer' }
};