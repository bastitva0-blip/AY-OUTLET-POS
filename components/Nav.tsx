"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "📊 Dashboard" },
  { href: "/pos", label: "🛍️ POS" },
  { href: "/products", label: "📦 Products" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav style={{
      display: "flex", alignItems: "center", gap: 0,
      background: "#10121a", borderBottom: "1px solid #232840",
      padding: "0 24px", position: "sticky", top: 0, zIndex: 100,
    }}>
      <div style={{ marginRight: 32, padding: "14px 0" }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: "#d4a853", letterSpacing: "0.05em" }}>A&P OUTLET</div>
        <div style={{ fontSize: 10, color: "#5a6080", letterSpacing: "0.1em" }}>FASHION STORE POS</div>
      </div>
      {links.map(l => (
        <Link key={l.href} href={l.href} style={{
          padding: "16px 18px",
          fontSize: 13, fontWeight: 600,
          color: path === l.href ? "#d4a853" : "#5a6080",
          borderBottom: path === l.href ? "2px solid #d4a853" : "2px solid transparent",
          transition: "color 0.2s",
        }}>{l.label}</Link>
      ))}
    </nav>
  );
}
