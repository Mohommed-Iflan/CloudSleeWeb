import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Layers3, Palette, Trash2, PlusCircle, 
  ImagePlus, Eye, Zap, Loader2, ArrowUp, ArrowDown, Upload, Users 
} from 'lucide-react';

export default function AddSlipper() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingMap, setUploadingMap] = useState({});

  const ADMIN_EMAIL = "mohommediflaan@gmail.com";

  // Added 'gender' to the initial state
  const [product, setProduct] = useState({ name: '', description: '', tags: '', gender: '' });
  const [mainImages, setMainImages] = useState([]); 
  const [colors, setColors] = useState([
    { name: '', imageUrl: '', sizes: [{ size: '', price: '', stock: '' }] }
  ]);

  useEffect(() => {
    const verifyAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== ADMIN_EMAIL) {
        navigate('/');
      } else {
        setIsAdmin(true);
      }
    };
    verifyAdmin();
  }, [navigate]);

  const uploadSingleFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data, error } = await supabase.functions.invoke('upload-product-image', {
      body: formData,
    });
    if (error) throw error;
    return data.url;
  };

  const handleBulkUpload = async (files) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const startIndex = mainImages.length;
    const newPlaceholders = fileArray.map(() => ''); 
    setMainImages(prev => [...prev, ...newPlaceholders]);

    fileArray.forEach(async (file, i) => {
      const globalIndex = startIndex + i;
      const uploadId = `main-${globalIndex}`;
      setUploadingMap(prev => ({ ...prev, [uploadId]: true }));
      
      try {
        const url = await uploadSingleFile(file);
        setMainImages(prev => {
          const next = [...prev];
          next[globalIndex] = url;
          return next;
        });
      } catch (err) {
        alert(`Failed to upload ${file.name}: ${err.message}`);
        setMainImages(prev => prev.filter((_, idx) => idx !== globalIndex));
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
      const next = [...colors];
      next[colorIndex].imageUrl = url;
      setColors(next);
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

  const moveImage = (index, direction) => {
    const next = [...mainImages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setMainImages(next);
  };

  const removeMainImage = (index) => setMainImages(mainImages.filter((_, i) => i !== index));
  const addColor = () => setColors([...colors, { name: '', imageUrl: '', sizes: [{ size: '', price: '', stock: '' }] }]);
  const removeColor = (index) => {
    if (colors.length > 1) setColors(colors.filter((_, i) => i !== index));
    else alert("Minimum one variant required.");
  };

  const updateSize = (colorIndex, sizeIndex, field, value) => {
    const newColors = [...colors];
    newColors[colorIndex].sizes[sizeIndex][field] = value;
    setColors(newColors);
  };

  const bulkUpdate = (colorIndex, field, value) => {
    const newColors = [...colors];
    newColors[colorIndex].sizes = newColors[colorIndex].sizes.map(s => ({ ...s, [field]: value }));
    setColors(newColors);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (Object.keys(uploadingMap).length > 0) return alert("Please wait for images to finish uploading.");
    if (!product.gender) return alert("Please select a gender category.");
    
    setLoading(true);
    const formattedData = {
      name: product.name,
      description: product.description,
      tags: product.tags,
      gender: product.gender, // Included gender here
      main_images: mainImages.filter(url => url !== ''), 
      variant_data: colors 
    };

    const { error } = await supabase.from('products').insert([formattedData]);
    if (!error) {
      alert("Product published!");
      navigate('/');
    } else {
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  if (!isAdmin) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <ShieldCheck size={32} color="#f57224" />
        <h2 style={styles.title}>SELLER CENTER: ADD PRODUCT</h2>
      </div>

      <form onSubmit={handleSave} style={styles.form}>
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}><Layers3 size={18}/> Basic Information</h3>
          <input 
            style={styles.input} 
            placeholder="Product Name" 
            onChange={e => setProduct({...product, name: e.target.value})} 
            required 
          />
          
          {/* GENDER SELECTION DROPDOWN */}
          <div style={{ marginBottom: '15px' }}>
            <label style={styles.label}><Users size={14} /> Category / Gender</label>
            <select 
              style={styles.select} 
              value={product.gender} 
              onChange={e => setProduct({...product, gender: e.target.value})}
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
            placeholder="Description (HTML Supported)" 
            onChange={e => setProduct({...product, description: e.target.value})} 
            required 
          />
        </section>

        <section style={styles.section}>
          <h3 style={styles.sectionTitle}><ImagePlus size={18}/> Main Product Gallery</h3>
          <div style={styles.dropzone} onClick={() => document.getElementById('bulk-file').click()}>
            <Upload size={24} color="#1890ff" />
            <p style={{margin: '10px 0 0', fontSize: '14px', color: '#666'}}>Click to Upload Multiple Images</p>
            <input 
              id="bulk-file"
              type="file" 
              multiple 
              accept="image/*"
              hidden
              onChange={e => handleBulkUpload(e.target.files)} 
            />
          </div>

          <div style={styles.imageGrid}>
            {mainImages.map((url, index) => (
              <div key={index} style={styles.imageCard}>
                <div style={styles.imageWrapper}>
                  {!url ? (
                    <div style={styles.imageLoading}><Loader2 size={24} className="animate-spin" /></div>
                  ) : (
                    <img src={url} alt="product" style={styles.imagePreview} />
                  )}
                </div>
                <div style={styles.imageActions}>
                  <button type="button" onClick={() => moveImage(index, 'up')} disabled={index === 0} style={styles.iconBtn}><ArrowUp size={14}/></button>
                  <button type="button" onClick={() => moveImage(index, 'down')} disabled={index === mainImages.length - 1} style={styles.iconBtn}><ArrowDown size={14}/></button>
                  <button type="button" onClick={() => removeMainImage(index)} style={styles.deleteIconBtn}><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <h3 style={styles.sectionTitle}><Palette size={18}/> Price, Stock & Variants</h3>
          {colors.map((colorObj, cIndex) => (
            <div key={cIndex} style={styles.variantCard}>
              <div style={styles.variantTopRow}>
                <input 
                  style={styles.variantInput} 
                  placeholder="Color Name (e.g. Midnight Blue)" 
                  value={colorObj.name} 
                  onChange={e => {
                    const next = [...colors];
                    next[cIndex].name = e.target.value;
                    setColors(next);
                  }} 
                />
                <button type="button" onClick={() => removeColor(cIndex)} style={styles.deleteBtn}><Trash2 size={16}/> Remove</button>
              </div>

              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '15px' }}>
                <div style={styles.variantPhotoUpload} onClick={() => document.getElementById(`var-file-${cIndex}`).click()}>
                   {colorObj.imageUrl ? (
                     <img src={colorObj.imageUrl} style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'4px'}} alt="" />
                   ) : (
                     <div style={{textAlign:'center'}}>
                       {uploadingMap[`variant-${cIndex}`] ? <Loader2 className="animate-spin"/> : <ImagePlus size={20} color="#999"/>}
                       <div style={{fontSize:'10px', color:'#999'}}>Photo</div>
                     </div>
                   )}
                   <input 
                    id={`var-file-${cIndex}`}
                    type="file" 
                    accept="image/*" 
                    hidden
                    onChange={e => handleVariantUpload(e.target.files[0], cIndex)} 
                  />
                </div>

                <div style={styles.bulkEditBar}>
                  <Zap size={14} color="#f57224" />
                  <input type="number" placeholder="Set all Prices" style={styles.bulkInput} onChange={(e) => bulkUpdate(cIndex, 'price', e.target.value)} />
                  <input type="number" placeholder="Set all Stock" style={styles.bulkInput} onChange={(e) => bulkUpdate(cIndex, 'stock', e.target.value)} />
                </div>
              </div>

              <table style={styles.table}>
                <thead>
                  <tr><th>Size</th><th>Price</th><th>Stock</th><th></th></tr>
                </thead>
                <tbody>
                  {colorObj.sizes.map((s, sIndex) => (
                    <tr key={sIndex}>
                      <td><input style={styles.tableInput} value={s.size} placeholder="42" onChange={e => updateSize(cIndex, sIndex, 'size', e.target.value)} /></td>
                      <td><input style={styles.tableInput} value={s.price} type="number" placeholder="Rs" onChange={e => updateSize(cIndex, sIndex, 'price', e.target.value)} /></td>
                      <td><input style={styles.tableInput} value={s.stock} type="number" placeholder="Qty" onChange={e => updateSize(cIndex, sIndex, 'stock', e.target.value)} /></td>
                      <td><button type="button" onClick={() => {
                        const next = [...colors];
                        next[cIndex].sizes = next[cIndex].sizes.filter((_, i) => i !== sIndex);
                        setColors(next);
                      }} style={styles.deleteBtn}><Trash2 size={14}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" onClick={() => {
                const next = [...colors];
                next[cIndex].sizes.push({ size: '', price: '', stock: '' });
                setColors(next);
              }} style={styles.addSmallBtn}><PlusCircle size={14}/> Add Size</button>
            </div>
          ))}
          <button type="button" onClick={addColor} style={styles.addMainBtn}>+ Add New Color Variant</button>
        </section>

        <button type="submit" disabled={loading || Object.keys(uploadingMap).length > 0} style={styles.submitBtn}>
          {loading ? "Publishing..." : "Submit Product"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: { padding: '40px 5%', maxWidth: '1000px', margin: 'auto', fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f9f9f9' },
  header: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px' },
  title: { fontSize: '20px', fontWeight: 'bold', color: '#333' },
  form: { display: 'flex', flexDirection: 'column', gap: '25px' },
  section: { backgroundColor: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #eee', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', fontWeight: '600', marginBottom: '20px', color: '#555' },
  label: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#666', marginBottom: '8px', fontWeight: '500' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' },
  select: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff', fontSize: '14px', appearance: 'none', outline: 'none' },
  textarea: { width: '100%', padding: '12px', height: '120px', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box', marginTop: '15px' },
  
  dropzone: { border: '2px dashed #1890ff', borderRadius: '12px', padding: '30px', textAlign: 'center', backgroundColor: '#f0f7ff', cursor: 'pointer', transition: '0.2s', marginBottom: '20px' },
  imageGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '15px' },
  imageCard: { border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' },
  imageWrapper: { height: '120px', backgroundColor: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  imagePreview: { width: '100%', height: '100%', objectFit: 'cover' },
  imageLoading: { color: '#1890ff' },
  imageActions: { display: 'flex', justifyContent: 'space-around', padding: '5px', backgroundColor: '#f0f0f0' },
  
  variantCard: { border: '1px solid #eee', padding: '20px', borderRadius: '12px', marginBottom: '20px', backgroundColor: '#fff' },
  variantTopRow: { display: 'flex', gap: '15px', marginBottom: '15px' },
  variantInput: { flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px' },
  variantPhotoUpload: { width: '60px', height: '60px', border: '1px dashed #ccc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: '#fafafa' },
  bulkEditBar: { display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: '#fff8f4', padding: '10px', borderRadius: '8px', border: '1px solid #ffe7d6' },
  bulkInput: { padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px', width: '100px' },
  
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  tableInput: { width: '100%', padding: '8px', border: '1px solid #eee', borderRadius: '4px', boxSizing: 'border-box' },
  iconBtn: { background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '4px' },
  deleteIconBtn: { background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', padding: '4px' },
  deleteBtn: { background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' },
  addSmallBtn: { background: 'none', border: 'none', color: '#1890ff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', marginTop: '12px' },
  addMainBtn: { width: '100%', padding: '12px', border: '1px dashed #1890ff', color: '#1890ff', background: '#f0f7ff', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  submitBtn: { padding: '16px', backgroundColor: '#f57224', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(245, 114, 36, 0.2)' },
};