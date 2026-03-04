import React, { useState } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Country, State, City } from 'country-state-city';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // --- Form Data ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // --- Address States ---
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');

  // --- Rive Animation Setup ---
  const { rive, RiveComponent } = useRive({
    src: '/assets/login_animation.riv', 
    stateMachines: "LoginMachine",
    autoplay: true,
  });

  const isCovering = useStateMachineInput(rive, "LoginMachine", "isCovering");
  const lookAmount = useStateMachineInput(rive, "LoginMachine", "lookAmount");

  const handleMouseMove = (e) => {
    if (lookAmount) {
      const val = (e.pageX / window.innerWidth) * 100;
      lookAmount.value = val;
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, phone: phone } }
      });

      if (error) {
        alert(error.message);
      } else if (data.user) {
        const countryName = Country.getCountryByCode(selectedCountry)?.name || '';
        const stateName = State.getStateByCodeAndCountry(selectedState, selectedCountry)?.name || '';
        const fullAddress = `${addressLine1}, ${city}, ${stateName}, ${countryName}`;

        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: name,
          phone: phone,
          address: fullAddress
        });
        alert("Account created! Let's get those slippers.");
        navigate('/');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else navigate('/');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container} onMouseMove={handleMouseMove}>
      <div style={styles.leftSide}>
        <div style={styles.brand}>🩴 Slipper Haven</div>
        <div style={styles.riveBox}>
          <RiveComponent />
        </div>
        <div style={styles.heroTextContent}>
             <h2 style={styles.heroText}>Comfort to your foot,<br/>Feel free to your Heart.</h2>
        </div>
      </div>

      <div style={styles.rightSide}>
        <div style={styles.formCard}>
          <h2 style={styles.title}>{isSignUp ? "Join the Camp" : "Howdy Camper 🤚"}</h2>
          <p style={styles.subtitle}>Please enter your details.</p>

          <form onSubmit={handleAuth}>
            <input placeholder="Email Address" type="email" style={styles.input} onChange={e => setEmail(e.target.value)} required />
            
            <div style={styles.passwordWrapper}>
              <input 
                placeholder="Password" 
                type={showPassword ? "text" : "password"} 
                style={styles.inputNoMargin} 
                onFocus={() => { if(isCovering) isCovering.value = true }} 
                onBlur={() => { if(isCovering) isCovering.value = false }} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
              <span style={styles.eyeIcon} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? "👁️" : "🙈"}
              </span>
            </div>

            {isSignUp && (
              <div style={{ marginBottom: '20px' }}>
                <input placeholder="Full Name" style={styles.input} onChange={e => setName(e.target.value)} required />
                <input placeholder="Phone (Optional)" style={styles.input} onChange={e => setPhone(e.target.value)} />
                
                <button type="button" onClick={() => setShowAddress(!showAddress)} style={styles.toggleBtn}>
                   {showAddress ? "▲ Hide Address Fields" : "▼ Add Shipping Address"}
                </button>

                {showAddress && (
                  <div style={styles.addressBox}>
                    <input placeholder="Address Line 1" style={styles.inputSmall} onChange={e => setAddressLine1(e.target.value)} />
                    
                    <select style={styles.select} onChange={(e) => setSelectedCountry(e.target.value)}>
                      <option value="">Select Country</option>
                      {Country.getAllCountries().map((c) => (
                        <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                      ))}
                    </select>

                    <select style={styles.select} disabled={!selectedCountry} onChange={(e) => setSelectedState(e.target.value)}>
                      <option value="">Select State/District</option>
                      {State.getStatesOfCountry(selectedCountry).map((s) => (
                        <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                      ))}
                    </select>

                    {City.getCitiesOfState(selectedCountry, selectedState).length > 0 ? (
                      <select style={styles.select} disabled={!selectedState} onChange={(e) => setCity(e.target.value)}>
                        <option value="">Select City</option>
                        {City.getCitiesOfState(selectedCountry, selectedState).map((c) => (
                          <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input placeholder="Enter City Manually" style={styles.inputSmall} disabled={!selectedState} onChange={(e) => setCity(e.target.value)} />
                    )}
                  </div>
                )}
              </div>
            )}

            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? "Loading..." : (isSignUp ? "Create Account" : "Login & Shop")}
            </button>
          </form>

          <p style={styles.toggle} onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? "Back to Login" : "New to Slipper Haven? Signup"}
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', height: '100vh', fontFamily: "'Inter', sans-serif", overflow: 'hidden' },
  leftSide: { flex: 1.2, backgroundColor: '#f8faff', display: 'flex', flexDirection: 'column', padding: '40px' },
  brand: { fontWeight: 'bold', fontSize: '20px', color: '#333' },
  riveBox: { width: '100%', height: '400px', margin: 'auto' },
  heroTextContent: { textAlign: 'center', marginBottom: '40px' },
  heroText: { fontSize: '2.2rem', fontWeight: '800', color: '#1a1a1a' },
  rightSide: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', overflowY: 'auto' },
  formCard: { width: '100%', maxWidth: '380px', padding: '40px 20px' },
  title: { fontSize: '28px', marginBottom: '10px', fontWeight: 'bold' },
  subtitle: { color: '#666', marginBottom: '30px' },
  input: { width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '15px', boxSizing: 'border-box' },
  passwordWrapper: { display: 'flex', alignItems: 'center', border: '1px solid #eee', borderRadius: '12px', paddingRight: '15px', marginBottom: '20px' },
  inputNoMargin: { width: '100%', padding: '15px', border: 'none', borderRadius: '12px', outline: 'none' },
  eyeIcon: { cursor: 'pointer', fontSize: '18px' },
  toggleBtn: { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: '600', marginBottom: '15px', display: 'block' },
  addressBox: { backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #f0f0f0' },
  inputSmall: { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' },
  select: { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' },
  submitBtn: { width: '100%', padding: '15px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
  toggle: { textAlign: 'center', marginTop: '20px', cursor: 'pointer', color: '#2563eb', fontWeight: '600' }
};