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

  function updateQty(productId: string, delta: number) {
    setCart(prev => {
      const updated = prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + delta, lineTotal: (i.quantity + delta) * i.unitPrice } : i).filter(i => i.quantity > 0);
      return updated;
    });
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

  const s = {
    card: { background: "#161a26", border: "1px solid #232840", borderRadius: 12 } as React.CSSProperties,
    btn: (active: boolean) => ({ padding: "7px 14px", borderRadius: 8, border: `1px solid ${active ? "#d4a853" : "#232840"}`, background: active ? "#d4a853" : "transparent", color: active ? "#08090c" : "#5a6080", fontSize: 12, fontWeight: 600, cursor: "pointer" }) as React.CSSProperties,
  };

  if (billLinks) return (
    <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
      <div style={{ ...s.card, padding: 28, width: "100%", maxWidth: 440 }}>
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
      {/* LEFT: Products */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid #232840" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #232840", display: "flex", gap: 10 }}>
          <input
            style={{ flex: 1, padding: "9px 14px", background: "#10121a", border: "1px solid #232840", borderRadius: 8, color: "#e8eaf4", fontSize: 14, outline: "none" }}
            placeholder="Search products or SKU..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 8, padding: "10px 16px", overflowX: "auto", borderBottom: "1px solid #232840", scrollbarWidth: "none" }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)} style={s.btn(catFilter === cat)}>{cat}</button>
          ))}
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#5a6080" }}>Loading products...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#5a6080" }}>No products found. Add products first!</div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, padding: 16, alignContent: "start" }}>
            {filtered.map(p => (
              <button key={p.id} onClick={() => addToCart(p)} style={{ background: "#161a26", border: "1px solid #232840", borderRadius: 10, padding: 14, textAlign: "left", cursor: "pointer", transition: "border-color 0.15s" }}
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

      {/* RIGHT: Cart */}
      <div style={{ width: 340, display: "flex", flexDirection: "column", background: "#10121a" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #232840", fontWeight: 700, fontSize: 15 }}>
          🛒 Cart {cart.length > 0 && `(${cart.reduce((s,i)=>s+i.quantity,0)} items)`}
        </div>

        {cart.length === 0 ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#5a6080", fontSize: 14 }}>
            Tap a product to add
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto" }}>
            {cart.map(item => (
              <div key={item.productId} style={{ padding: "12px 18px", borderBottom: "1px solid #232840" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#d4a853", marginLeft: 8 }}>{fmt(item.lineTotal)}</div>
                </div>
                {(item.size || item.color) && (
                  <div style={{ fontSize: 11, color: "#5a6080", marginTop: 2 }}>{[item.size, item.color].filter(Boolean).join(" · ")}</div>
                )}
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

        {/* Footer */}
        <div style={{ borderTop: "1px solid #232840", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Customer */}
          <input style={{ padding: "8px 12px", background: "#08090c", border: "1px solid #232840", borderRadius: 8, color: "#e8eaf4", fontSize: 13, outline: "none" }}
            placeholder="Customer name (optional)" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          <input style={{ padding: "8px 12px", background: "#08090c", border: "1px solid #232840", borderRadius: 8, color: "#e8eaf4", fontSize: 13, outline: "none" }}
            placeholder="+91 WhatsApp" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
          <input style={{ padding: "8px 12px", background: "#08090c", border: "1px solid #232840", borderRadius: 8, color: "#e8eaf4", fontSize: 13, outline: "none" }}
            placeholder="Email (optional)" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />

          {/* Discount */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#5a6080", whiteSpace: "nowrap" }}>Discount ₹</span>
            <input type="number" style={{ flex: 1, padding: "7px 10px", background: "#08090c", border: "1px solid #232840", borderRadius: 8, color: "#e8eaf4", fontSize: 13, outline: "none" }}
              placeholder="0" value={discount} onChange={e => setDiscount(e.target.value)} />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#5a6080", whiteSpace: "nowrap" }}>
              <input type="checkbox" checked={applyGST} onChange={e => setApplyGST(e.target.checked)} /> GST 5%
            </label>
          </div>

          {/* Totals */}
          <div style={{ fontSize: 13, color: "#5a6080" }}>
            {discountAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Discount</span><span>-{fmt(discountAmt)}</span></div>}
            {gst > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>GST (5%)</span><span>{fmt(gst)}</span></div>}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800, color: "#d4a853" }}>
            <span>TOTAL</span><span>{fmt(total)}</span>
          </div>

          {/* Payment */}
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
