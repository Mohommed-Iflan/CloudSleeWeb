import React, { useState } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const navigate = useNavigate();

  const { rive, RiveComponent } = useRive({
    src: '/assets/login_animation.riv',
    stateMachines: "LoginMachine",
    autoplay: true,
  });

  const isCovering = useStateMachineInput(rive, "LoginMachine", "isCovering");

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) alert(error.message);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) alert(error.message);
    else alert("Reset link sent to your email.");
    setLoading(false);
  };

  const handleAuth = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      if (password !== confirmPassword) {
        alert("Passwords do not match.");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
          }
        }
      });
      if (error) alert(error.message);
      else alert("Registration successful. Check your email for verification.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert(error.message);
      } else {
        navigate('/');
      }
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <style>{responsiveCSS}</style>

      <section className='wrapper'>
        <div className='hero'></div>
        
        <div className='content'>
          <div className="main-layout" style={styles.mainLayout}>
            
            <div className="branding-section" style={styles.brandingSection}>
              <div style={styles.riveBox}>
                <RiveComponent style={{ height: '350px' }} />
              </div>
              <h2 style={styles.heroText}>
                Comfort to your foot,<br />Feel free to your Heart.
              </h2>
            </div>

            {/* Form Section */}
            <div className="form-section" style={styles.formSection}>
              <div style={styles.formCard}>
                <h2 style={styles.title}>
                  {isForgotPassword ? "Reset Password" : (isSignUp ? "Create Account" : "Secure Login")}
                </h2>
                
                {!isForgotPassword && (
                  <>
                    <button onClick={handleGoogleLogin} style={styles.googleBtn}>
                      <img 
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                        alt="" 
                        style={{ width: '18px', marginRight: '10px' }} 
                      />
                      Continue with Google
                    </button>
                    <div style={styles.divider}>
                      <span style={styles.dividerText}>OR</span>
                    </div>
                  </>
                )}

                <form onSubmit={isForgotPassword ? handleResetPassword : handleAuth}>
                  {isSignUp && !isForgotPassword && (
                    <>
                      <input 
                        placeholder="Full Name" 
                        style={styles.input} 
                        onChange={e => setFullName(e.target.value)} 
                        required 
                      />
                      <input 
                        placeholder="Phone Number (Optional)" 
                        style={styles.input} 
                        onChange={e => setPhone(e.target.value)} 
                      />
                    </>
                  )}

                  <input 
                    placeholder="Email Address" 
                    type="email" 
                    style={styles.input} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                  />

                  {!isForgotPassword && (
                    <>
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
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)} 
                          style={styles.eyeBtn}
                        >
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      </div>

                      {isSignUp && (
                        <input 
                          placeholder="Repeat Password" 
                          type="password" 
                          style={styles.input} 
                          onChange={e => setConfirmPassword(e.target.value)} 
                          required 
                        />
                      )}
                    </>
                  )}

                  {!isSignUp && !isForgotPassword && (
                    <div style={{ textAlign: 'right', marginBottom: '15px' }}>
                      <span 
                        style={styles.forgotText} 
                        onClick={() => setIsForgotPassword(true)}
                      >
                        Forgot password?
                      </span>
                    </div>
                  )}

                  <button type="submit" style={styles.submitBtn} disabled={loading}>
                    {loading ? "Processing..." : (isForgotPassword ? "Send Link" : (isSignUp ? "Register" : "Login"))}
                  </button>
                </form>

                <p style={styles.toggle} onClick={() => {
                  setIsSignUp(!isSignUp);
                  setIsForgotPassword(false);
                }}>
                  {isForgotPassword 
                    ? "Back to login" 
                    : (isSignUp ? "Already have an account? Login" : "New here? Create an account")}
                </p>
              </div>
            </div>
          </div>

          <div style={styles.bottomControls}>
            <input type='checkbox' id='switch' />
            <label htmlFor='switch' style={styles.switchLabel}>
              <span><span className='icon'>→</span> switch bg</span>
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}

// Updated CSS with Mobile-First or responsive logic
const responsiveCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400..700&display=swap');

  @keyframes smoothBg {
    from { background-position: 50% 50%, 50% 50%; }
    to { background-position: 350% 50%, 350% 50%; }
  }

  .wrapper {
    width: 100vw;
    height: 100vh;
    position: relative;
    overflow: hidden;
  }

  .hero {
    width: 100%;
    height: 100%;
    position: absolute;
    inset: 0;
    --stripe-color: #fff;
    --stripes: repeating-linear-gradient(100deg, var(--stripe-color) 0%, var(--stripe-color) 7%, transparent 10%, transparent 12%, var(--stripe-color) 16%);
    --rainbow: repeating-linear-gradient(100deg, #60a5fa 10%, #e879f9 15%, #60a5fa 20%, #5eead4 25%, #60a5fa 30%);
    background-image: var(--stripes), var(--rainbow);
    background-size: 300%, 200%;
    filter: blur(10px) invert(100%);
  }

  .hero::after {
    content: "";
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(100deg, #fff 0%, #fff 7%, transparent 10%, transparent 12%, #fff 16%), 
                      repeating-linear-gradient(100deg, #60a5fa 10%, #e879f9 15%, #60a5fa 20%, #5eead4 25%, #60a5fa 30%);
    background-size: 200%, 100%;
    animation: smoothBg 60s linear infinite;
    mix-blend-mode: difference;
  }

  .content {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    z-index: 2;
    overflow-y: auto; /* Allow scrolling on mobile */
  }

  /* MOBILE OVERRIDES */
  @media (max-width: 768px) {
    .main-layout {
      flex-direction: column-reverse !important; /* Form on top, Branding on bottom */
      padding: 40px 5% !important;
      justify-content: flex-start !important;
      height: auto !important;
    }
    
    .form-section {
      width: 100%;
      justify-content: center !important;
      margin-bottom: 40px;
    }

    .branding-section {
      padding-bottom: 40px !important;
      height: auto !important;
    }

    .rive-box {
      height: 250px !important;
    }

    h2 {
       font-size: 2rem !important;
    }
  }

  #switch { appearance: none; opacity: 0; position: absolute; }
  .icon { border: 1px dashed white; padding: 5px; margin-right: 5px; }
  
  :has(#switch:checked) .hero { filter: blur(10px) opacity(50%) saturate(200%); --stripe-color: #000; }
`;

const styles = {
  container: { width: '100vw', height: '100vh', overflow: 'hidden' },
  mainLayout: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    flex: 1,
    padding: '0 8%',
    width: '100%',
    boxSizing: 'border-box'
  },
  brandingSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    flex: 1,
    paddingBottom: '100px',
    justifyContent: 'center',
  },
  formSection: {
    display: 'flex',
    justifyContent: 'flex-end',
    flex: 1
  },
  riveBox: { width: '100%', maxWidth: '400px' },
  heroText: { 
    fontFamily: '"Dancing Script", cursive',
    fontWeight: '700', 
    color: '#000000',
    fontSize: '2.8rem',
    marginTop: '-40px',
    lineHeight: '1.2'
  },
  formCard: { 
    backgroundColor: 'rgba(255, 255, 255, 0.94)', 
    padding: '35px', 
    borderRadius: '28px', 
    boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
    width: '100%',
    maxWidth: '420px',
    backdropFilter: 'blur(15px)',
  },
  title: { fontSize: '26px', fontWeight: 'bold', marginBottom: '20px', color: '#1a1a1a', textAlign: 'center' },
  googleBtn: { 
    width: '100%', 
    padding: '12px', 
    borderRadius: '12px', 
    border: '1px solid #ddd', 
    backgroundColor: '#fff', 
    cursor: 'pointer', 
    fontSize: '14px', 
    fontWeight: '600', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: '15px'
  },
  divider: { 
    width: '100%', 
    textAlign: 'center', 
    borderBottom: '1px solid #eee', 
    lineHeight: '0.1em', 
    margin: '10px 0 20px' 
  },
  dividerText: { background: '#fff', padding: '0 10px', color: '#999', fontSize: '12px' },
  input: { width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #ddd', marginBottom: '14px', boxSizing: 'border-box', fontSize: '15px' },
  passwordWrapper: { 
    display: 'flex', 
    alignItems: 'center', 
    border: '1px solid #ddd', 
    borderRadius: '12px', 
    marginBottom: '14px', 
    overflow: 'hidden' 
  },
  inputNoMargin: { flex: 1, padding: '14px', border: 'none', outline: 'none', fontSize: '15px' },
  eyeBtn: { 
    padding: '0 15px', 
    backgroundColor: 'transparent', 
    border: 'none', 
    color: '#00bee1', 
    cursor: 'pointer', 
    fontWeight: '600', 
    fontSize: '12px' 
  },
  forgotText: { color: '#00bee1', fontSize: '13px', cursor: 'pointer', fontWeight: '500' },
  submitBtn: { width: '100%', padding: '16px', backgroundColor: '#00bee1', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' },
  toggle: { textAlign: 'center', marginTop: '20px', cursor: 'pointer', color: '#666', fontSize: '14px' },
  bottomControls: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px'
  },
  switchLabel: { color: 'white', cursor: 'pointer', mixBlendMode: 'difference', fontSize: '14px' }
};