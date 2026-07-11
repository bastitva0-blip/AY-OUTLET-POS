import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { supabase } from "@/lib/supabase";

function fmt(n: number) {
  return "Rs. " + new Intl.NumberFormat("en-IN", { minimumFractionDigits: 0 }).format(Math.round(n));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { saleId, customerPhone, customerEmail } = body;

  const { data: sale, error } = await supabase
    .from("ay_sales")
    .select("*, ay_sale_items(*)")
    .eq("id", saleId)
    .single();

  if (error || !sale) return NextResponse.json({ error: "Sale not found" }, { status: 404 });

  const items = sale.ay_sale_items as any[];
  const doc = await PDFDocument.create();
  const page = doc.addPage([380, Math.max(500, 320 + items.length * 22)]);
  const { width, height } = page.getSize();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const gold = rgb(0.83, 0.66, 0.32);
  const left = 24, right = width - 24;
  let y = height - 28;

  // Header
  page.drawText("A&Y OUTLET", { x: left, y, size: 18, font: bold, color: gold });
  y -= 18;
  page.drawText("Fashion Store", { x: left, y, size: 10, font, color: gray });
  y -= 14;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  y -= 14;

  // Meta
  page.drawText(`Invoice: ${sale.invoice_number}`, { x: left, y, size: 9, font: bold, color: black });
  page.drawText(new Date(sale.created_at).toLocaleDateString("en-IN"), { x: right - 80, y, size: 9, font, color: gray });
  y -= 13;
  if (sale.customer_name) {
    page.drawText(`Customer: ${sale.customer_name}`, { x: left, y, size: 9, font, color: gray });
    y -= 13;
  }
  page.drawText(`Payment: ${sale.payment_method}`, { x: left, y, size: 9, font, color: gray });
  y -= 14;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  y -= 13;

  // Column headers
  page.drawText("Item", { x: left, y, size: 9, font: bold, color: black });
  page.drawText("Qty", { x: 230, y, size: 9, font: bold, color: black });
  page.drawText("Price", { x: 265, y, size: 9, font: bold, color: black });
  page.drawText("Total", { x: right - 38, y, size: 9, font: bold, color: black });
  y -= 10;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  y -= 13;

  for (const item of items) {
    const label = [item.product_name, item.size && `Sz:${item.size}`, item.color].filter(Boolean).join(" · ");
    page.drawText(label.substring(0, 30), { x: left, y, size: 9, font, color: black });
    page.drawText(String(item.quantity), { x: 234, y, size: 9, font, color: black });
    page.drawText(fmt(item.unit_price), { x: 258, y, size: 9, font, color: black });
    page.drawText(fmt(item.line_total), { x: right - 50, y, size: 9, font, color: black });
    y -= 18;
  }

  y -= 4;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  y -= 13;

  const row = (label: string, val: string, isBold = false) => {
    page.drawText(label, { x: left + 140, y, size: 9, font: isBold ? bold : font, color: isBold ? black : gray });
    page.drawText(val, { x: right - 55, y, size: 9, font: isBold ? bold : font, color: isBold ? black : gray });
    y -= 13;
  };

  row("Subtotal", fmt(sale.subtotal));
  if (sale.discount > 0) row("Discount", `-${fmt(sale.discount)}`);
  if (sale.tax > 0) row("GST", fmt(sale.tax));
  y -= 2;
  page.drawLine({ start: { x: left + 140, y }, end: { x: right, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  y -= 13;
  row("TOTAL", fmt(sale.total), true);

  y -= 18;
  page.drawText("Thank you for shopping at A&Y Outlet!", {
    x: width / 2 - 90, y, size: 9, font: bold, color: gold,
  });

  const pdfBytes = await doc.save();
  const fileName = `bills/AY-${sale.invoice_number}-${Date.now()}.pdf`;
  await supabase.storage.from("ay-bills").upload(fileName, pdfBytes, { contentType: "application/pdf", upsert: true });
  const { data: urlData } = await supabase.storage.from("ay-bills").createSignedUrl(fileName, 60 * 60 * 24 * 7);
  const pdfUrl = urlData?.signedUrl ?? "";

  // Build links
  const phone = customerPhone?.replace(/\D/g, "");
  const waMsg = `Hi${sale.customer_name ? " " + sale.customer_name : ""}! 🛍️ Thank you for shopping at A&Y Outlet.\n\nInvoice: ${sale.invoice_number}\nTotal: ${fmt(sale.total)} (${sale.payment_method})\n\nDownload receipt: ${pdfUrl}`;
  const whatsappUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}` : null;

  const emailSubject = `Your receipt from A&Y Outlet — ${sale.invoice_number}`;
  const emailBody = `Dear ${sale.customer_name ?? "Customer"},\n\nThank you for shopping with us!\n\nInvoice: ${sale.invoice_number}\nTotal: ${fmt(sale.total)}\n\nReceipt: ${pdfUrl}\n\nA&Y Outlet Fashion Store`;
  const gmailUrl = customerEmail ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(customerEmail)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}` : null;

  return NextResponse.json({ pdfUrl, whatsappUrl, gmailUrl, invoiceNumber: sale.invoice_number });
}
