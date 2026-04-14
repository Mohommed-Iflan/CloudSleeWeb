import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

// Address Data Constants
const COUNTRY_DATA = {
  "Sri Lanka": ["Western", "Central", "Southern", "North Western", "Sabaragamuwa", "Eastern", "Uva", "North Central", "Northern"],
  "India": ["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Gujarat", "Punjab", "Kerala"],
  "United States": ["California", "Texas", "New York", "Florida", "Illinois", "Washington"],
  "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"],
  "Australia": ["New South Wales", "Victoria", "Queensland", "Western Australia", "South Australia"]
};

const Settings = ({ user }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile States
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Address Book States
  const [addresses, setAddresses] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAddress, setCurrentAddress] = useState({
    id: null, full_name: '', phone_number: '', address_line: '', city: '', state: '', country: 'Sri Lanka', postcode: ''
  });

  // Global Loading/Fetching
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setFetching(true);
      if (!user?.id) return;

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (profile) {
        setFullName(profile.full_name || '');
        setPhone(profile.phone || '');
      }

      const { data: addrData, error: addrError } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (addrError) throw addrError;
      setAddresses(addrData || []);
    } catch (err) {
      console.error('Error:', err.message);
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- SECURITY LOGIC ---
  const handlePasswordReset = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      alert(`A password reset link has been sent to ${user.email}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("Are you sure? This will delete your profile and all saved addresses permanently. This cannot be undone.");
    if (!confirmed) return;

    setLoading(true);
    try {
      // 1. Delete user addresses first (Foreign Key constraint safety)
      await supabase.from('user_addresses').delete().eq('user_id', user.id);
      
      // 2. Delete profile
      const { error } = await supabase.from('profiles').delete().eq('id', user.id);
      if (error) throw error;

      // 3. Logout
      await supabase.auth.signOut();
      alert("Account deleted successfully.");
      navigate('/');
    } catch (err) {
      alert("Delete failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- ADDRESS LOGIC ---
  const handleCountryChange = (e) => {
    const selectedCountry = e.target.value;
    setCurrentAddress({
      ...currentAddress, 
      country: selectedCountry, 
      state: COUNTRY_DATA[selectedCountry] ? COUNTRY_DATA[selectedCountry][0] : '' 
    });
  };

  const handleSaveAddress = async () => {
    if (!currentAddress.full_name || !currentAddress.address_line || !currentAddress.country) {
      alert("Please fill in required fields.");
      return;
    }
    setLoading(true);
    try {
      const payload = { ...currentAddress, user_id: user.id };
      delete payload.id; // Remove ID from payload for inserts

      let error;
      if (currentAddress.id) {
        const { error: err } = await supabase.from('user_addresses').update(payload).eq('id', currentAddress.id);
        error = err;
      } else {
        const { error: err } = await supabase.from('user_addresses').insert([payload]);
        error = err;
      }
      if (error) throw error;
      setIsEditing(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (addr = null) => {
    if (!addr && addresses.length >= 3) return alert("Limit reached.");
    setCurrentAddress(addr || { 
      id: null, full_name: '', phone_number: '', address_line: '', city: '', state: 'Western', country: 'Sri Lanka', postcode: '' 
    });
    setIsEditing(true);
  };

  if (fetching) return <div style={styles.loader}>Synchronizing...</div>;

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.container}>
        <h1 style={styles.mainTitle}>Account Settings</h1>
        <div style={styles.layout}>
          <aside style={styles.sidebar}>
            <button onClick={() => setActiveTab('profile')} style={activeTab === 'profile' ? styles.activeTab : styles.tab}>Personal Info</button>
            <button onClick={() => setActiveTab('address')} style={activeTab === 'address' ? styles.activeTab : styles.tab}>Address Book</button>
            <button onClick={() => setActiveTab('security')} style={activeTab === 'security' ? styles.activeTab : styles.tab}>Security</button>
          </aside>

          <div style={styles.contentCard}>
            {/* PROFILE SECTION */}
            {activeTab === 'profile' && (
              <section>
                <h2 style={styles.sectionTitle}>Personal Details</h2>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Full Name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} style={styles.input} />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Phone Number</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={styles.input} />
                </div>
                <button onClick={() => alert('Profile update logic here')} style={styles.saveButton}>Update Profile</button>
              </section>
            )}

            {/* ADDRESS SECTION */}
            {activeTab === 'address' && (
              <section>
                <div style={styles.headerRow}>
                  <h2 style={styles.sectionTitle}>Addresses ({addresses.length}/3)</h2>
                  {!isEditing && addresses.length < 3 && <button onClick={() => openEditor()} style={styles.addButton}>+ ADD NEW</button>}
                </div>

                {isEditing ? (
                  <div style={styles.editorBox}>
                    <div style={styles.gridInputs}>
                      <input style={styles.input} placeholder="Full Name" value={currentAddress.full_name} onChange={e => setCurrentAddress({...currentAddress, full_name: e.target.value})} />
                      <input style={styles.input} placeholder="Phone" value={currentAddress.phone_number} onChange={e => setCurrentAddress({...currentAddress, phone_number: e.target.value})} />
                    </div>
                    <textarea style={{...styles.input, height: '60px'}} placeholder="Street Address" value={currentAddress.address_line} onChange={e => setCurrentAddress({...currentAddress, address_line: e.target.value})} />
                    <div style={styles.gridInputs}>
                      <div style={styles.selectWrapper}>
                        <label style={styles.miniLabel}>Country</label>
                        <select style={styles.input} value={currentAddress.country} onChange={handleCountryChange}>
                          {Object.keys(COUNTRY_DATA).map(country => <option key={country} value={country}>{country}</option>)}
                        </select>
                      </div>
                      <div style={styles.selectWrapper}>
                        <label style={styles.miniLabel}>State / Province</label>
                        <select style={styles.input} value={currentAddress.state} onChange={e => setCurrentAddress({...currentAddress, state: e.target.value})}>
                          {COUNTRY_DATA[currentAddress.country]?.map(st => <option key={st} value={st}>{st}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={styles.gridInputs}>
                      <input style={styles.input} placeholder="City" value={currentAddress.city} onChange={e => setCurrentAddress({...currentAddress, city: e.target.value})} />
                      <input style={styles.input} placeholder="Postcode" value={currentAddress.postcode} onChange={e => setCurrentAddress({...currentAddress, postcode: e.target.value})} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button onClick={handleSaveAddress} style={styles.saveButton} disabled={loading}>{loading ? 'Saving...' : 'Save Address'}</button>
                      <button onClick={() => setIsEditing(false)} style={styles.cancelButton}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={styles.addressList}>
                    {addresses.map(addr => (
                      <div key={addr.id} style={styles.addressCard}>
                        <div>
                          <strong>{addr.full_name}</strong> <span style={styles.badge}>HOME</span>
                          <p style={styles.addrText}>{addr.address_line}, {addr.city}, {addr.state}, {addr.country}</p>
                          <small style={styles.addrSub}>{addr.postcode} | {addr.phone_number}</small>
                        </div>
                        <div style={styles.addrActions}>
                          <button onClick={() => openEditor(addr)} style={styles.actionBtn}>EDIT</button>
                          <button onClick={() => {if(window.confirm('Delete?')) supabase.from('user_addresses').delete().eq('id', addr.id).then(()=>fetchData())}} style={{...styles.actionBtn, color: '#ff4d4f'}}>REMOVE</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* SECURITY SECTION */}
            {activeTab === 'security' && (
              <section>
                <h2 style={styles.sectionTitle}>Security Settings</h2>
                
                <div style={styles.securityBox}>
                  <h3 style={styles.subTitle}>Account Password</h3>
                  <p style={styles.addrText}>To change your password, we will send a secure verification link to <b>{user.email}</b>.</p>
                  <button onClick={handlePasswordReset} style={styles.saveButton} disabled={loading}>
                    {loading ? 'Sending...' : 'Change Password'}
                  </button>
                </div>

                <div style={styles.divider} />

                <div style={styles.securityBox}>
                  <h3 style={{...styles.subTitle, color: '#ff4d4f'}}>Danger Zone</h3>
                  <p style={styles.addrText}>Once you delete your account, there is no going back. Please be certain.</p>
                  <div style={{display: 'flex', gap: '15px', marginTop: '15px'}}>
                    <button onClick={handleLogout} style={styles.logoutBtn}>Log Out</button>
                    <button onClick={handleDeleteAccount} style={styles.deleteBtn} disabled={loading}>
                      Delete Account
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageWrapper: { backgroundColor: '#f9fafb', minHeight: '100vh', padding: '60px 20px', fontFamily: '"Inter", sans-serif' },
  container: { maxWidth: '1000px', margin: '0 auto' },
  mainTitle: { fontSize: '28px', fontWeight: '800', marginBottom: '40px' },
  layout: { display: 'grid', gridTemplateColumns: '260px 1fr', gap: '30px' },
  sidebar: { display: 'flex', flexDirection: 'column', gap: '10px' },
  tab: { textAlign: 'left', padding: '14px 16px', borderRadius: '12px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#666', fontWeight: '600' },
  activeTab: { textAlign: 'left', padding: '14px 16px', borderRadius: '12px', border: 'none', backgroundColor: '#00bee1', color: '#fff', fontWeight: '600' },
  contentCard: { backgroundColor: '#fff', borderRadius: '20px', padding: '40px', border: '1px solid #eee', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' },
  sectionTitle: { fontSize: '20px', fontWeight: '700', marginBottom: '25px' },
  subTitle: { fontSize: '16px', fontWeight: '700', marginBottom: '10px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  gridInputs: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' },
  inputGroup: { marginBottom: '20px' },
  miniLabel: { fontSize: '11px', fontWeight: '700', color: '#999', marginBottom: '4px', display: 'block' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '8px' },
  input: { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e0e0e0', fontSize: '14px', boxSizing: 'border-box' },
  saveButton: { backgroundColor: '#111', color: '#fff', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', border: 'none', fontWeight: '600' },
  addButton: { backgroundColor: '#00bee1', color: '#fff', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', border: 'none', fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#eee', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', border: 'none', fontWeight: '600' },
  securityBox: { padding: '10px 0' },
  divider: { height: '1px', backgroundColor: '#eee', margin: '30px 0' },
  logoutBtn: { backgroundColor: '#eee', color: '#444', padding: '12px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '600' },
  deleteBtn: { backgroundColor: '#fff', color: '#ff4d4f', padding: '12px 24px', borderRadius: '10px', border: '1px solid #ff4d4f', cursor: 'pointer', fontWeight: '600' },
  addressCard: { display: 'flex', justifyContent: 'space-between', padding: '20px', border: '1px solid #eee', borderRadius: '15px', marginBottom: '15px' },
  badge: { backgroundColor: '#ff7a59', color: '#fff', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', marginLeft: '10px' },
  addrText: { fontSize: '14px', margin: '5px 0', color: '#444', lineHeight: '1.5' },
  addrSub: { color: '#888' },
  actionBtn: { background: 'none', border: 'none', color: '#00bee1', fontWeight: 'bold', cursor: 'pointer' },
  loader: { textAlign: 'center', marginTop: '150px', color: '#888' }
};

export default Settings;