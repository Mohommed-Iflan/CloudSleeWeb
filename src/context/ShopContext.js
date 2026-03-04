import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const ShopContext = createContext();

export const ShopProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [addresses, setAddresses] = useState([]);

  useEffect(() => {
    // Check for user on load
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        fetchCart(session.user.id);
        fetchAddresses(session.user.id);
      }
    };
    init();
  }, []);

  const fetchCart = async (userId) => {
    const { data } = await supabase.from('cart_items').select('*, products(*)').eq('user_id', userId);
    if (data) setCart(data);
  };

  const fetchAddresses = async (userId) => {
    const { data } = await supabase.from('user_addresses').select('*').eq('user_id', userId).order('is_default', { ascending: false });
    if (data) setAddresses(data);
  };

  return (
    <ShopContext.Provider value={{ cart, user, addresses, fetchCart, fetchAddresses }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => useContext(ShopContext);