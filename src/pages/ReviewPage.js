import React, { useState, useEffect } from 'react'; // Added useEffect
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Star, Trash2, Loader2, MessageSquare, ImagePlus } from 'lucide-react';

export default function ReviewPage({ user }) {
  const { orderId, productId } = useParams();
  const navigate = useNavigate();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  // --- CLEANUP LOGIC ---
  // This prevents memory leaks if the user leaves the page
  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const uploadSingleFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('orderId', orderId); 

    const { data, error } = await supabase.functions.invoke('upload-review-image', {
      body: formData,
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    return data.url;
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (selectedFiles.length + files.length > 3) {
      alert("You can only upload up to 3 photos.");
      return;
    }
    
    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);
    
    // Create new previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) { 
      alert("Please share your thoughts in the comment section."); 
      return; 
    }
    
    setLoading(true);

    try {
      const imageUrls = [];

      // 1. Upload files
      for (const file of selectedFiles) {
        const url = await uploadSingleFile(file);
        imageUrls.push(url);
      }

      // 2. Submit record
      const { error: dbError } = await supabase.from('reviews').insert([{
        order_id: orderId,
        product_id: productId,
        user_id: user?.id,
        rating: parseInt(rating),
        comment: comment,
        images: imageUrls 
      }]);

      if (dbError) throw dbError;

      // Revoke all URLs on success
      previews.forEach(url => URL.revokeObjectURL(url));

      alert("Thank you! Your review has been published.");
      navigate('/my-orders');

    } catch (err) {
      console.error("Submission error:", err);
      alert(`Submission failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ... (Return and styles remain exactly as you have them)
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <MessageSquare size={28} color="#f57224" />
        <h2 style={styles.title}>Product Review</h2>
      </div>

      <div style={styles.card}>
        <form onSubmit={handleSubmit}>
          <p style={styles.productId}>Product ID: {productId}</p>

          <div style={styles.section}>
            <label style={styles.label}>HOW WOULD YOU RATE IT?</label>
            <div style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((num) => (
                <Star 
                  key={num}
                  size={32}
                  fill={num <= rating ? "#f57224" : "none"}
                  color={num <= rating ? "#f57224" : "#ddd"}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setRating(num)}
                />
              ))}
            </div>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>SHARE YOUR EXPERIENCE</label>
            <textarea 
              style={styles.textarea} 
              value={comment} 
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you like or dislike about the product?"
              required
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>ADD PHOTOS (MAX 3)</label>
            <div 
              style={styles.uploadZone} 
              onClick={() => !loading && document.getElementById('review-images').click()}
            >
               <ImagePlus size={24} color={loading ? "#ccc" : "#1890ff"} />
               <p style={{fontSize: '12px', color: '#666', marginTop: '8px'}}>Click to add photos</p>
               <input 
                id="review-images"
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleImageChange} 
                hidden
                disabled={loading}
              />
            </div>

            <div style={styles.previewGrid}>
              {previews.map((url, index) => (
                <div key={index} style={styles.previewCard}>
                  <img src={url} alt="preview" style={styles.previewImg} />
                  <button type="button" onClick={() => removeImage(index)} style={styles.removeBtn}>
                    <Trash2 size={12} color="white" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Publishing...</>
            ) : "SUBMIT REVIEW"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '40px 20px', maxWidth: '500px', margin: 'auto', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px', justifyContent: 'center' },
  title: { fontSize: '22px', fontWeight: 'bold', color: '#333' },
  productId: { fontSize: '10px', color: '#999', textAlign: 'center', marginBottom: '20px', textTransform: 'uppercase' },
  card: { backgroundColor: '#fff', padding: '30px', borderRadius: '16px', border: '1px solid #eee', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' },
  section: { marginBottom: '25px' },
  label: { fontSize: '11px', fontWeight: 'bold', color: '#888', marginBottom: '12px', display: 'block' },
  ratingRow: { display: 'flex', gap: '8px', justifyContent: 'center' },
  textarea: { width: '100%', padding: '15px', border: '1px solid #ddd', borderRadius: '12px', minHeight: '120px', boxSizing: 'border-box', fontSize: '14px', outline: 'none' },
  uploadZone: { border: '2px dashed #e1e1e1', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer', backgroundColor: '#fafafa' },
  previewGrid: { display: 'flex', gap: '12px', marginTop: '15px' },
  previewCard: { position: 'relative', width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #eee' },
  previewImg: { width: '100%', height: '100%', objectFit: 'cover' },
  removeBtn: { position: 'absolute', top: '4px', right: '4px', backgroundColor: '#ff4d4f', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  submitBtn: { width: '100%', padding: '16px', backgroundColor: '#f57224', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }
};