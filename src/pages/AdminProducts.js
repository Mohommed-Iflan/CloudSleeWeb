import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom'; 
import { 
  Edit, Trash2, Plus, X, Save, ShieldCheck, Palette, Layers3, 
  PlusCircle, ImagePlus, Eye, Zap, Loader2, ArrowUp, ArrowDown, Upload, Users 
} from 'lucide-react';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); 
  const [uploadingMap, setUploadingMap] = useState({});
  
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

  const handleDelete = async (id, name) => {
    if (window.confirm(`Delete "${name}"?`)) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) fetchProducts();
    }
  };

  const uploadSingleFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data, error } = await supabase.functions.invoke('upload-product-image', { body: formData });
    if (error) throw error;
    return data.url;
  };

  const handleBulkUpload = async (files) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const startIndex = editingProduct.main_images.length;
    const newPlaceholders = fileArray.map(() => ''); 
    setEditingProduct(prev => ({ ...prev, main_images: [...prev.main_images, ...newPlaceholders] }));

    fileArray.forEach(async (file, i) => {
      const globalIndex = startIndex + i;
      const uploadId = `main-${globalIndex}`;
      setUploadingMap(prev => ({ ...prev, [uploadId]: true }));
      
      try {
        const url = await uploadSingleFile(file);
        setEditingProduct(prev => {
          const nextImages = [...prev.main_images];
          nextImages[globalIndex] = url;
          return { ...prev, main_images: nextImages };
        });
      } catch (err) {
        alert(`Failed: ${file.name}`);
        setEditingProduct(prev => ({
          ...prev, 
          main_images: prev.main_images.filter((_, idx) => idx !== globalIndex)
        }));
      } finally {
        setUploadingMap(prev => {
          const next = { ...prev };
          delete next[uploadId];
          return next;
        });
      }
    });
  };

  const handleVariantUpload = async (file, colorIndex) => {
    if (!file) return;
    const uploadId = `variant-${colorIndex}`;
    setUploadingMap(prev => ({ ...prev, [uploadId]: true }));
    try {
      const url = await uploadSingleFile(file);
      const nextData = [...editingProduct.variant_data];
      nextData[colorIndex].imageUrl = url;
      setEditingProduct({ ...editingProduct, variant_data: nextData });
    } catch (err) {
      alert(err.message);
    } finally {
      setUploadingMap(prev => {
        const next = { ...prev };
        delete next[uploadId];
        return next;
      });
    }
  };

  const startEditing = (prod) => {
    setEditingProduct({
      ...prod,
      gender: prod.gender || '', // Initialize gender from DB
      main_images: prod.main_images || [],
      variant_data: prod.variant_data ? JSON.parse(JSON.stringify(prod.variant_data)) : []
    });
  };

  const moveImage = (index, direction) => {
    const next = [...editingProduct.main_images];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setEditingProduct({ ...editingProduct, main_images: next });
  };

  const updateSize = (cIdx, sIdx, field, val) => {
    const next = [...editingProduct.variant_data];
    next[cIdx].sizes[sIdx][field] = val;
    setEditingProduct({ ...editingProduct, variant_data: next });
  };

  const bulkUpdate = (cIdx, field, val) => {
    const next = [...editingProduct.variant_data];
    next[cIdx].sizes = next[cIdx].sizes.map(s => ({ ...s, [field]: val }));
    setEditingProduct({ ...editingProduct, variant_data: next });
  };

  const handleUpdateSave = async (e) => {
    e.preventDefault();
    if (Object.keys(uploadingMap).length > 0) return alert("Still uploading...");
    
    const { error } = await supabase
      .from('products')
      .update({ 
        name: editingProduct.name, 
        description: editingProduct.description, 
        gender: editingProduct.gender, // Save gender to Supabase
        main_images: editingProduct.main_images.filter(u => u !== ''), 
        variant_data: editingProduct.variant_data 
      })
      .eq('id', editingProduct.id);

    if (!error) {
      alert("Updated!");
      setEditingProduct(null);
      fetchProducts();
    } else {
      alert("Error: " + error.message);
    }
  };

  if (loading) return <div style={styles.loader}>VERIFYING...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
           <ShieldCheck size={28} color="#f57224" />
           <h2 style={styles.title}>INVENTORY MANAGEMENT</h2>
        </div>
        <button style={styles.addBtn} onClick={() => navigate('/admin/add-product')}>
          <Plus size={18}/> NEW PRODUCT
        </button>
      </header>

      <table style={styles.tableMain}>
        <thead>
          <tr style={styles.tableHead}>
            <th style={styles.th}>THUMB</th>
            <th style={styles.th}>PRODUCT NAME</th>
            <th style={styles.th}>GENDER</th>
            <th style={styles.th}>VARIANTS</th>
            <th style={styles.th}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {products.map(prod => (
            <tr key={prod.id} style={styles.tableRow}>
              <td><img src={prod.main_images?.[0]} style={styles.thumb} alt=""/></td>
              <td style={styles.nameCell}>{prod.name}</td>
              <td style={{fontSize:'13px', color:'#666'}}>{prod.gender || 'N/A'}</td>
              <td style={styles.variantCell}>
                {prod.variant_data?.map((v, i) => (
                  <span key={i} style={styles.tag}>{v.name}</span>
                ))}
              </td>
              <td>
                <button onClick={() => startEditing(prod)} style={styles.actionBtn}><Edit size={16}/></button>
                <button onClick={() => handleDelete(prod.id, prod.name)} style={{...styles.actionBtn, color: '#ff4d4d'}}><Trash2 size={16}/></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editingProduct && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={{margin: 0}}>EDIT PRODUCT</h3>
              <button onClick={() => setEditingProduct(null)} style={styles.closeBtn}><X /></button>
            </div>

            <form onSubmit={handleUpdateSave} style={styles.form}>
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}><Layers3 size={18}/> Basic Information</h3>
                <input 
                  style={styles.input} 
                  value={editingProduct.name} 
                  placeholder="Product Name"
                  onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} 
                  required
                />

                {/* GENDER OPTION ADDED HERE */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={styles.label}><Users size={14} /> Category / Gender</label>
                  <select 
                    style={styles.select} 
                    value={editingProduct.gender} 
                    onChange={e => setEditingProduct({...editingProduct, gender: e.target.value})}
                    required
                  >
                    <option value="" disabled>Select Gender</option>
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Unisex">Unisex</option>
                    <option value="Kids">Kids</option>
                  </select>
                </div>

                <textarea 
                  style={styles.textarea} 
                  value={editingProduct.description} 
                  onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} 
                  required
                />
              </section>

              <section style={styles.section}>
                <h3 style={styles.sectionTitle}><ImagePlus size={18}/> Product Gallery</h3>
                <div style={styles.dropzone} onClick={() => document.getElementById('edit-bulk-file').click()}>
                  <Upload size={24} color="#1890ff" />
                  <p style={{margin: '10px 0 0', fontSize: '14px', color: '#666'}}>Add Images</p>
                  <input id="edit-bulk-file" type="file" multiple accept="image/*" hidden onChange={e => handleBulkUpload(e.target.files)} />
                </div>
                <div style={styles.imageGrid}>
                  {editingProduct.main_images.map((url, idx) => (
                    <div key={idx} style={styles.imageCard}>
                      <div style={styles.imageWrapper}>
                        {!url ? <Loader2 size={20} className="animate-spin" color="#1890ff" /> : <img src={url} style={styles.imagePreview} />}
                      </div>
                      <div style={styles.imageActions}>
                        <button type="button" onClick={() => moveImage(idx, 'up')} disabled={idx === 0} style={styles.iconBtn}><ArrowUp size={12}/></button>
                        <button type="button" onClick={() => moveImage(idx, 'down')} disabled={idx === editingProduct.main_images.length - 1} style={styles.iconBtn}><ArrowDown size={12}/></button>
                        <button type="button" onClick={() => setEditingProduct({...editingProduct, main_images: editingProduct.main_images.filter((_,i)=>i!==idx)})} style={styles.deleteIconBtn}><Trash2 size={12}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section style={styles.section}>
                <h3 style={styles.sectionTitle}><Palette size={18}/> Variants</h3>
                {editingProduct.variant_data.map((colorObj, cIdx) => (
                  <div key={cIdx} style={styles.variantCard}>
                    <div style={styles.variantTopRow}>
                      <input style={styles.variantInput} value={colorObj.name} onChange={e => {
                         const next = [...editingProduct.variant_data];
                         next[cIdx].name = e.target.value;
                         setEditingProduct({...editingProduct, variant_data: next});
                      }} />
                      <button type="button" onClick={() => setEditingProduct({...editingProduct, variant_data: editingProduct.variant_data.filter((_,i)=>i!==cIdx)})} style={styles.deleteBtn}><Trash2 size={14}/> Remove</button>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                      <div style={styles.variantPhotoUpload} onClick={() => document.getElementById(`edit-var-${cIdx}`).click()}>
                        {colorObj.imageUrl ? <img src={colorObj.imageUrl} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : (uploadingMap[`variant-${cIdx}`] ? <Loader2 className="animate-spin"/> : <ImagePlus size={18} color="#999"/>)}
                        <input id={`edit-var-${cIdx}`} type="file" accept="image/*" hidden onChange={e => handleVariantUpload(e.target.files[0], cIdx)} />
                      </div>
                      <div style={styles.bulkEditBar}>
                        <Zap size={14} color="#f57224" /><input type="number" placeholder="Price" style={styles.bulkInput} onChange={e => bulkUpdate(cIdx, 'price', e.target.value)} /><input type="number" placeholder="Stock" style={styles.bulkInput} onChange={e => bulkUpdate(cIdx, 'stock', e.target.value)} />
                      </div>
                    </div>

                    <table style={{width:'100%', borderCollapse:'collapse'}}>
                      <thead><tr><th>Size</th><th>Price</th><th>Stock</th><th></th></tr></thead>
                      <tbody>
                        {colorObj.sizes.map((s, sIdx) => (
                          <tr key={sIdx}>
                            <td><input style={styles.tableInput} value={s.size} onChange={e => updateSize(cIdx, sIdx, 'size', e.target.value)} /></td>
                            <td><input style={styles.tableInput} type="number" value={s.price} onChange={e => updateSize(cIdx, sIdx, 'price', e.target.value)} /></td>
                            <td><input style={styles.tableInput} type="number" value={s.stock} onChange={e => updateSize(cIdx, sIdx, 'stock', e.target.value)} /></td>
                            <td><button type="button" onClick={() => {
                               const next = [...editingProduct.variant_data];
                               next[cIdx].sizes = next[cIdx].sizes.filter((_,i)=>i!==sIdx);
                               setEditingProduct({...editingProduct, variant_data: next});
                            }} style={styles.deleteBtn}><Trash2 size={14}/></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button type="button" onClick={() => {
                      const next = [...editingProduct.variant_data];
                      next[cIdx].sizes.push({ size: '', price: '', stock: '' });
                      setEditingProduct({...editingProduct, variant_data: next});
                    }} style={styles.addSmallBtn}>+ Add Size</button>
                  </div>
                ))}
                <button type="button" onClick={() => setEditingProduct({...editingProduct, variant_data: [...editingProduct.variant_data, {name:'', imageUrl:'', sizes:[{size:'', price:'', stock:''}]}]})} style={styles.addMainBtn}>+ Add New Variant</button>
              </section>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setEditingProduct(null)} style={styles.cancelBtn}>CANCEL</button>
                <button type="submit" disabled={Object.keys(uploadingMap).length > 0} style={styles.saveBtn}>
                  {Object.keys(uploadingMap).length > 0 ? "Uploading..." : "SAVE CHANGES"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '40px 5%', maxWidth: '1200px', margin: 'auto', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f9f9f9' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  title: { fontSize: '20px', fontWeight: 'bold', color: '#333' },
  addBtn: { backgroundColor: '#000', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' },
  tableMain: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  tableHead: { backgroundColor: '#f8f9fa', textAlign: 'left', fontSize: '12px', color: '#888' },
  th: { padding: '15px' },
  tableRow: { borderBottom: '1px solid #eee' },
  thumb: { width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', margin: '10px' },
  nameCell: { fontWeight: '600', fontSize: '14px' },
  variantCell: { display: 'flex', flexWrap: 'wrap', gap: '5px' },
  tag: { fontSize: '10px', background: '#f0f0f0', padding: '4px 8px', borderRadius: '10px' },
  actionBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '8px' },
  
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' },
  modal: { background: '#f9f9f9', padding: '30px', borderRadius: '16px', width: '900px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer' },
  
  section: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '20px' },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 'bold', marginBottom: '15px', color: '#444' },
  label: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#666', marginBottom: '8px', fontWeight: '500' },
  input: { width: '100%', padding: '12px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' },
  select: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff', fontSize: '14px', outline: 'none' },
  textarea: { width: '100%', padding: '12px', height: '80px', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box', marginTop: '10px' },
  
  dropzone: { border: '2px dashed #1890ff', borderRadius: '12px', padding: '20px', textAlign: 'center', backgroundColor: '#f0f7ff', cursor: 'pointer', marginBottom: '15px' },
  imageGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' },
  imageCard: { border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' },
  imageWrapper: { height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' },
  imagePreview: { width: '100%', height: '100%', objectFit: 'cover' },
  imageActions: { display: 'flex', justifyContent: 'space-around', background: '#f0f0f0', padding: '2px' },
  
  variantCard: { border: '1px solid #eee', padding: '15px', borderRadius: '10px', marginBottom: '15px', backgroundColor: '#fff' },
  variantTopRow: { display: 'flex', gap: '10px', marginBottom: '10px' },
  variantInput: { flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '6px' },
  variantPhotoUpload: { width: '50px', height: '50px', border: '1px dashed #ccc', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  bulkEditBar: { display: 'flex', gap: '8px', alignItems: 'center', background: '#fff8f4', padding: '8px', borderRadius: '8px' },
  bulkInput: { padding: '5px', border: '1px solid #ddd', borderRadius: '4px', width: '80px', fontSize: '11px' },
  tableInput: { width: '100%', padding: '6px', border: '1px solid #eee', borderRadius: '4px' },
  
  deleteBtn: { background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' },
  addSmallBtn: { background: 'none', border: 'none', color: '#1890ff', cursor: 'pointer', fontSize: '12px', marginTop: '10px' },
  addMainBtn: { width: '100%', padding: '10px', border: '1px dashed #1890ff', color: '#1890ff', borderRadius: '8px', cursor: 'pointer' },
  
  modalFooter: { display: 'flex', gap: '10px', marginTop: '20px' },
  cancelBtn: { flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' },
  saveBtn: { flex: 2, background: '#f57224', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  loader: { textAlign: 'center', padding: '100px' }
};