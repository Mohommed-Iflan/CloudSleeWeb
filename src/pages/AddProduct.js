import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Layers3, Palette, ImageIcon, Trash2, PlusCircle, ImagePlus } from 'lucide-react';

export default function AddSlipper() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  const ADMIN_EMAIL = "mohommediflaan@gmail.com";

  // Product state now includes an array for the Big Main Images
  const [product, setProduct] = useState({ name: '', description: '', tags: '' });
  const [mainImages, setMainImages] = useState(['']); // For the "Big" gallery

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

  // Logic for the Big Gallery URLs
  const addMainImageField = () => setMainImages([...mainImages, '']);
  const updateMainImage = (index, value) => {
    const next = [...mainImages];
    next[index] = value;
    setMainImages(next);
  };
  const removeMainImage = (index) => setMainImages(mainImages.filter((_, i) => i !== index));

  const addColor = () => setColors([...colors, { name: '', imageUrl: '', sizes: [{ size: '', price: '', stock: '' }] }]);
  const updateSize = (colorIndex, sizeIndex, field, value) => {
    const newColors = [...colors];
    newColors[colorIndex].sizes[sizeIndex][field] = value;
    setColors(newColors);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formattedData = {
      name: product.name,
      description: product.description,
      tags: product.tags,
      // Storing the big gallery links
      main_images: mainImages.filter(url => url.trim() !== ''), 
      variant_data: colors 
    };

    const { error } = await supabase.from('products').insert([formattedData]);

    if (!error) {
      alert("Product published with Big Gallery!");
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
        <ShieldCheck size={32} />
        <h2 style={styles.title}>SELLER CENTER: ADD PRODUCT</h2>
      </div>

      <form onSubmit={handleSave} style={styles.form}>
        {/* SECTION 1: CORE INFO */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}><Layers3 size={18}/> Basic Information</h3>
          <input style={styles.input} placeholder="Product Name" onChange={e => setProduct({...product, name: e.target.value})} required />
          <textarea style={styles.textarea} placeholder="Description" onChange={e => setProduct({...product, description: e.target.value})} required />
        </section>

        {/* SECTION 2: BIG IMAGE GALLERY (FOR PRODUCT DETAILS PAGE) */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}><ImagePlus size={18}/> Main Product Gallery (Large Images)</h3>
          <p style={styles.hint}>Add links for high-quality images that will show "bigly" at the top of the details page.</p>
          
          {mainImages.map((url, index) => (
            <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input 
                style={styles.input} 
                placeholder="Paste Main Image URL" 
                value={url}
                onChange={e => updateMainImage(index, e.target.value)} 
              />
              <button type="button" onClick={() => removeMainImage(index)} style={styles.deleteBtn}><Trash2 size={16}/></button>
            </div>
          ))}
          <button type="button" onClick={addMainImageField} style={styles.addSmallBtn}>+ Add Another Big Image Link</button>
        </section>

        {/* SECTION 3: VARIANTS (COLOR & SIZES) */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}><Palette size={18}/> Price, Stock & Variants</h3>
          {colors.map((colorObj, cIndex) => (
            <div key={cIndex} style={styles.variantCard}>
              <div style={styles.variantHeader}>
                <input style={styles.variantInput} placeholder="Color Family" value={colorObj.name} onChange={e => {
                  const next = [...colors];
                  next[cIndex].name = e.target.value;
                  setColors(next);
                }} />
                <input style={styles.variantInput} placeholder="Color Thumbnail URL" onChange={e => {
                  const next = [...colors];
                  next[cIndex].imageUrl = e.target.value;
                  setColors(next);
                }} />
              </div>

              <table style={styles.table}>
                <thead>
                  <tr><th>Size</th><th>Price (Rs.)</th><th>Stock</th></tr>
                </thead>
                <tbody>
                  {colorObj.sizes.map((s, sIndex) => (
                    <tr key={sIndex}>
                      <td><input style={styles.tableInput} placeholder="Size" onChange={e => updateSize(cIndex, sIndex, 'size', e.target.value)} /></td>
                      <td><input style={styles.tableInput} type="number" placeholder="Price" onChange={e => updateSize(cIndex, sIndex, 'price', e.target.value)} /></td>
                      <td><input style={styles.tableInput} type="number" placeholder="Stock" onChange={e => updateSize(cIndex, sIndex, 'stock', e.target.value)} /></td>
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

        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading ? "Publishing..." : "Submit Product"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: { padding: '40px 5%', maxWidth: '900px', margin: 'auto', fontFamily: 'Arial, sans-serif' },
  header: { marginBottom: '30px' },
  title: { fontSize: '22px', fontWeight: 'bold' },
  form: { display: 'flex', flexDirection: 'column', gap: '30px' },
  section: { backgroundColor: '#fff', padding: '25px', borderRadius: '4px', border: '1px solid #eee' },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: '600', marginBottom: '15px' },
  input: { width: '100%', padding: '12px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px' },
  textarea: { width: '100%', padding: '12px', height: '100px', border: '1px solid #ddd', borderRadius: '4px' },
  variantCard: { border: '1px solid #eff0f5', padding: '15px', borderRadius: '4px', marginBottom: '20px', backgroundColor: '#f8f9ff' },
  variantHeader: { display: 'flex', gap: '10px', marginBottom: '10px' },
  variantInput: { flex: 1, padding: '10px', border: '1px solid #ddd' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableInput: { width: '90%', padding: '8px', border: '1px solid #eee' },
  deleteBtn: { background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer' },
  addSmallBtn: { background: 'none', border: 'none', color: '#1890ff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', marginTop: '10px' },
  addMainBtn: { width: '100%', padding: '12px', border: '1px dashed #1890ff', color: '#1890ff', background: '#e6f7ff', cursor: 'pointer' },
  submitBtn: { padding: '15px', backgroundColor: '#f57224', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
  hint: { fontSize: '12px', color: '#888', marginBottom: '15px' }
};