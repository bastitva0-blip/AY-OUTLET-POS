"use client";
import { useEffect, useState } from "react";

interface Sale {
  id: string;
  invoice_number: string;
  total: number;
  payment_method: string;
  customer_name: string | null;
  created_at: string;
  ay_sale_items: { product_name: string; quantity: number; line_total: number }[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(n);
}

export default function Dashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [range, setRange] = useState<"today" | "week" | "month">("today");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sales?range=${range}`)
      .then(r => r.json())
      .then(d => { setSales(Array.isArray(d) ? d : []); setLoading(false); });
  }, [range]);

  const revenue = sales.reduce((s, x) => s + x.total, 0);
  const avgOrder = sales.length ? revenue / sales.length : 0;

  // top products
  const productMap: Record<string, number> = {};
  for (const sale of sales) {
    for (const item of sale.ay_sale_items ?? []) {
      productMap[item.product_name] = (productMap[item.product_name] ?? 0) + item.quantity;
    }
  }
  const topProducts = Object.entries(productMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // payment breakdown
  const payMap: Record<string, number> = {};
  for (const sale of sales) payMap[sale.payment_method] = (payMap[sale.payment_method] ?? 0) + sale.total;

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#d4a853" }}>Dashboard</h1>
          <p style={{ color: "#5a6080", fontSize: 13, marginTop: 2 }}>A&P Outlet — Fashion Store</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["today", "week", "month"] as const).map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: range === r ? "#d4a853" : "transparent",
              border: `1px solid ${range === r ? "#d4a853" : "#232840"}`,
              color: range === r ? "#08090c" : "#5a6080", cursor: "pointer",
            }}>{r.charAt(0).toUpperCase() + r.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Revenue", value: fmt(revenue), icon: "💰" },
          { label: "Orders", value: String(sales.length), icon: "🛍️" },
          { label: "Avg Order", value: fmt(avgOrder), icon: "📊" },
          { label: "Top Method", value: Object.entries(payMap).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? "—", icon: "💳" },
        ].map(stat => (
          <div key={stat.label} style={{ background: "#161a26", border: "1px solid #232840", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{stat.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#d4a853" }}>{loading ? "..." : stat.value}</div>
            <div style={{ fontSize: 12, color: "#5a6080", marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Recent Sales */}
        <div style={{ background: "#161a26", border: "1px solid #232840", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Recent Sales</h3>
          {loading ? <div style={{ color: "#5a6080", fontSize: 13 }}>Loading...</div> :
            sales.length === 0 ? <div style={{ color: "#5a6080", fontSize: 13 }}>No sales yet</div> :
            sales.slice(0, 8).map(sale => (
              <div key={sale.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #232840" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{sale.invoice_number}</div>
                  <div style={{ fontSize: 11, color: "#5a6080", marginTop: 2 }}>
                    {sale.customer_name ?? "Walk-in"} · {sale.payment_method}
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#d4a853" }}>{fmt(sale.total)}</div>
              </div>
            ))
          }
        </div>

        {/* Top Products */}
        <div style={{ background: "#161a26", border: "1px solid #232840", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Top Products</h3>
          {loading ? <div style={{ color: "#5a6080", fontSize: 13 }}>Loading...</div> :
            topProducts.length === 0 ? <div style={{ color: "#5a6080", fontSize: 13 }}>No data yet</div> :
            topProducts.map(([name, qty], i) => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #232840" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#d4a853", color: "#08090c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{i + 1}</div>
                <div style={{ flex: 1, fontSize: 13 }}>{name}</div>
                <div style={{ fontSize: 12, color: "#5a6080" }}>{qty} sold</div>
              </div>
            ))
          }

          <h3 style={{ fontWeight: 700, margin: "20px 0 12px", fontSize: 15 }}>Payment Split</h3>
          {Object.entries(payMap).map(([method, amount]) => (
            <div key={method} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
              <span style={{ color: "#5a6080" }}>{method}</span>
              <span style={{ fontWeight: 600 }}>{fmt(amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
