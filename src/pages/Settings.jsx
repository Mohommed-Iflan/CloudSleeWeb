import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const Settings = ({ user }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Input states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // 1. Fetch data specifically for the logged-in User UUID
  const getProfile = useCallback(async () => {
    try {
      setFetching(true);
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone, address')
        .eq('id', user.id) 
        .maybeSingle(); // Prevents crashing if row doesn't exist yet

      if (error) throw error;

      if (data) {
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
        setAddress(data.address || '');
      }
    } catch (err) {
      console.error('Error fetching profile:', err.message);
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => {
    getProfile();
  }, [getProfile]);

  // 2. The "Smart Save" - Updates if exists, Creates if missing
  const handleUpdateProfile = async () => {
    if (!user?.id) {
      alert("No active session found. Please log in.");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id, // The UUID from your Auth table
          full_name: fullName,
          phone: phone,
          address: address,
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'id' // CRITICAL: Tells Supabase to match by ID, not create new
        });

      if (error) throw error;
      alert('Settings updated successfully!');
      getProfile(); // Refresh the UI with the latest data
    } catch (err) {
      alert('Update failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // UI Icons
  const Icon = ({ path }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '12px' }}>
      {path}
    </svg>
  );

  if (fetching) return <div style={styles.loader}>Synchronizing account data...</div>;

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.container}>
        <h1 style={styles.mainTitle}>Account Settings</h1>
        
        <div style={styles.layout}>
          {/* Navigation Sidebar */}
          <aside style={styles.sidebar}>
            <button onClick={() => setActiveTab('profile')} style={activeTab === 'profile' ? styles.activeTab : styles.tab}>
              <Icon path={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></>} />
              Personal Info
            </button>
            <button onClick={() => setActiveTab('address')} style={activeTab === 'address' ? styles.activeTab : styles.tab}>
              <Icon path={<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></>} />
              Shipping Address
            </button>
            <button onClick={() => setActiveTab('security')} style={activeTab === 'security' ? styles.activeTab : styles.tab}>
              <Icon path={<><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></>} />
              Security
            </button>
          </aside>

          {/* Form Content */}
          <div style={styles.contentCard}>
            {activeTab === 'profile' && (
              <section>
                <h2 style={styles.sectionTitle}>Personal Details</h2>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Full Name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} style={styles.input} placeholder="Enter your full name" />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Email Address</label>
                  <input type="email" value={user?.email || ''} disabled style={styles.inputDisabled} />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Phone Number</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={styles.input} placeholder="07xxxxxxxx" />
                </div>
                <button onClick={handleUpdateProfile} style={styles.saveButton} disabled={loading}>
                  {loading ? 'Saving...' : 'Update Details'}
                </button>
              </section>
            )}

            {activeTab === 'address' && (
              <section>
                <h2 style={styles.sectionTitle}>Delivery Address</h2>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Full Shipping Address</label>
                  <textarea 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    style={{...styles.input, height: '120px', resize: 'none'}} 
                    placeholder="House No, Street, City..."
                  />
                </div>
                <button onClick={handleUpdateProfile} style={styles.saveButton} disabled={loading}>
                  {loading ? 'Updating...' : 'Save Address'}
                </button>
              </section>
            )}

            {activeTab === 'security' && (
              <section>
                <h2 style={styles.sectionTitle}>Account Security</h2>
                <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>Once you log out, you will need to sign in again to access your orders.</p>
                <button onClick={handleLogout} style={styles.logoutButton}>Sign Out</button>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Modern Minimalist Styles
const styles = {
  pageWrapper: { backgroundColor: '#f9fafb', minHeight: '100vh', padding: '60px 20px', fontFamily: '"Inter", system-ui, sans-serif' },
  container: { maxWidth: '1000px', margin: '0 auto' },
  mainTitle: { fontSize: '28px', fontWeight: '800', marginBottom: '40px', color: '#111' },
  layout: { display: 'grid', gridTemplateColumns: '260px 1fr', gap: '30px' },
  sidebar: { display: 'flex', flexDirection: 'column', gap: '10px' },
  tab: { display: 'flex', alignItems: 'center', padding: '12px 16px', borderRadius: '12px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#666', fontWeight: '500', transition: 'all 0.2s' },
  activeTab: { display: 'flex', alignItems: 'center', padding: '12px 16px', borderRadius: '12px', border: 'none', backgroundColor: '#00bee1', color: '#fff', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 190, 225, 0.2)' },
  contentCard: { backgroundColor: '#fff', borderRadius: '20px', padding: '40px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #eee' },
  sectionTitle: { fontSize: '22px', fontWeight: '700', marginBottom: '25px', color: '#111' },
  inputGroup: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e0e0e0', fontSize: '15px', boxSizing: 'border-box', transition: 'border-color 0.2s', outlineColor: '#00bee1' },
  inputDisabled: { width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f0f0f0', backgroundColor: '#fcfcfc', color: '#aaa', boxSizing: 'border-box', cursor: 'not-allowed' },
  saveButton: { backgroundColor: '#111', color: '#fff', padding: '14px 28px', borderRadius: '10px', border: 'none', fontWeight: '600', cursor: 'pointer', transition: 'transform 0.1s active' },
  logoutButton: { backgroundColor: '#fff', color: '#e11d48', border: '1.5px solid #e11d48', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  loader: { textAlign: 'center', marginTop: '150px', fontSize: '16px', color: '#888' }
};

export default Settings;