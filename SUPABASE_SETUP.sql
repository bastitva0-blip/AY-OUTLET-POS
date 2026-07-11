-- A&Y Outlet POS — Supabase Setup
-- Run this in Supabase SQL Editor

-- Products table
CREATE TABLE ay_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  price NUMERIC(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  size TEXT DEFAULT '',
  color TEXT DEFAULT '',
  sku TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales table
CREATE TABLE ay_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) DEFAULT 0,
  tax NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  payment_method TEXT DEFAULT 'CASH',
  customer_name TEXT,
  customer_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sale items table
CREATE TABLE ay_sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES ay_sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES ay_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  line_total NUMERIC(10,2) NOT NULL,
  size TEXT DEFAULT '',
  color TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock decrement function
CREATE OR REPLACE FUNCTION decrement_stock(p_id UUID, qty INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE ay_products SET stock = GREATEST(0, stock - qty) WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Storage bucket for receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('ay-bills', 'ay-bills', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy
CREATE POLICY "Public read ay-bills"
ON storage.objects FOR SELECT
USING (bucket_id = 'ay-bills');

CREATE POLICY "Service role upload ay-bills"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ay-bills');

-- Sample products (optional - delete if you want to start fresh)
INSERT INTO ay_products (name, category, price, stock, size, color, sku) VALUES
('Cotton Kurta', 'Men''s Wear', 599, 20, 'M', 'White', 'AY-001'),
('Printed Kurti', 'Women''s Wear', 499, 15, 'S', 'Pink', 'AY-002'),
('Denim Jeans', 'Men''s Wear', 899, 10, '32', 'Blue', 'AY-003'),
('Floral Dress', 'Women''s Wear', 799, 8, 'M', 'Red', 'AY-004'),
('Kids T-Shirt', 'Kids', 299, 25, '6-8Y', 'Yellow', 'AY-005'),
('Leather Belt', 'Accessories', 349, 30, 'Free Size', 'Brown', 'AY-006'),
('Sports Shoes', 'Footwear', 1299, 12, '42', 'Black', 'AY-007'),
('Silk Saree', 'Ethnic Wear', 2499, 5, 'Free Size', 'Green', 'AY-008');
