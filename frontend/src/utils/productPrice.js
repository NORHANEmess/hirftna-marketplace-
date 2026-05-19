/**
 * Formats a product's price into a display string.
 * Handles three shapes:
 *   price_min + price_max  → "1 200 – 4 500 DA"
 *   price_min only         → "From 1 200 DA"
 *   price only             → "From 2 000 DA"
 */
export function formatProductPrice(product, t) {
  const min = product.price_min ?? null;
  const max = product.price_max ?? null;
  const base = product.price    ?? null;

  if (min && max) {
    return `${Number(min).toLocaleString()} – ${Number(max).toLocaleString()} DA`;
  }
  if (min)  return t ? t('product.from', { price: Number(min).toLocaleString() })  : `${Number(min).toLocaleString()} DA`;
  if (base) return t ? t('product.from', { price: Number(base).toLocaleString() }) : `${Number(base).toLocaleString()} DA`;
  return t ? t('product.priceOnRequest') : '—';
}
