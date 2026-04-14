import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

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
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAddress, setCurrentAddress] = useState({
    id: null, full_name: '', phone_number: '', address_line: '', city: '', state: '', country: 'Sri Lanka', postcode: ''
  });
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

      const { data: addrData } = await supabase.from('user_addresses').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
      setAddresses(addrData || []);
    } catch (err) {
      console.error('Error:', err.message);
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').upsert({ id: user.id, full_name: fullName, phone: phone });
      if (error) throw error;
      alert("Profile updated successfully!");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      alert(`A link has been sent to ${user.email}`);
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
    if (!window.confirm("Permanent deletion: Are you sure?")) return;
    setLoading(true);
    try {
      await supabase.from('user_addresses').delete().eq('user_id', user.id);
      const { error } = await supabase.from('profiles').delete().eq('id', user.id);
      if (error) throw error;
      await supabase.auth.signOut();
      navigate('/');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCountryChange = (e) => {
    const country = e.target.value;
    setCurrentAddress({ ...currentAddress, country, state: COUNTRY_DATA[country] ? COUNTRY_DATA[country][0] : '' });
  };

  const handleSaveAddress = async () => {
    if (!currentAddress.full_name || !currentAddress.address_line) return alert("Required fields missing");
    setLoading(true);
    try {
      const payload = { ...currentAddress, user_id: user.id };
      let error;
      if (currentAddress.id) {
        const { id, ...updateData } = payload;
        const { error: err } = await supabase.from('user_addresses').update(updateData).eq('id', id);
        error = err;
      } else {
        const { id, ...insertData } = payload;
        const { error: err } = await supabase.from('user_addresses').insert([insertData]);
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

  if (fetching) return <div className="loader">Synchronizing settings...</div>;

  return (
    <div className="settings-page">
      <style>{`
        .settings-page { background: #f8fafc; min-height: 100vh; padding: 40px 20px; font-family: 'Inter', system-ui, sans-serif; color: #1e293b; }
        .container { max-width: 1100px; margin: 0 auto; }
        .page-header { margin-bottom: 32px; }
        .page-header h1 { font-size: 32px; font-weight: 800; letter-spacing: -0.02em; }
        
        .layout { display: flex; gap: 40px; }
        .sidebar { width: 240px; display: flex; flexDirection: column; gap: 8px; }
        .tab-btn { border: none; background: none; padding: 12px 16px; border-radius: 10px; text-align: left; font-weight: 600; cursor: pointer; color: #64748b; transition: 0.2s; }
        .tab-btn:hover { background: #f1f5f9; color: #0f172a; }
        .tab-btn.active { background: #fff; color: #00bee1; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
        
        .content-card { flex: 1; background: #fff; border-radius: 24px; padding: 40px; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1); border: 1px solid #f1f5f9; }
        .section-title { font-size: 20px; font-weight: 700; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
        
        .form-group { margin-bottom: 20px; }
        .label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #475569; }
        .input { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 15px; transition: 0.2s; outline: none; box-sizing: border-box;}
        .input:focus { border-color: #00bee1; ring: 2px solid #00bee122; }
        
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .btn-primary { background: #0f172a; color: #fff; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-outline { background: #fff; border: 1px solid #e2e8f0; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; }
        
        .address-card { border: 1px solid #f1f5f9; border-radius: 16px; padding: 20px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
        .address-card:hover { border-color: #00bee1; }
        .badge { background: #e0faff; color: #008fa9; font-size: 11px; padding: 4px 10px; border-radius: 20px; font-weight: 700; margin-left: 8px; }
        
        @media (max-width: 768px) {
          .layout { flex-direction: column; }
          .sidebar { width: 100%; flex-direction: row; overflow-x: auto; padding-bottom: 10px; }
          .tab-btn { white-space: nowrap; }
          .content-card { padding: 24px; }
          .grid-2 { grid-template-columns: 1fr; }
        }
        
        .loader { text-align: center; padding: 100px; font-weight: 600; color: #64748b; }
      `}</style>

      <div className="container">
        <header className="page-header">
          <h1>Account Settings</h1>
        </header>

        <div className="layout">
          <aside className="sidebar">
            <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Personal Info</button>
            <button className={`tab-btn ${activeTab === 'address' ? 'active' : ''}`} onClick={() => setActiveTab('address')}>Address Book</button>
            <button className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>Security</button>
          </aside>

          <main className="content-card">
            {activeTab === 'profile' && (
              <section>
                <h2 className="section-title">Personal Details</h2>
                <div className="form-group">
                  <label className="label">Full Name</label>
                  <input className="input" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. John Doe" />
                </div>
                <div className="form-group">
                  <label className="label">Phone Number</label>
                  <input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+94 77 123 4567" />
                </div>
                <button className="btn-primary" onClick={handleUpdateProfile} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </section>
            )}

            {activeTab === 'address' && (
              <section>
                <div className="section-title">
                  <span>Saved Addresses ({addresses.length}/3)</span>
                  {!isEditing && addresses.length < 3 && (
                    <button className="btn-primary" style={{padding: '8px 16px', fontSize: '14px', background: '#00bee1'}} onClick={() => { setIsEditing(true); setCurrentAddress({id: null, full_name: '', phone_number: '', address_line: '', city: '', state: 'Western', country: 'Sri Lanka', postcode: ''}); }}>
                      + Add New
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="editor">
                    <div className="grid-2 form-group">
                      <input className="input" placeholder="Recipient Name" value={currentAddress.full_name} onChange={e => setCurrentAddress({...currentAddress, full_name: e.target.value})} />
                      <input className="input" placeholder="Phone Number" value={currentAddress.phone_number} onChange={e => setCurrentAddress({...currentAddress, phone_number: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <input className="input" placeholder="Street Address" value={currentAddress.address_line} onChange={e => setCurrentAddress({...currentAddress, address_line: e.target.value})} />
                    </div>
                    <div className="grid-2 form-group">
                      <select className="input" value={currentAddress.country} onChange={handleCountryChange}>
                        {Object.keys(COUNTRY_DATA).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select className="input" value={currentAddress.state} onChange={e => setCurrentAddress({...currentAddress, state: e.target.value})}>
                        {COUNTRY_DATA[currentAddress.country]?.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="grid-2 form-group">
                      <input className="input" placeholder="City" value={currentAddress.city} onChange={e => setCurrentAddress({...currentAddress, city: e.target.value})} />
                      <input className="input" placeholder="Postcode" value={currentAddress.postcode} onChange={e => setCurrentAddress({...currentAddress, postcode: e.target.value})} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button className="btn-primary" onClick={handleSaveAddress}>{loading ? 'Saving...' : 'Save Address'}</button>
                      <button className="btn-outline" onClick={() => setIsEditing(false)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="address-list">
                    {addresses.map(addr => (
                      <div key={addr.id} className="address-card">
                        <div>
                          <strong>{addr.full_name}</strong><span className="badge">DEFAULT</span>
                          <p style={{fontSize: '14px', color: '#64748b', margin: '8px 0'}}>{addr.address_line}, {addr.city}, {addr.state}</p>
                          <p style={{fontSize: '13px', color: '#94a3b8'}}>{addr.country} • {addr.phone_number}</p>
                        </div>
                        <div style={{display: 'flex', gap: '12px'}}>
                          <button onClick={() => {setCurrentAddress(addr); setIsEditing(true);}} style={{background: 'none', border: 'none', color: '#00bee1', fontWeight: 'bold', cursor: 'pointer'}}>Edit</button>
                          <button onClick={() => {if(window.confirm('Delete?')) supabase.from('user_addresses').delete().eq('id', addr.id).then(()=>fetchData())}} style={{background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer'}}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === 'security' && (
              <section>
                <h2 className="section-title">Security & Privacy</h2>
                <div style={{background: '#f8fafc', padding: '24px', borderRadius: '16px', marginBottom: '24px'}}>
                  <h3 style={{fontSize: '16px', marginBottom: '8px'}}>Password</h3>
                  <p style={{fontSize: '14px', color: '#64748b', marginBottom: '16px'}}>We will send a link to <b>{user.email}</b> to reset your password.</p>
                  <button className="btn-primary" onClick={handlePasswordReset}>Change Password</button>
                </div>
                
                <div style={{border: '1px solid #fee2e2', padding: '24px', borderRadius: '16px'}}>
                  <h3 style={{fontSize: '16px', color: '#ef4444', marginBottom: '8px'}}>Danger Zone</h3>
                  <p style={{fontSize: '14px', color: '#64748b', marginBottom: '16px'}}>Once deleted, your account and all associated data will be gone forever.</p>
                  <div style={{display: 'flex', gap: '12px'}}>
                    <button className="btn-outline" onClick={handleLogout}>Log Out</button>
                    <button className="btn-outline" style={{borderColor: '#ef4444', color: '#ef4444'}} onClick={handleDeleteAccount}>Delete Account</button>
                  </div>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Settings;