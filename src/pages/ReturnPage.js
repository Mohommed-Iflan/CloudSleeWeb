import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function ReturnPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim() || images.length === 0) {
      alert("PLEASE PROVIDE REASON AND PHOTOS.");
      return;
    }
    setLoading(true);
    let imageUrls = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      for (const file of images) {
        const path = `${user.id}/ret_${Date.now()}_${file.name}`;
        await supabase.storage.from('return-images').upload(path, file);
        const { data: { publicUrl } } = supabase.storage.from('return-images').getPublicUrl(path);
        imageUrls.push(publicUrl);
      }

      await supabase.from('returns').insert({
        order_id: orderId, user_id: user.id, reason, images: imageUrls
      });

      await supabase.from('orders').update({ status: 'return_pending' }).eq('id', orderId);

      alert("RETURN REQUESTED.");
      navigate('/my-orders');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2>REQUEST RETURN</h2>
      <div style={styles.card}>
        <textarea 
          placeholder="WHY ARE YOU RETURNING THIS?" 
          style={styles.textarea}
          onChange={(e) => setReason(e.target.value)}
        />
        <input type="file" multiple onChange={(e) => setImages([...e.target.files])} />
        <button onClick={handleSubmit} disabled={loading} style={styles.btn}>
          {loading ? "UPLOADING..." : "SUBMIT RETURN"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '80px 8%', maxWidth: '600px', margin: 'auto' },
  card: { border: '1px solid #eee', padding: '30px' },
  textarea: { width: '100%', minHeight: '120px', marginBottom: '20px', padding: '10px' },
  btn: { width: '100%', backgroundColor: '#ff4d4d', color: '#fff', border: 'none', padding: '15px', fontWeight: '800' }
};