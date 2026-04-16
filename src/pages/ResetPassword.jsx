import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI Steps: 1 (Email/Send), 2 (OTP Input), 3 (New Password)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Timer & Attempt Logic
  const [timer, setTimer] = useState(0);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const savedEmail = sessionStorage.getItem('resetEmail');
    if (savedEmail) setEmail(savedEmail);

    // Sync attempts and timer from localStorage on mount
    const savedAttempts = parseInt(localStorage.getItem('otp_attempts') || '0');
    const lockoutTime = parseInt(localStorage.getItem('otp_lockout_until') || '0');
    
    setAttempts(savedAttempts);

    const now = Date.now();
    if (lockoutTime > now) {
      setTimer(Math.ceil((lockoutTime - now) / 1000));
    }
  }, []);

  // Timer countdown handler
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(prev => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const getWaitTime = (count) => {
    if (count === 1) return 60;          // 1 Minute
    if (count === 2) return 600;         // 10 Minutes
    if (count === 3) return 3600;        // 1 Hour
    return 2592000;                      // 1 Month (30 days in seconds)
  };

  const handleSendOTP = async () => {
    if (timer > 0) return;
    
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;

      // Handle Escalation Logic
      const newAttempts = attempts + 1;
      const waitSeconds = getWaitTime(newAttempts);
      const lockoutUntil = Date.now() + waitSeconds * 1000;

      setAttempts(newAttempts);
      setTimer(waitSeconds);
      localStorage.setItem('otp_attempts', newAttempts.toString());
      localStorage.setItem('otp_lockout_until', lockoutUntil.toString());

      if (newAttempts > 3) {
        setMessage({ type: 'error', text: 'Too many attempts. Please contact support team.' });
      } else {
        setStep(2);
        setMessage({ type: 'success', text: `OTP sent to ${email}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'recovery' });
      if (error) throw error;
      setStep(3);
      setMessage({ type: 'success', text: 'Verified! Set your new password.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setMessage({ type: 'error', text: 'Passwords match fail.' });
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      localStorage.removeItem('otp_attempts');
      localStorage.removeItem('otp_lockout_until');
      setMessage({ type: 'success', text: 'Success! Redirecting...' });
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (seconds > 86400) return `${Math.ceil(seconds / 86400)} days`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>CloudSlee</h2>
        <p style={styles.subtitle}>Password Recovery</p>

        {message.text && (
          <div style={{ ...styles.alert, backgroundColor: message.type === 'error' ? '#ffebee' : '#e8f5e9', color: message.type === 'error' ? '#c62828' : '#2e7d32' }}>
            {message.text}
          </div>
        )}

        {step === 1 && (
          <div style={styles.section}>
            <p style={styles.label}>Email Address</p>
            <div style={styles.emailDisplay}>{email || 'No email provided'}</div>
            <button 
              onClick={handleSendOTP} 
              disabled={loading || timer > 0 || attempts > 3} 
              style={attempts > 3 ? styles.disabledBtn : styles.button}
            >
              {loading ? 'Sending...' : timer > 0 ? `Wait ${formatTime(timer)}` : 'SEND OTP'}
            </button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOTP} style={styles.form}>
            <input type="text" placeholder="6-Digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} style={styles.input} maxLength="6" required />
            <button type="submit" disabled={loading} style={styles.button}>VERIFY CODE</button>
            <button 
              type="button" 
              onClick={handleSendOTP} 
              disabled={timer > 0 || attempts > 3} 
              style={styles.resendBtn}
            >
              {timer > 0 ? `Resend in ${formatTime(timer)}` : 'Resend OTP'}
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleUpdatePassword} style={styles.form}>
            <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={styles.input} required />
            <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={styles.input} required />
            <button type="submit" disabled={loading} style={styles.button}>UPDATE PASSWORD</button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#fafafa', padding: '20px' },
  card: { backgroundColor: '#fff', padding: '40px', borderRadius: '20px', boxShadow: '0 15px 35px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px', textAlign: 'center' },
  title: { fontSize: '24px', fontWeight: '800', letterSpacing: '2px', marginBottom: '5px' },
  subtitle: { fontSize: '12px', color: '#888', textTransform: 'uppercase', marginBottom: '30px', letterSpacing: '1px' },
  emailDisplay: { padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', color: '#555', border: '1px solid #eee' },
  label: { fontSize: '11px', fontWeight: '700', color: '#aaa', textAlign: 'left', textTransform: 'uppercase', marginBottom: '5px' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px', outline: 'none' },
  button: { padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#000', color: '#fff', fontWeight: '700', cursor: 'pointer' },
  resendBtn: { background: 'none', border: 'none', color: '#00bee1', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginTop: '10px' },
  disabledBtn: { padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#eee', color: '#aaa', cursor: 'not-allowed' },
  alert: { padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }
};