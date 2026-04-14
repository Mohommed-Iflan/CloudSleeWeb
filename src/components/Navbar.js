import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// Import professional icons including Menu and X for mobile
import { 
  Search, 
  ShoppingCart, 
  ShoppingBag, 
  User, 
  LogOut, 
  LayoutDashboard, 
  PlusSquare, 
  ClipboardList,
  Menu,
  X 
} from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation(); // Hook to track current URL
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const ADMIN_EMAIL = "mohommediflaan@gmail.com";

  // Check if current page is the login page
  const isLoginPage = location.pathname === '/login';

  // Listen for screen size changes to toggle mobile logic
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      setIsMenuOpen(false); 
    }
  };

  const navTo = (path) => {
    navigate(path);
    setIsMenuOpen(false);
    setShowDropdown(false);
  };

  return (
    <nav style={styles.nav}>
      {/* LOGO SECTION */}
      <div style={styles.logoWrapper} onClick={() => navTo('/')}>
        <img 
          src="/logo.png" 
          alt="SLIPPER HAVEN" 
          style={styles.logoImg} 
        />
      </div>

      {/* MOBILE HAMBURGER ICON */}
      <div style={styles.mobileToggle} onClick={() => setIsMenuOpen(!isMenuOpen)}>
        {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
      </div>

      {/* NAV CONTENT (Search + Links) */}
      <div style={{
        ...styles.navContent,
        display: isMenuOpen ? 'flex' : (isMobile ? 'none' : 'flex')
      }}>
        
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
          <div style={styles.navItem} onClick={() => navTo('/all-products')}>
            <ShoppingBag size={20} />
            <span style={styles.navText}>ALL PRODUCTS</span>
          </div>

          <div style={styles.navItem} onClick={() => navTo('/cart')}>
            <ShoppingCart size={20} />
            <span style={styles.navText}>CART</span>
          </div>
          
          {/* LOGIC FIX: Check user existence AND that we are not currently on the login page */}
          {user && !isLoginPage ? (
            <div 
              style={styles.dropdownWrapper} 
              // Toggle on click for mobile, hover for desktop
              onClick={() => isMobile && setShowDropdown(!showDropdown)}
              onMouseEnter={() => !isMobile && setShowDropdown(true)} 
              onMouseLeave={() => !isMobile && setShowDropdown(false)}
            >
              <button style={styles.accountBtn}>
                <User size={20} style={{ marginRight: '5px' }} />
                <span style={styles.navText}>MY ACCOUNT</span>
              </button>

              {showDropdown && (
                <div style={{
                  ...styles.dropdownContent,
                  position: isMobile ? 'static' : 'absolute',
                  width: isMobile ? '100%' : '200px',
                  boxShadow: isMobile ? 'none' : styles.dropdownContent.boxShadow
                }}>
                  {user?.email === ADMIN_EMAIL && (
                    <>
                      <div style={styles.adminHeader}>ADMIN TOOLS</div>
                      <Link to="/admin" style={styles.dropdownLink} onClick={() => setIsMenuOpen(false)}>
                        <LayoutDashboard size={14} style={styles.icon} /> MANAGE INVENTORY
                      </Link>
                      <Link to="/admin/add-product" style={styles.dropdownLink} onClick={() => setIsMenuOpen(false)}>
                        <PlusSquare size={14} style={styles.icon} /> ADD PRODUCT
                      </Link>
                      <Link to="/admin/orders" style={styles.dropdownLink} onClick={() => setIsMenuOpen(false)}>
                        <ClipboardList size={14} style={styles.icon} /> VIEW ORDERS
                      </Link>
                      <hr style={styles.divider} />
                    </>
                  )}

                  <Link to="/my-orders" style={styles.dropdownLink} onClick={() => setIsMenuOpen(false)}>MY ORDERS</Link>
                  <Link to="/settings" style={styles.dropdownLink} onClick={() => setIsMenuOpen(false)}>SETTINGS</Link>
                  <hr style={styles.divider} />
                  <button onClick={() => { supabase.auth.signOut(); setIsMenuOpen(false); }} style={styles.logoutBtn}>
                    <LogOut size={14} style={{ marginRight: '8px' }} />
                    LOGOUT
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" style={styles.loginLink} onClick={() => setIsMenuOpen(false)}>SIGN IN</Link>
          )}
        </div>
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
    height: '80px' 
  },
  logoWrapper: { 
    display: 'flex', 
    alignItems: 'center', 
    cursor: 'pointer',
    height: '100%',
    flexShrink: 0,
    zIndex: 1001
  },
  logoImg: { 
    height: '60px', 
    width: 'auto', 
    objectFit: 'contain',
    display: 'block'
  },
  mobileToggle: {
    display: window.innerWidth <= 768 ? 'block' : 'none',
    cursor: 'pointer',
    zIndex: 1001
  },
  navContent: {
    display: 'flex',
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    ...(window.innerWidth <= 768 && {
      position: 'absolute',
      top: '80px',
      left: 0,
      width: '100%',
      backgroundColor: '#fff',
      flexDirection: 'column',
      padding: '20px 0',
      boxShadow: '0 10px 15px rgba(0,0,0,0.05)',
      gap: '20px',
      borderTop: '1px solid #eee',
      maxHeight: '80vh',
      overflowY: 'auto'
    })
  },
  searchForm: { 
    display: 'flex', 
    flex: 1, 
    maxWidth: '350px', 
    margin: '0 20px', 
    position: 'relative',
    ...(window.innerWidth <= 768 && { maxWidth: '90%', margin: '0 auto', flex: 'none' })
  },
  searchInput: { 
    width: '100%', 
    padding: '10px 45px 10px 15px', 
    borderRadius: '20px', 
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
    border: 'none'
  },
  navRight: { 
    display: 'flex', 
    gap: '20px', 
    alignItems: 'center',
    ...(window.innerWidth <= 768 && { flexDirection: 'column', width: '100%', gap: '10px' })
  },
  navItem: { 
    display: 'flex', 
    alignItems: 'center', 
    fontSize: '11px', 
    fontWeight: '700', 
    cursor: 'pointer', 
    letterSpacing: '0.5px',
    color: '#333'
  },
  navText: { marginLeft: '5px' },
  loginLink: { 
    textDecoration: 'none', 
    color: '#000', 
    fontWeight: '800', 
    border: '1px solid #000', 
    padding: '8px 18px', 
    fontSize: '11px' 
  },
  dropdownWrapper: { 
    position: 'relative', 
    height: '100%', 
    display: 'flex', 
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer'
  },
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
    overflow: 'hidden',
    zIndex: 1002
  },
  adminHeader: { fontSize: '9px', fontWeight: '800', color: '#999', padding: '10px 15px 5px 15px' },
  dropdownLink: { 
    padding: '12px 15px', 
    fontSize: '11px', 
    textDecoration: 'none', 
    color: '#333', 
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    ...(window.innerWidth <= 768 && { justifyContent: 'center' })
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
    fontSize: '11px',
    ...(window.innerWidth <= 768 && { justifyContent: 'center' })
  }
};