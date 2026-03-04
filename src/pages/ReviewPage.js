import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function ReviewPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [productId, setProductId] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false); // New: Tracks if we found the product
  
  const [selectedFiles, setSelectedFiles] = useState([]); 
  const [previews, setPreviews] = useState([]); 

  useEffect(() => {
    const getProductFromOrder = async () => {
      try {
        // Look into the 'orders' table to see which product was bought (e.g. ID 5)
        const { data, error } = await supabase
          .from('orders')
          .select('product_id')
          .eq('id', orderId)
          .single();

        if (data && data.product_id) {
          setProductId(data.product_id);
          setDataLoaded(true);
        } else {
          console.error("No product found for this order ID:", orderId);
          setDataLoaded(false);
        }
      } catch (err) {
        console.error("Database connection error:", err);
      }
    };
    getProductFromOrder();
  }, [orderId]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (selectedFiles.length + files.length > 3) {
      alert("You can only upload a maximum of 3 photos.");
      return;
    }
    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
  };

  const removeImage = (index) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    setPreviews(updatedPreviews);
  };

  const handleSubmit = async () => {
    if (!comment.trim()) { alert("Please enter a comment!"); return; }
    
    // This stops the "Loading product data" bug
    if (!productId) { 
      alert("We are still fetching the product details. If this takes too long, please refresh the page."); 
      return; 
    }
    
    setLoading(true);
    let imageUrls = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Upload Images
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileName = `${user.id}/${Date.now()}_${file.name}`;
          const { error: upError } = await supabase.storage
            .from('review-images')
            .upload(fileName, file);
          if (upError) throw upError;
          const { data: { publicUrl } } = supabase.storage
            .from('review-images')
            .getPublicUrl(fileName);
          imageUrls.push(publicUrl);
        }
      }

      // 2. Insert Review
      const { error } = await supabase.from('reviews').insert([{
        order_id: orderId,
        user_id: user.id,
        product_id: productId, // Ensuring ID 5 is sent
        rating: parseInt(rating),
        comment: comment,
        images: imageUrls
      }]);

      if (error) throw error;

      alert("Review Published Successfully! 📸");
      navigate('/my-orders');
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- UI RENDER ---

  // If it's still loading and we haven't found the product ID yet
  if (!dataLoaded && !productId) {
    return (
      <div style={{textAlign: 'center', padding: '100px'}}>
        <h3>Loading product details...</h3>
        <p style={{color: '#888'}}>If this takes more than 5 seconds, ensure your Order contains a Product ID.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>WRITE A REVIEW</h2>
      <div style={styles.card}>
        <label style={styles.label}>RATING</label>
        <select value={rating} onChange={(e) => setRating(e.target.value)} style={styles.input}>
          <option value="5">5 Stars - Excellent</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>

        <label style={styles.label}>YOUR COMMENT</label>
        <textarea 
          style={styles.textarea} 
          value={comment} 
          onChange={(e) => setComment(e.target.value)}
          placeholder="How is the quality and fit?"
        />

        <label style={styles.label}>ADD PHOTOS (MAX 3)</label>
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          onChange={handleImageChange} 
          style={{marginBottom: '20px', fontSize: '12px'}}
          disabled={selectedFiles.length >= 3}
        />

        <div style={styles.previewContainer}>
          {previews.map((url, index) => (
            <div key={index} style={styles.previewWrapper}>
              <img src={url} alt="Preview" style={styles.previewImg} />
              <button type="button" onClick={() => removeImage(index)} style={styles.removeBadge}>×</button>
            </div>
          ))}
        </div>

        <button onClick={handleSubmit} disabled={loading} style={styles.btn}>
          {loading ? "PUBLISHING..." : "SUBMIT REVIEW"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '60px 20px', maxWidth: '500px', margin: 'auto', fontFamily: 'sans-serif' },
  title: { fontSize: '22px', fontWeight: 'bold', textAlign: 'center', marginBottom: '30px' },
  card: { border: '1px solid #eee', padding: '30px', borderRadius: '15px', boxShadow: '0 5px 15px rgba(0,0,0,0.05)', backgroundColor: '#fff' },
  label: { fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '10px', color: '#888' },
  input: { width: '100%', padding: '12px', marginBottom: '25px', border: '1px solid #ddd', borderRadius: '8px' },
  textarea: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', minHeight: '100px', marginBottom: '25px', boxSizing: 'border-box' },
  previewContainer: { display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' },
  previewWrapper: { position: 'relative', width: '80px', height: '80px' },
  previewImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid #eee' },
  removeBadge: { position: 'absolute', top: '-8px', right: '-8px', width: '20px', height: '20px', backgroundColor: '#ff4d4d', color: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' },
  btn: { width: '100%', padding: '16px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }
};