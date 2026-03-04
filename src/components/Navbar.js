import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
// Import professional icons
import { 
  Search, 
  ShoppingCart, 
  ShoppingBag, 
  User, 
  LogOut, 
  LayoutDashboard, 
  PlusSquare, 
  ClipboardList 
} from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const ADMIN_EMAIL = "mohommediflaan@gmail.com";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${searchQuery.toLowerCase()}`);
      setSearchQuery(""); 
    }
  };

  return (
    <nav style={styles.nav}>
      {/* LOGO IMAGE SECTION */}
      <div style={styles.logoWrapper} onClick={() => navigate('/')}>
        <img 
          src="/logo.png" 
          alt="SLIPPER HAVEN" 
          style={styles.logoImg} 
        />
      </div>

      {/* SEARCH BAR */}
      <form onSubmit={handleSearch} style={styles.searchForm}>
        <input 
          type="text" 
          placeholder="Search items..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
        <button type="submit" style={styles.searchBtn}>
          <Search size={18} color="#666" />
        </button>
      </form>
      
      {/* RIGHT SIDE MENU */}
      <div style={styles.navRight}>
        <div style={styles.navItem} onClick={() => navigate('/all-products')}>
          <ShoppingBag size={20} />
          <span style={{ marginLeft: '5px' }}>ALL PRODUCTS</span>
        </div>

        <div style={styles.navItem} onClick={() => navigate('/cart')}>
          <ShoppingCart size={20} />
          <span style={{ marginLeft: '5px' }}>CART</span>
        </div>
        
        {user ? (
          <div 
            style={styles.dropdownWrapper} 
            onMouseEnter={() => setShowDropdown(true)} 
            onMouseLeave={() => setShowDropdown(false)}
          >
            <button style={styles.accountBtn}>
              <User size={20} style={{ marginRight: '5px' }} />
              MY ACCOUNT
            </button>

            {showDropdown && (
              <div style={styles.dropdownContent}>
                {user?.email === ADMIN_EMAIL && (
                  <>
                    <div style={styles.adminHeader}>ADMIN TOOLS</div>
                    <Link to="/admin" style={styles.dropdownLink}>
                      <LayoutDashboard size={14} style={styles.icon} /> MANAGE INVENTORY
                    </Link>
                    <Link to="/admin/add-product" style={styles.dropdownLink}>
                      <PlusSquare size={14} style={styles.icon} /> ADD PRODUCT
                    </Link>
                    <Link to="/admin/orders" style={styles.dropdownLink}>
                      <ClipboardList size={14} style={styles.icon} /> VIEW ORDERS
                    </Link>
                    <hr style={styles.divider} />
                  </>
                )}

                <Link to="/my-orders" style={styles.dropdownLink}>MY ORDERS</Link>
                <Link to="/settings" style={styles.dropdownLink}>SETTINGS</Link>
                <hr style={styles.divider} />
                <button onClick={() => supabase.auth.signOut()} style={styles.logoutBtn}>
                  <LogOut size={14} style={{ marginRight: '8px' }} />
                  LOGOUT
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" style={styles.loginLink}>SIGN IN</Link>
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '0 5%', 
    borderBottom: '1px solid #eee', 
    position: 'sticky', 
    top: 0, 
    backgroundColor: '#fff', 
    zIndex: 1000,
    height: '80px' // Fixed height for the navbar
  },
  logoWrapper: { 
    display: 'flex', 
    alignItems: 'center', 
    cursor: 'pointer',
    height: '100%',
    flexShrink: 0
  },
  logoImg: { 
    height: '70px', // Forces the logo to stay at this height
    width: 'auto', 
    objectFit: 'contain',
    display: 'block'
  },
  searchForm: { 
    display: 'flex', 
    flex: 1, 
    maxWidth: '350px', 
    margin: '0 20px', 
    position: 'relative' 
  },
  searchInput: { 
    width: '100%', 
    padding: '10px 45px 10px 15px', 
    borderRadius: '20px', // Rounder look for modern UI
    border: '1px solid #e0e0e0', 
    outline: 'none', 
    fontSize: '13px', 
    backgroundColor: '#f8f8f8' 
  },
  searchBtn: { 
    position: 'absolute', 
    right: '15px', 
    top: '50%', 
    transform: 'translateY(-50%)', 
    background: 'none', 
    border: 'none', 
    cursor: 'pointer'
  },
  navRight: { display: 'flex', gap: '20px', alignItems: 'center' },
  navItem: { 
    display: 'flex', 
    alignItems: 'center', 
    fontSize: '11px', 
    fontWeight: '700', 
    cursor: 'pointer', 
    letterSpacing: '0.5px',
    color: '#333'
  },
  loginLink: { 
    textDecoration: 'none', 
    color: '#000', 
    fontWeight: '800', 
    border: '1px solid #000', 
    padding: '8px 18px', 
    fontSize: '11px' 
  },
  dropdownWrapper: { position: 'relative', height: '100%', display: 'flex', alignItems: 'center' },
  accountBtn: { 
    display: 'flex', 
    alignItems: 'center', 
    background: 'none', 
    border: 'none', 
    fontWeight: '700', 
    cursor: 'pointer', 
    fontSize: '11px' 
  },
  dropdownContent: { 
    position: 'absolute', 
    top: '100%', 
    right: 0, 
    backgroundColor: '#fff', 
    border: '1px solid #eee', 
    width: '200px', 
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  adminHeader: { fontSize: '9px', fontWeight: '800', color: '#999', padding: '10px 15px 5px 15px' },
  dropdownLink: { 
    padding: '12px 15px', 
    fontSize: '11px', 
    textDecoration: 'none', 
    color: '#333', 
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center'
  },
  icon: { marginRight: '10px', color: '#666' },
  divider: { margin: '5px 0', borderTop: '1px solid #f0f0f0', borderBottom: 'none' },
  logoutBtn: { 
    width: '100%',
    display: 'flex', 
    alignItems: 'center', 
    border: 'none', 
    padding: '12px 15px', 
    color: '#ff4d4d', 
    cursor: 'pointer', 
    background: 'none', 
    fontWeight: '700', 
    fontSize: '11px' 
  }
};