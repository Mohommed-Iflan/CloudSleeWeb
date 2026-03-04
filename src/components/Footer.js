import React from 'react';
import { useNavigate } from 'react-router-dom';

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer style={styles.footerContainer}>
      <div style={styles.footerGrid}>
        {/* Column 1: Brand/About */}
        <div style={styles.footerColumn}>
          <h3 style={styles.footerHeading}>OUR STORE</h3>
          <p style={styles.footerText}>
            The premium destination for quality fashion in Sri Lanka. 
            Experience islandwide delivery and secure payments.
          </p>
        </div>

        {/* Column 2: Navigation */}
        <div style={styles.footerColumn}>
          <h3 style={styles.footerHeading}>QUICK LINKS</h3>
          <ul style={styles.footerList}>
            <li style={styles.footerListItem} onClick={() => navigate('/')}>Home</li>
            <li style={styles.footerListItem} onClick={() => navigate('/all-products')}>All Products</li>
            <li style={styles.footerListItem} onClick={() => navigate('/contact')}>Contact Us</li>
            <li style={styles.footerListItem}>Privacy Policy</li>
          </ul>
        </div>

        {/* Column 3: Contact */}
        <div style={styles.footerColumn}>
          <h3 style={styles.footerHeading}>CONTACT US</h3>
          <div style={styles.contactItem}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00bee1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            <span style={styles.footerText}>+94 726375288</span>
          </div>
          <div style={styles.contactItem}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00bee1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span style={styles.footerText}>130, Piriwena Road, <br></br>Dehiowita.</span>
          </div>
        </div>

        {/* Column 4: Socials */}
        <div style={styles.footerColumn}>
          <h3 style={styles.footerHeading}>FOLLOW US</h3>
          <div style={styles.socialRow}>
            <a href="https://www.facebook.com/share/1AuEMU5gz1/" target="_blank" rel="noreferrer" style={styles.socialIcon}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" alt="FB" style={{width: '24px'}} />
            </a>
            <a href="https://www.instagram.com/cloud_slee?igsh=MXZtOGdyaGhsZWVoaw==" target="_blank" rel="noreferrer" style={styles.socialIcon}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg" alt="IG" style={{width: '24px'}} />
            </a>
            <a href="https://wa.me/message/HICDYL3OHH2YA1" target="_blank" rel="noreferrer" style={styles.socialIcon}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WA" style={{width: '24px'}} />
            </a>
            <a href="https://www.daraz.lk/shop/tleezv9c/" target="_blank" rel="noreferrer" style={styles.socialIcon}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Daraz_Logo.png/640px-Daraz_Logo.png" alt="WA" style={{width: '24px'}} />
            </a>
          </div>
        </div>
      </div>

      <div style={styles.copyrightBar}>
        <p>© 2026 CloudSlee. All Rights Reserved.</p>
      </div>
    </footer>
  );
};

const styles = {
  footerContainer: {
    backgroundColor: '#111',
    color: '#fff',
    padding: '60px 20px 20px 20px',
    marginTop: 'auto', // Pushes footer to bottom of page
    width: '100%',
    fontFamily: 'sans-serif'
  },
  footerGrid: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '40px',
    paddingBottom: '40px',
  },
  footerColumn: { display: 'flex', flexDirection: 'column', gap: '15px' },
  footerHeading: { fontSize: '15px', fontWeight: 'bold', letterSpacing: '1.5px', color: '#00bee1', marginBottom: '5px' },
  footerText: { fontSize: '14px', color: '#999', lineHeight: '1.6' },
  footerList: { listStyle: 'none', padding: 0, margin: 0 },
  footerListItem: { fontSize: '14px', color: '#999', marginBottom: '12px', cursor: 'pointer' },
  contactItem: { display: 'flex', alignItems: 'center', gap: '10px' },
  socialRow: { display: 'flex', gap: '15px', marginTop: '5px' },
  socialIcon: { 
    width: '40px', height: '40px', backgroundColor: '#222', borderRadius: '8px', 
    display: 'flex', justifyContent: 'center', alignItems: 'center' 
  },
  copyrightBar: { 
    borderTop: '1px solid #222', textAlign: 'center', paddingTop: '20px', 
    marginTop: '20px', fontSize: '12px', color: '#555' 
  }
};

export default Footer;