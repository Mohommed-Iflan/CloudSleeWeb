import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom'; 
import { Edit, Trash2, Plus, X, Save, ShieldAlert, Palette, Layers3, PlusCircle, ImagePlus } from 'lucide-react';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); 
  
  const navigate = useNavigate(); 
  const ADMIN_EMAIL = "mohommediflaan@gmail.com"; 

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== ADMIN_EMAIL) {
      setTimeout(() => navigate('/'), 2000);
    } else {
      setIsAdmin(true);
      await fetchProducts();
    }
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (!error) setProducts(data || []);
  };

  // --- DELETE LOGIC ---
  const handleDelete = async (id, name) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`);
    if (confirmDelete) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        alert("Error deleting product: " + error.message);
      } else {
        alert("Product deleted successfully.");
        fetchProducts();
      }
    }
  };

  // --- FORM LOGIC FOR EDITING ---
  const updateSize = (colorIndex, sizeIndex, field, value) => {
    const nextData = [...editingProduct.variant_data];
    nextData[colorIndex].sizes[sizeIndex][field] = value;
    setEditingProduct({ ...editingProduct, variant_data: nextData });
  };

  const addSize = (colorIndex) => {
    const nextData = [...editingProduct.variant_data];
    nextData[colorIndex].sizes.push({ size: '', price: '', stock: '' });
    setEditingProduct({ ...editingProduct, variant_data: nextData });
  };

  const addColor = () => {
    const nextData = editingProduct.variant_data ? [...editingProduct.variant_data] : [];
    nextData.push({ name: '', imageUrl: '', sizes: [{ size: '', price: '', stock: '' }] });
    setEditingProduct({ ...editingProduct, variant_data: nextData });
  };

  const updateMainImage = (index, value) => {
    const nextImages = [...editingProduct.main_images];
    nextImages[index] = value;
    setEditingProduct({ ...editingProduct, main_images: nextImages });
  };

  const handleUpdateSave = async (e) => {
    e.preventDefault();
    const { id, name, description, main_images, variant_data } = editingProduct;

    const { error } = await supabase
      .from('products')
      .update({ name, description, main_images, variant_data })
      .eq('id', id);

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("Product updated successfully!");
      setEditingProduct(null);
      fetchProducts();
    }
  };

  if (loading) return <div style={styles.loader}>VERIFYING ADMIN ACCESS...</div>;
  if (!isAdmin) return <div style={styles.loader}>ACCESS DENIED. REDIRECTING...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h2 style={styles.title}>INVENTORY MANAGEMENT</h2>
          <p style={{fontSize: '12px', color: '#666'}}>Total Products: {products.length}</p>
        </div>
        <button style={styles.addBtn} onClick={() => navigate('/admin/add-product')}>
          <Plus size={18}/> NEW PRODUCT
        </button>
      </header>

      <table style={styles.table}>
        <thead>
          <tr style={styles.tableHead}>
            <th style={styles.th}>THUMB</th>
            <th style={styles.th}>PRODUCT NAME</th>
            <th style={styles.th}>VARIANTS</th>
            <th style={styles.th}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {products.map(prod => (
            <tr key={prod.id} style={styles.tableRow}>
              <td><img src={prod.main_images?.[0]} style={styles.thumb} alt=""/></td>
              <td style={styles.nameCell}>{prod.name}</td>
              <td style={styles.variantCell}>
                {prod.variant_data?.map((v, i) => (
                  <span key={i} style={styles.tag}>{v.name}</span>
                ))}
              </td>
              <td>
                <button onClick={() => setEditingProduct(prod)} style={styles.actionBtn}><Edit size={16}/></button>
                <button onClick={() => handleDelete(prod.id, prod.name)} style={{...styles.actionBtn, color: '#ff4d4d'}}><Trash2 size={16}/></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* --- STRUCTURED EDIT MODAL --- */}
      {editingProduct && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={{margin: 0}}>EDITING: {editingProduct.name.toUpperCase()}</h3>
              <button onClick={() => setEditingProduct(null)} style={styles.closeBtn}><X /></button>
            </div>

            <form onSubmit={handleUpdateSave} style={styles.form}>
              {/* Basic Info */}
              <div style={styles.formSection}>
                <label style={styles.label}><Layers3 size={14}/> Product Name</label>
                <input 
                  style={styles.input} 
                  value={editingProduct.name} 
                  onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} 
                />
                <label style={styles.label}>Description</label>
                <textarea 
                  style={styles.textarea} 
                  value={editingProduct.description} 
                  onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} 
                />
              </div>

              {/* Gallery Images */}
              <div style={styles.formSection}>
                <label style={styles.label}><ImagePlus size={14}/> Main Gallery URLs (Max 3)</label>
                {editingProduct.main_images?.map((url, idx) => (
                  <input 
                    key={idx} 
                    style={styles.input} 
                    placeholder={`Image URL ${idx + 1}`}
                    value={url} 
                    onChange={e => updateMainImage(idx, e.target.value)} 
                  />
                ))}
              </div>

              {/* Variant Data (Color & Sizes) */}
              <div style={styles.formSection}>
                <label style={styles.label}><Palette size={14}/> Variants (Color & Stock Management)</label>
                {editingProduct.variant_data?.map((colorObj, cIdx) => (
                  <div key={cIdx} style={styles.variantCard}>
                    <div style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
                      <input 
                        style={styles.input} 
                        placeholder="Color Name" 
                        value={colorObj.name} 
                        onChange={e => {
                          const next = [...editingProduct.variant_data];
                          next[cIdx].name = e.target.value;
                          setEditingProduct({...editingProduct, variant_data: next});
                        }} 
                      />
                      <input 
                        style={styles.input} 
                        placeholder="Color Specific Image URL" 
                        value={colorObj.imageUrl} 
                        onChange={e => {
                          const next = [...editingProduct.variant_data];
                          next[cIdx].imageUrl = e.target.value;
                          setEditingProduct({...editingProduct, variant_data: next});
                        }} 
                      />
                    </div>
                    
                    <table style={styles.subTable}>
                      <thead>
                        <tr>
                          <th style={styles.subTh}>Size</th>
                          <th style={styles.subTh}>Price (LKR)</th>
                          <th style={styles.subTh}>Stock Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {colorObj.sizes.map((s, sIdx) => (
                          <tr key={sIdx}>
                            <td><input style={styles.smallInput} value={s.size} onChange={e => updateSize(cIdx, sIdx, 'size', e.target.value)} /></td>
                            <td><input style={styles.smallInput} type="number" value={s.price} onChange={e => updateSize(cIdx, sIdx, 'price', e.target.value)} /></td>
                            <td><input style={styles.smallInput} type="number" value={s.stock} onChange={e => updateSize(cIdx, sIdx, 'stock', e.target.value)} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button type="button" onClick={() => addSize(cIdx)} style={styles.addSmallBtn}>+ Add Another Size</button>
                  </div>
                ))}
                <button type="button" onClick={addColor} style={styles.addVariantBtn}>+ Add New Color Group</button>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setEditingProduct(null)} style={styles.cancelBtn}>CANCEL</button>
                <button type="submit" style={styles.saveBtn}>SAVE PRODUCT UPDATES</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '40px', maxWidth: '1200px', margin: 'auto', fontFamily: 'Inter, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  title: { fontWeight: '900', letterSpacing: '1px', margin: 0 },
  addBtn: { backgroundColor: '#000', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' },
  tableHead: { backgroundColor: '#f8f9fa', textAlign: 'left', fontSize: '11px', color: '#888', textTransform: 'uppercase' },
  th: { padding: '15px' },
  tableRow: { borderBottom: '1px solid #eee', transition: 'background 0.2s' },
  thumb: { width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', margin: '10px' },
  nameCell: { fontWeight: '700', fontSize: '14px' },
  variantCell: { display: 'flex', flexWrap: 'wrap', gap: '5px' },
  tag: { fontSize: '10px', background: '#f0f0f0', color: '#555', padding: '4px 10px', borderRadius: '20px', fontWeight: '600' },
  actionBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '10px', color: '#333' },
  
  // Modal & Form Styles
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal: { background: '#fff', padding: '30px', borderRadius: '16px', width: '800px', maxHeight: '85vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: '25px' },
  formSection: { paddingBottom: '10px' },
  label: { fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#444' },
  input: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' },
  smallInput: { width: '100%', padding: '8px', border: '1px solid #eee', borderRadius: '4px', fontSize: '12px' },
  textarea: { width: '100%', padding: '12px', height: '100px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', resize: 'none', boxSizing: 'border-box' },
  variantCard: { background: '#fcfcfc', border: '1px solid #f0f0f0', padding: '20px', borderRadius: '12px', marginBottom: '15px' },
  subTable: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  subTh: { textAlign: 'left', fontSize: '10px', color: '#999', paddingBottom: '8px' },
  addSmallBtn: { border: 'none', background: 'none', color: '#007aff', fontSize: '11px', fontWeight: '700', cursor: 'pointer', marginTop: '10px' },
  addVariantBtn: { width: '100%', padding: '15px', border: '2px dashed #ddd', color: '#666', background: 'none', cursor: 'pointer', borderRadius: '12px', fontWeight: '600' },
  modalFooter: { display: 'flex', gap: '15px', marginTop: '20px' },
  cancelBtn: { flex: 1, padding: '15px', border: '1px solid #ddd', background: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' },
  saveBtn: { flex: 2, backgroundColor: '#000', color: '#fff', padding: '15px', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' },
  loader: { textAlign: 'center', padding: '100px', fontSize: '14px', fontWeight: '700', color: '#666' }
};