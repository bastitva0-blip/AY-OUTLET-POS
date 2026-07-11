import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "today";

  let from = new Date();
  if (range === "today") from.setHours(0, 0, 0, 0);
  else if (range === "week") from.setDate(from.getDate() - 7);
  else if (range === "month") from.setMonth(from.getMonth() - 1);

  const { data, error } = await supabase
    .from("ay_sales")
    .select("*, ay_sale_items(*)")
    .gte("created_at", from.toISOString())
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { items, subtotal, discount, tax, total, paymentMethod, customerName, customerPhone } = body;

  // Generate invoice number
  const { count } = await supabase.from("ay_sales").select("*", { count: "exact", head: true });
  const invoiceNumber = `AY-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data: sale, error: saleErr } = await supabase
    .from("ay_sales")
    .insert({ invoice_number: invoiceNumber, subtotal, discount: discount ?? 0, tax: tax ?? 0, total, payment_method: paymentMethod, customer_name: customerName || null, customer_phone: customerPhone || null })
    .select().single();

  if (saleErr) return NextResponse.json({ error: saleErr.message }, { status: 500 });

  const saleItems = items.map((i: any) => ({
    sale_id: sale.id,
    product_id: i.productId,
    product_name: i.name,
    quantity: i.quantity,
    unit_price: i.unitPrice,
    line_total: i.lineTotal,
    size: i.size || "",
    color: i.color || "",
  }));

  await supabase.from("ay_sale_items").insert(saleItems);

  // Deduct stock
  for (const item of items) {
    if (item.productId) {
      await supabase.rpc("decrement_stock", { p_id: item.productId, qty: item.quantity });
    }
  }

  return NextResponse.json({ ...sale, items: saleItems });
}
