"use client";
import { useEffect, useState } from "react";

interface Product { id: string; name: string; category: string; price: number; stock: number; size: string; color: string; sku: string; }
interface CartItem { productId: string; name: string; unitPrice: number; quantity: number; lineTotal: number; size: string; color: string; }
interface BillLinks { pdfUrl: string; whatsappUrl: string | null; gmailUrl: string | null; invoiceNumber: string; }

const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "SPLIT"];

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(n);
}

const GST_RATE = 0.05;

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [discount, setDiscount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("+91");
  const [customerEmail, setCustomerEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [billLinks, setBillLinks] = useState<BillLinks | null>(null);
  const [waSent, setWaSent] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [applyGST, setApplyGST] = useState(false);

  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState("1");

  useEffect(() => {
    fetch("/api/products")
      .then(r => r.json())
      .then(d => { setProducts(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const categories = ["All", ...new Set(products.map(p => p.category))];

  const filtered = products.filter(p =>
    (catFilter === "All" || p.category === catFilter) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()))
  );

  function addToCart(p: Product) {
    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === p.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1, lineTotal: (updated[idx].quantity + 1) * updated[idx].unitPrice };
        return updated;
      }
      return [...prev, { productId: p.id, name: p.name, unitPrice: p.price, quantity: 1, lineTotal: p.price, size: p.size, color: p.color }];
    });
  }

  function addCustomItem() {
    if (!customName || !customPrice) return;
    const price = Number(customPrice);
    const qty = Number(customQty) || 1;
    const customId = `custom-${Date.now()}`;
    setCart(prev => [...prev, { productId: customId, name: customName, unitPrice: price, quantity: qty, lineTotal: price * qty, size: "", color: "" }]);
    setCustomName(""); setCustomPrice(""); setCustomQty("1"); setShowCustom(false);
  }

  function updateQty(productId: string, delta: number) {
    setCart(prev =>
      prev.map(i => i.productId === productId
        ? { ...i, quantity: i.quantity + delta, lineTotal: (i.quantity + delta) * i.unitPrice }
        : i
      ).filter(i => i.quantity > 0)
    );
  }

  const subtotal = cart.reduce((s, i) => s + i.lineTotal, 0);
  const discountAmt = Math.min(Number(discount) || 0, subtotal);
  const taxable = subtotal - discountAmt;
  const gst = applyGST ? Math.round(taxable * GST_RATE) : 0;
  const total = taxable + gst;

  async function checkout() {
    if (cart.length === 0) return;
    setCheckingOut(true);
    const saleRes = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart, subtotal, discount: discountAmt, tax: gst, total, paymentMethod, customerName, customerPhone }),
    });
    const sale = await saleRes.json();
    if (!sale.id) { setCheckingOut(false); alert("Sale failed: " + sale.error); return; }
    const billRes = await fetch("/api/bill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saleId: sale.id, customerPhone: customerPhone !== "+91" ? customerPhone : undefined, customerEmail: customerEmail || undefined }),
    });
    const links = await billRes.json();
    setBillLinks(links);
    setCheckingOut(false);
  }

  function newSale() {
    setCart([]); setBillLinks(null); setDiscount(""); setCustomerName("");
    setCustomerPhone("+91"); setCustomerEmail(""); setWaSent(false); setEmailSent(false);
  }

  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "#08090c", border: "1px solid #232840", borderRadius: 8, color: "#e8eaf4", fontSize: 14, outline: "none", boxSizing: "border-box" };

  if (billLinks) return (
    <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
      <div style={{ background: "#161a26", border: "1px solid #232840", borderRadius: 12, padding: 28, width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 40 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#d4a853", marginTop: 8 }}>Sale Complete!</div>
          <div style={{ color: "#5a6080", fontSize: 14, marginTop: 4 }}>{billLinks.invoiceNumber} · {fmt(total)}</div>
        </div>
        <a href={billLinks.pdfUrl} target="_blank" rel="noreferrer" style={{ display: "block", padding: 11, textAlign: "center", borderRadius: 8, border: "1px solid #232840", color: "#d4a853", fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
          📄 View Receipt PDF
        </a>
        {billLinks.whatsappUrl && (
          <a href={billLinks.whatsappUrl} target="_blank" rel="noreferrer" onClick={() => setWaSent(true)} style={{ display: "block", padding: 11, textAlign: "center", borderRadius: 8, background: "#25d366", color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
            {waSent ? "✅ WhatsApp Opened" : "💬 Send via WhatsApp"}
          </a>
        )}
        {billLinks.gmailUrl && (
          <a href={billLinks.gmailUrl} target="_blank" rel="noreferrer" onClick={() => setEmailSent(true)} style={{ display: "block", padding: 11, textAlign: "center", borderRadius: 8, background: "#ea4335", color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
            {emailSent ? "✅ Gmail Opened" : "📧 Send via Gmail"}
          </a>
        )}
        <button onClick={newSale} style={{ width: "100%", padding: 11, borderRadius: 8, border: "none", background: "#16201a", color: "#22c55e", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 8 }}>
          + New Sale
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "calc(100vh - 57px)", overflow: "hidden" }}>

      {showCustom && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
          onClick={e => e.target === e.currentTarget && setShowCustom(false)}>
          <div style={{ background: "#161a26", border: "1px solid #d4a853", borderRadius: 16, padding: 28, width: 380 }}>
            <h2 style={{ fontWeight: 800, fontSize: 18, marginBottom: 20, color: "#d4a853" }}>➕ Custom Item</h2>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: "#5a6080", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Item Name *</label>
              <input style={inp} placeholder="e.g. Blue Dupatta" value={customName} onChange={e => setCustomName(e.target.value)} autoFocus />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 11, color: "#5a6080", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Price (Rs.) *</label>
                <input style={inp} type="number" placeholder="499" value={customPrice} onChange={e => setCustomPrice(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#5a6080", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Quantity</label>
                <input style={inp} type="number" placeholder="1" value={customQty} onChange={e => setCustomQty(e.target.value)} />
              </div>
            </div>
            {customName && customPrice && (
              <div style={{ background: "#08090c", border: "1px solid #232840", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#5a6080" }}>
                Total: <strong style={{ color: "#d4a853" }}>{fmt(Number(customPrice) * (Number(customQty) || 1))}</strong>
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowCustom(false)} style={{ flex: 1, padding: 11, borderRadius: 8, border: "1px solid #232840", background: "transparent", color: "#5a6080", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={addCustomItem} disabled={!customName || !customPrice} style={{ flex: 2, padding: 11, borderRadius: 8, border: "none", background: "#d4a853", color: "#08090c", fontWeight: 800, fontSize: 15, cursor: "pointer", opacity: (!customName || !customPrice) ? 0.5 : 1 }}>
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid #232840" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #232840", display: "flex", gap: 10 }}>
          <input style={{ flex: 1, padding: "9px 14px", background: "#10121a", border: "1px solid #232840", borderRadius: 8, color: "#e8eaf4", fontSize: 14, outline: "none" }}
            placeholder="Search products or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
          <button onClick={() => setShowCustom(true)} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #d4a853", background: "transparent", color: "#d4a853", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
            ✏️ Custom Item
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, padding: "10px 16px", overflowX: "auto", borderBottom: "1px solid #232840", scrollbarWidth: "none" }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)} style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", background: catFilter === cat ? "#d4a853" : "transparent", border: `1px solid ${catFilter === cat ? "#d4a853" : "#232840"}`, color: catFilter === cat ? "#08090c" : "#5a6080" }}>{cat}</button>
          ))}
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#5a6080" }}>Loading products...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#5a6080" }}>No products found.</div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, padding: 16, alignContent: "start" }}>
            {filtered.map(p => (
              <button key={p.id} onClick={() => addToCart(p)} style={{ background: "#161a26", border: "1px solid #232840", borderRadius: 10, padding: 14, textAlign: "left", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#d4a853")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#232840")}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>👗</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e8eaf4", marginBottom: 4, lineHeight: 1.3 }}>{p.name}</div>
                {p.size && <div style={{ fontSize: 11, color: "#5a6080" }}>Size: {p.size}</div>}
                {p.color && <div style={{ fontSize: 11, color: "#5a6080" }}>Color: {p.color}</div>}
                <div style={{ fontSize: 15, fontWeight: 800, color: "#d4a853", marginTop: 8 }}>{fmt(p.price)}</div>
                <div style={{ fontSize: 11, color: p.stock <= 5 ? "#ef4444" : "#5a6080", marginTop: 2 }}>Stock: {p.stock}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ width: 340, display: "flex", flexDirection: "column", background: "#10121a" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #232840", fontWeight: 700, fontSize: 15 }}>
          🛒 Cart {cart.length > 0 && `(${cart.reduce((s, i) => s + i.quantity, 0)} items)`}
        </div>
        {cart.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#5a6080" }}>
            <div style={{ fontSize: 14 }}>Tap a product or add custom item</div>
            <button onClick={() => setShowCustom(true)} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #d4a853", background: "transparent", color: "#d4a853", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✏️ Custom Item</button>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto" }}>
            {cart.map(item => (
              <div key={item.productId} style={{ padding: "12px 18px", borderBottom: "1px solid #232840" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                    {item.name}
                    {item.productId.startsWith("custom-") && <span style={{ fontSize: 10, color: "#d4a853", marginLeft: 6, border: "1px solid #d4a853", borderRadius: 4, padding: "1px 5px" }}>CUSTOM</span>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#d4a853", marginLeft: 8 }}>{fmt(item.lineTotal)}</div>
                </div>
                {(item.size || item.color) && <div style={{ fontSize: 11, color: "#5a6080", marginTop: 2 }}>{[item.size, item.color].filter(Boolean).join(" · ")}</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                  <button onClick={() => updateQty(item.productId, -1)} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #232840", background: "#161a26", color: "#e8eaf4", fontSize: 16, cursor: "pointer" }}>−</button>
                  <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: "center" }}>{item.quantity}</span>
                  <button onClick={() => updateQty(item.productId, 1)} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #232840", background: "#161a26", color: "#e8eaf4", fontSize: 16, cursor: "pointer" }}>+</button>
                  <span style={{ fontSize: 12, color: "#5a6080" }}>{fmt(item.unitPrice)} each</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ borderTop: "1px solid #232840", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <input style={{ padding: "8px 12px", background: "#08090c", border: "1px solid #232840", borderRadius: 8, color: "#e8eaf4", fontSize: 13, outline: "none" }} placeholder="Customer name (optional)" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          <input style={{ padding: "8px 12px", background: "#08090c", border: "1px solid #232840", borderRadius: 8, color: "#e8eaf4", fontSize: 13, outline: "none" }} placeholder="+91 WhatsApp" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
          <input style={{ padding: "8px 12px", background: "#08090c", border: "1px solid #232840", borderRadius: 8, color: "#e8eaf4", fontSize: 13, outline: "none" }} placeholder="Email (optional)" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#5a6080", whiteSpace: "nowrap" }}>Discount Rs.</span>
            <input type="number" style={{ flex: 1, padding: "7px 10px", background: "#08090c", border: "1px solid #232840", borderRadius: 8, color: "#e8eaf4", fontSize: 13, outline: "none" }} placeholder="0" value={discount} onChange={e => setDiscount(e.target.value)} />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#5a6080", whiteSpace: "nowrap", cursor: "pointer" }}>
              <input type="checkbox" checked={applyGST} onChange={e => setApplyGST(e.target.checked)} /> GST 5%
            </label>
          </div>
          <div style={{ fontSize: 13, color: "#5a6080", display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            {discountAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Discount</span><span>-{fmt(discountAmt)}</span></div>}
            {gst > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>GST (5%)</span><span>{fmt(gst)}</span></div>}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800, color: "#d4a853" }}>
            <span>TOTAL</span><span>{fmt(total)}</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {PAYMENT_METHODS.map(m => (
              <button key={m} onClick={() => setPaymentMethod(m)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1px solid ${paymentMethod === m ? "#d4a853" : "#232840"}`, background: paymentMethod === m ? "#d4a853" : "transparent", color: paymentMethod === m ? "#08090c" : "#5a6080", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{m}</button>
            ))}
          </div>
          <button onClick={checkout} disabled={cart.length === 0 || checkingOut} style={{ padding: 13, borderRadius: 10, border: "none", background: cart.length === 0 ? "#232840" : "#d4a853", color: cart.length === 0 ? "#5a6080" : "#08090c", fontSize: 15, fontWeight: 800, cursor: cart.length === 0 ? "default" : "pointer", opacity: checkingOut ? 0.7 : 1 }}>
            {checkingOut ? "⏳ Processing..." : "⚡ Checkout & Bill"}
          </button>
        </div>
      </div>
    </div>
  );
}
