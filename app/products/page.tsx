"use client";
import { useEffect, useState } from "react";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  size: string;
  color: string;
  sku: string;
}

const CATEGORIES = ["Men's Wear", "Women's Wear", "Kids", "Accessories", "Footwear", "Ethnic Wear", "Western Wear", "Sports", "General"];

const empty = { name: "", category: "General", price: "", stock: "", size: "", color: "", sku: "" };

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(n);
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setEditing(null); setShowForm(true); }
  function openEdit(p: Product) {
    setForm({ name: p.name, category: p.category, price: String(p.price), stock: String(p.stock), size: p.size, color: p.color, sku: p.sku });
    setEditing(p); setShowForm(true);
  }

  async function save() {
    if (!form.name || !form.price) return;
    setSaving(true);
    const payload = { ...form, price: Number(form.price), stock: Number(form.stock) || 0, ...(editing ? { id: editing.id } : {}) };
    await fetch("/api/products", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    await load(); setShowForm(false); setSaving(false);
  }

  async function del(id: string) {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/products?id=${id}`, { method: "DELETE" });
    load();
  }

  const filtered = products.filter(p =>
    (catFilter === "All" || p.category === catFilter) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()))
  );

  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "#08090c", border: "1px solid #232840", borderRadius: 8, color: "#e8eaf4", fontSize: 14, outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { fontSize: 11, color: "#5a6080", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#d4a853" }}>Products</h1>
        <button onClick={openAdd} style={{ padding: "9px 20px", background: "#d4a853", color: "#08090c", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14 }}>
          + Add Product
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input style={{ ...inp, width: 220 }} placeholder="Search products or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["All", ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)} style={{
              padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: catFilter === cat ? "#d4a853" : "transparent",
              border: `1px solid ${catFilter === cat ? "#d4a853" : "#232840"}`,
              color: catFilter === cat ? "#08090c" : "#5a6080",
            }}>{cat}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#161a26", border: "1px solid #232840", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr auto", padding: "12px 20px", borderBottom: "1px solid #232840", fontSize: 11, color: "#5a6080", fontWeight: 700, textTransform: "uppercase" }}>
          <span>Product</span><span>Category</span><span>Price</span><span>Stock</span><span>Size</span><span>Color</span><span></span>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#5a6080" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#5a6080" }}>No products yet. Add your first product!</div>
        ) : filtered.map(p => (
          <div key={p.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr auto", padding: "14px 20px", borderBottom: "1px solid #232840", alignItems: "center", fontSize: 13 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              {p.sku && <div style={{ fontSize: 11, color: "#5a6080", marginTop: 2 }}>SKU: {p.sku}</div>}
            </div>
            <span style={{ color: "#5a6080" }}>{p.category}</span>
            <span style={{ color: "#d4a853", fontWeight: 700 }}>{fmt(p.price)}</span>
            <span style={{ color: p.stock <= 5 ? "#ef4444" : "#22c55e" }}>{p.stock}</span>
            <span style={{ color: "#5a6080" }}>{p.size || "—"}</span>
            <span style={{ color: "#5a6080" }}>{p.color || "—"}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => openEdit(p)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #232840", background: "transparent", color: "#e8eaf4", fontSize: 12, cursor: "pointer" }}>Edit</button>
              <button onClick={() => del(p.id)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #7f1d1d", background: "transparent", color: "#ef4444", fontSize: 12, cursor: "pointer" }}>Del</button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={{ background: "#161a26", border: "1px solid #232840", borderRadius: 16, padding: 28, width: 480, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontWeight: 700, marginBottom: 20, fontSize: 18 }}>{editing ? "Edit Product" : "Add Product"}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Product Name *</label>
                <input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Cotton Kurta" />
              </div>
              <div>
                <label style={lbl}>Category</label>
                <select style={inp} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Price (₹) *</label>
                <input style={inp} type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="499" />
              </div>
              <div>
                <label style={lbl}>Stock Qty</label>
                <input style={inp} type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="10" />
              </div>
              <div>
                <label style={lbl}>SKU / Code</label>
                <input style={inp} value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="AY-001" />
              </div>
              <div>
                <label style={lbl}>Size</label>
                <input style={inp} value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} placeholder="S / M / L / XL / 32" />
              </div>
              <div>
                <label style={lbl}>Color</label>
                <input style={inp} value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="Red, Blue..." />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: 11, borderRadius: 8, border: "1px solid #232840", background: "transparent", color: "#5a6080", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ flex: 2, padding: 11, borderRadius: 8, border: "none", background: "#d4a853", color: "#08090c", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : editing ? "Update Product" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
