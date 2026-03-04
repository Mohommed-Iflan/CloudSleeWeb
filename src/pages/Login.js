import React, { useState, useEffect } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { Country, State, City } from 'country-state-city';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const navigate = useNavigate();

  // Listen for screen size changes
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    <div style={{...styles.container, flexDirection: isMobile ? 'column' : 'row'}} onMouseMove={handleMouseMove}>
      
      {/* LEFT SIDE (Animation/Hero) - Shrunken on Mobile */}
      <div style={{...styles.leftSide, padding: isMobile ? '20px' : '40px', flex: isMobile ? 'none' : 1.2}}>
        <div style={styles.heroTextContent}>
          <h2 style={{...styles.heroText, fontSize: isMobile ? '1.5rem' : '2.2rem'}}>
            Comfort to your foot,<br/>Feel free to your Heart.
          </h2>
        </div>
      </div>

      {/* RIGHT SIDE (Form) - Fully Scrollable */}
      <div style={{...styles.rightSide, padding: isMobile ? '20px 10px' : '0'}}>
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
                   {showAddress ? "▲ Hide Address" : "▼ Add Shipping Address"}
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
                      <option value="">Select State</option>
                      {State.getStatesOfCountry(selectedCountry).map((s) => (
                        <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                      ))}
                    </select>

                    <select style={styles.select} disabled={!selectedState} onChange={(e) => setCity(e.target.value)}>
                      <option value="">Select City</option>
                      {City.getCitiesOfState(selectedCountry, selectedState).map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? "Loading..." : (isSignUp ? "Create Account" : "Login & Shop")}
            </button>
          </form>

          <p style={styles.toggle} onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? "Already have an account? Login" : "New to Slipper Haven? Signup"}
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif", backgroundColor: '#fff' },
  leftSide: { backgroundColor: '#f8faff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  brand: { fontWeight: 'bold', fontSize: '20px', color: '#333', alignSelf: 'flex-start', marginBottom: '20px' },
  riveBox: { width: '100%', maxWidth: '400px', margin: '0 auto' },
  heroTextContent: { textAlign: 'center', marginTop: '20px' },
  heroText: { fontWeight: '800', color: '#1a1a1a', lineHeight: 1.2 },
  rightSide: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', backgroundColor: '#fff' },
  formCard: { width: '100%', maxWidth: '380px', padding: '40px 20px' },
  title: { fontSize: '28px', marginBottom: '10px', fontWeight: 'bold' },
  subtitle: { color: '#666', marginBottom: '30px' },
  input: { width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '15px', boxSizing: 'border-box', fontSize: '16px' },
  passwordWrapper: { display: 'flex', alignItems: 'center', border: '1px solid #eee', borderRadius: '12px', paddingRight: '15px', marginBottom: '20px' },
  inputNoMargin: { width: '100%', padding: '15px', border: 'none', borderRadius: '12px', outline: 'none', fontSize: '16px' },
  eyeIcon: { cursor: 'pointer', fontSize: '18px' },
  toggleBtn: { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: '600', marginBottom: '15px', display: 'block' },
  addressBox: { backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #f0f0f0' },
  inputSmall: { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: '#fff' },
  submitBtn: { width: '100%', padding: '15px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' },
  toggle: { textAlign: 'center', marginTop: '20px', cursor: 'pointer', color: '#2563eb', fontWeight: '600' }
};