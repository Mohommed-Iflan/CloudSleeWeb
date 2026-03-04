import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function ProfileSetup({ session }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: ''
  });

  const updateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    const user = session.user;

    const updates = {
      id: user.id,
      ...formData,
      updated_at: new Date(),
    };

    let { error } = await supabase.from('profiles').upsert(updates);

    if (error) alert(error.message);
    else alert('Profile updated! Ready for easy checkout.');
    
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h3>Finish Your Profile 📦</h3>
      <p>Save your details for faster delivery.</p>
      <form onSubmit={updateProfile}>
        <input 
          style={styles.input}
          placeholder="Full Name" 
          onChange={(e) => setFormData({...formData, full_name: e.target.value})} 
        />
        <input 
          style={styles.input}
          placeholder="Phone Number" 
          onChange={(e) => setFormData({...formData, phone: e.target.value})} 
        />
        <textarea 
          style={styles.input}
          placeholder="Shipping Address" 
          onChange={(e) => setFormData({...formData, address: e.target.value})} 
        />
        <button type="submit" style={styles.btn}>
          {loading ? 'Saving...' : 'Save Info'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: { padding: '30px', maxWidth: '400px', margin: 'auto', backgroundColor: '#fff', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }
};