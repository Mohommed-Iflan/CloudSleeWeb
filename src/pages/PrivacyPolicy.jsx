import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div style={styles.pageWrapper}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.mainTitle}>Privacy Policy for CloudSlee</h1>
          <p style={styles.date}>Effective Date: April 10, 2026</p>
        </header>

        <section style={styles.section}>
          <p style={styles.text}>
            At <strong>CloudSlee</strong>, accessible from <strong>cloudslee.shop</strong>, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by CloudSlee and how we use it.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.subHeading}>1. Information We Collect</h2>
          <p style={styles.text}>When you place an order or interact with our store, we collect the following information:</p>
          <ul style={styles.list}>
            <li><strong>Personal Information:</strong> Name, email address, phone number, and shipping address.</li>
            <li><strong>Order Details:</strong> Products purchased, size, color, and total amount.</li>
            <li><strong>Technical Data:</strong> IP address and browser type (collected automatically via our hosting and database providers).</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.subHeading}>2. How We Use Your Information</h2>
          <p style={styles.text}>We use the information we collect in various ways, including to:</p>
          <ul style={styles.list}>
            <li>Process and fulfill your orders (including shipping and delivery).</li>
            <li>Send order confirmations and status updates via email.</li>
            <li>Communicate with you regarding customer support or returns.</li>
            <li>Prevent fraudulent transactions.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.subHeading}>3. Data Storage and Third Parties</h2>
          <p style={styles.text}>To provide our services, we share necessary data with the following trusted partners:</p>
          <ul style={styles.list}>
            <li><strong>Supabase:</strong> Our database provider where your order information is securely stored.</li>
            <li><strong>Resend:</strong> Used to send automated transactional emails (receipts and shipping updates).</li>
            <li><strong>Payment Gateways:</strong> To process your payments securely (we do not store your full credit card details on our servers).</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.subHeading}>4. Cookies</h2>
          <p style={styles.text}>
            CloudSlee uses 'cookies' to enhance your shopping experience, such as remembering items in your cart. You can choose to disable cookies through your individual browser options.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.subHeading}>5. Your Rights</h2>
          <p style={styles.text}>
            You have the right to request access to the personal data we hold about you, or to request that we correct or delete your information. If you wish to exercise these rights, please contact us at <strong>support@cloudslee.shop</strong>.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.subHeading}>6. Security</h2>
          <p style={styles.text}>
            We take the security of your data seriously. We use industry-standard encryption and secure database protocols to protect your information from unauthorized access.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.subHeading}>7. Changes to This Policy</h2>
          <p style={styles.text}>
            We may update our Privacy Policy from time to time. We advise you to review this page periodically for any changes.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.subHeading}>8. Contact Us</h2>
          <p style={styles.text}>If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact us:</p>
          <ul style={styles.list}>
            <li><strong>Email:</strong> support@cloudslee.shop</li>
            <li><strong>Website:</strong> cloudslee.shop</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

const styles = {
  pageWrapper: {
    backgroundColor: '#f9f9f9',
    padding: '60px 20px',
    minHeight: '100vh',
    fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif',
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#fff',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  header: {
    borderBottom: '2px solid #f0f0f0',
    paddingBottom: '20px',
    marginBottom: '30px',
  },
  mainTitle: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#111',
    margin: '0 0 10px 0',
  },
  date: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  },
  section: {
    marginBottom: '30px',
  },
  subHeading: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#00bee1',
    marginBottom: '15px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  text: {
    fontSize: '15px',
    lineHeight: '1.7',
    color: '#444',
    margin: '0 0 10px 0',
  },
  list: {
    paddingLeft: '20px',
    fontSize: '15px',
    lineHeight: '1.8',
    color: '#444',
  }
};

export default PrivacyPolicy;