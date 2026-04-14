import React from 'react';

const ContactUs = () => {
  return (
    <div style={styles.pageWrapper}>
      <div style={styles.container}>
        {/* Header Section */}
        <div style={styles.header}>
          <h1 style={styles.title}>Contact Us</h1>
          <p style={styles.subtitle}>
            Have a question about your order or our products? We're here to help you.
          </p>
        </div>

        <div style={styles.contentGrid}>
          {/* Left Side: Contact Information */}
          <div style={styles.infoColumn}>
            <div style={styles.infoCard}>
              <h2 style={styles.infoTitle}>Get In Touch</h2>
              
              {/* Phone */}
              <div style={styles.contactItem}>
                <div style={styles.iconCircle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00bee1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </div>
                <div>
                  <p style={styles.label}>Phone</p>
                  <p style={styles.value}>+94 72 637 5288</p>
                </div>
              </div>

              {/* Email */}
              <div style={styles.contactItem}>
                <div style={styles.iconCircle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00bee1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                </div>
                <div>
                  <p style={styles.label}>Email</p>
                  <p style={styles.value}>support@cloudslee.shop</p>
                </div>
              </div>

              {/* Address */}
              <div style={styles.contactItem}>
                <div style={styles.iconCircle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00bee1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                </div>
                <div>
                  <p style={styles.label}>Store Location</p>
                  <p style={styles.value}>130, Piriwena Road, Dehiowita, Sri Lanka.</p>
                </div>
              </div>
            </div>

            {/* Islandwide Banner */}
            <div style={styles.shippingBanner}>
              <span style={{ fontSize: '24px' }}>🚚</span>
              <p style={styles.shippingText}>Islandwide Delivery Available Across Sri Lanka</p>
            </div>
          </div>

          {/* Right Side: Business Hours & WhatsApp */}
          <div style={styles.formColumn}>
            <h2 style={styles.formTitle}>Business Hours</h2>
            <p style={styles.text}>Our team is available to assist you during the following times:</p>
            <ul style={styles.hoursList}>
              <li style={styles.hourItem}><span>Monday - Friday:</span> <span>9:00 AM - 8:00 PM</span></li>
              <li style={styles.hourItem}><span>Saturday:</span> <span>10:00 AM - 6:00 PM</span></li>
              <li style={styles.hourItem}><span>Sunday:</span> <span>Closed</span></li>
            </ul>
            
            <div style={styles.whatsappCard}>
              <h3 style={styles.waTitle}>Need Instant Help?</h3>
              <p style={styles.waText}>Chat with us on WhatsApp for faster responses regarding orders or sizes.</p>
              <a 
                href="https://wa.me/message/HICDYL3OHH2YA1" 
                target="_blank" 
                rel="noreferrer" 
                style={styles.waButton}
              >
                Message on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageWrapper: { 
    backgroundColor: '#f4f7f8', 
    padding: '60px 20px', 
    minHeight: '100vh', 
    fontFamily: '"Inter", sans-serif' 
  },
  container: { maxWidth: '1000px', margin: '0 auto' },
  header: { textAlign: 'center', marginBottom: '50px' },
  title: { fontSize: '36px', fontWeight: '800', color: '#111', marginBottom: '10px' },
  subtitle: { fontSize: '16px', color: '#666', maxWidth: '600px', margin: '0 auto' },
  contentGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
    gap: '30px' 
  },
  infoColumn: { display: 'flex', flexDirection: 'column', gap: '20px' },
  infoCard: { 
    backgroundColor: '#fff', 
    padding: '40px', 
    borderRadius: '15px', 
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)' 
  },
  infoTitle: { fontSize: '22px', fontWeight: '700', marginBottom: '30px', color: '#111' },
  contactItem: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '25px' },
  iconCircle: { 
    width: '45px', 
    height: '45px', 
    borderRadius: '50%', 
    backgroundColor: '#e6f9fc', 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  label: { fontSize: '11px', color: '#999', textTransform: 'uppercase', margin: 0, fontWeight: '700', letterSpacing: '1px' },
  value: { fontSize: '15px', color: '#333', margin: '2px 0 0 0', fontWeight: '500' },
  shippingBanner: { 
    backgroundColor: '#00bee1', 
    color: '#fff', 
    padding: '20px', 
    borderRadius: '12px', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '15px' 
  },
  shippingText: { fontSize: '14px', fontWeight: '600', margin: 0 },
  formColumn: { 
    backgroundColor: '#fff', 
    padding: '40px', 
    borderRadius: '15px', 
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column'
  },
  formTitle: { fontSize: '22px', fontWeight: '700', marginBottom: '20px' },
  text: { fontSize: '14px', color: '#666', lineHeight: '1.6' },
  hoursList: { listStyle: 'none', padding: 0, margin: '20px 0' },
  hourItem: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    fontSize: '14px', 
    padding: '12px 0', 
    borderBottom: '1px solid #eee', 
    color: '#444' 
  },
  whatsappCard: { 
    marginTop: 'auto', 
    padding: '25px', 
    backgroundColor: '#f0fff4', 
    borderRadius: '12px', 
    border: '1px solid #c6f6d5',
    textAlign: 'center'
  },
  waTitle: { fontSize: '17px', fontWeight: '700', color: '#2f855a', margin: '0 0 10px 0' },
  waText: { fontSize: '13px', color: '#48bb78', margin: '0 0 20px 0', lineHeight: '1.5' },
  waButton: { 
    display: 'inline-block', 
    backgroundColor: '#25d366', 
    color: '#fff', 
    padding: '12px 24px', 
    borderRadius: '8px', 
    textDecoration: 'none', 
    fontSize: '14px', 
    fontWeight: '700',
    transition: 'background 0.3s'
  }
};

export default ContactUs;