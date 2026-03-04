import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Success() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  // Extract orderId and initial items from navigation state
  const orderId = location.state?.orderId;
  const initialItems = location.state?.orderItems || [];

  useEffect(() => {
    const processInventory = async () => {
      // 1. Safety check: Don't run if no orderId or already processed
      if (hasProcessed.current || !orderId) {
        console.log("⏭️ Process skipped: Already processed or no Order ID.");
        return;
      }
      
      hasProcessed.current = true;
      let itemsToProcess = initialItems;

      // 2. FALLBACK: If items are missing from state, fetch them from DB
      if (itemsToProcess.length === 0) {
        console.log("🔍 State empty. Fetching items from database for Order:", orderId);
        const { data: order, error: fetchError } = await supabase
          .from('orders')
          .select('items')
          .eq('id', orderId)
          .single();

        if (fetchError || !order) {
          console.error("❌ Could not retrieve order items from DB:", fetchError);
          return;
        }
        itemsToProcess = order.items || [];
      }

      console.log("🛒 Items to adjust stock for:", itemsToProcess);

      // 3. Loop through items and update stock
      for (const item of itemsToProcess) {
        // Use product_id (preferred) or id
        const pId = item.product_id || item.id;
        const pColor = item.selectedColor || item.selected_color || item.color;
        const pSize = item.selectedSize || item.selected_size || item.size;
        const pQty = item.quantity || 1;

        if (pId && pColor && pSize) {
          await decreaseStock(pId, pColor, pSize, pQty);
        } else {
          console.error("❌ Item skipped due to missing details:", item);
        }
      }
    };

    processInventory();
  }, [orderId, initialItems]);

  const decreaseStock = async (productId, color, size, quantity) => {
  try {
    // productId must be an Integer (19)
    // color must match "Pink" or "Black"
    // size must match "36", "37", etc.
    const { error } = await supabase.rpc('update_variant_stock', {
      p_product_id: parseInt(productId), 
      p_color_name: String(color).trim(),
      p_size_val: String(size).trim(),
      p_adjustment: -Math.abs(quantity)
    });
    
    if (error) {
      console.error(`❌ DB ERROR:`, error.message);
    } else {
      console.log(`✅ JSON STOCK UPDATED: Product ${productId} | ${color} | Size ${size}`);
    }
  } catch (err) {
    console.error("❌ RPC CALL FAILED:", err);
  }
};

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>🎉</div>
        <h1 style={styles.title}>Order Placed!</h1>
        <p style={styles.text}>Your comfort is on its way.</p>
        <p style={{fontSize: '12px', color: '#999', marginBottom: '20px'}}>Order ID: {orderId}</p>
        <button onClick={() => navigate('/')} style={styles.button}>Back to Shop</button>
      </div>
    </div>
  );
}

const styles = {
  container: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8faff', fontFamily: "'Inter', sans-serif" },
  card: { textAlign: 'center', backgroundColor: '#fff', padding: '50px', borderRadius: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', maxWidth: '400px' },
  icon: { fontSize: '60px', marginBottom: '10px' },
  title: { fontSize: '32px', fontWeight: '800', margin: '10px 0' },
  text: { color: '#666', marginBottom: '10px' },
  button: { padding: '15px 40px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', transition: '0.3s', width: '100%' }
};