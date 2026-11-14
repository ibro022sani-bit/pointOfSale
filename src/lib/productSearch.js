// Search used by the restock and transfer product pickers. Works on rows shaped like
// { product_id, products: { name, brand, barcode, category, unit_of_measurement } }.

export const nameOf = (p) => p.products?.name || ''

const haystack = (p) =>
  [p.products?.name, p.products?.brand, p.products?.barcode, p.products?.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

export const sortByName = (products) => [...products].sort((a, b) => nameOf(a).localeCompare(nameOf(b)))

// Every word typed must appear somewhere (name, brand, barcode or category), in any order.
// An exact barcode match comes first, then names that start with what was typed.
export function searchProducts(products, query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return []
  const words = q.split(/\s+/)
  const rank = (p) => {
    if (String(p.products?.barcode || '').toLowerCase() === q) return 0
    if (nameOf(p).toLowerCase().startsWith(q)) return 1
    return 2
  }
  return sortByName(products)
    .filter((p) => words.every((w) => haystack(p).includes(w)))
    .sort((a, b) => rank(a) - rank(b))
}