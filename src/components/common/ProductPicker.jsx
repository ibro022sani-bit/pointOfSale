import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { searchProducts, sortByName, nameOf } from '../../lib/productSearch'

const fieldClass =
  'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400'

// A search box (like the one in POS) together with the full dropdown list.
// Both pick the same product, so use whichever is quicker.
function ProductPicker({ products, value, onChange, placeholder = 'Type product name or scan barcode…' }) {
  const [query, setQuery] = useState('')

  const sorted = useMemo(() => sortByName(products), [products])
  const matches = useMemo(() => searchProducts(products, query), [products, query])
  const searching = query.trim().length > 0

  const choose = (p) => {
    onChange(p.product_id)
    setQuery('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      // a barcode scanner "types" the code and presses Enter
      e.preventDefault()
      if (matches.length > 0) choose(matches[0])
    } else if (e.key === 'Escape') {
      setQuery('')
    }
  }

  const options = searching ? matches : sorted
  const selected = products.find((p) => p.product_id === value)
  const showSelectedExtra = selected && !options.some((p) => p.product_id === value)

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`${fieldClass} pl-9 pr-8`}
        />
        {searching && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {searching && (
        <ul className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-50 bg-white">
          {matches.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-400">No product matches “{query.trim()}”</li>
          )}
          {matches.slice(0, 25).map((p) => (
            <li key={p.product_id}>
              <button type="button" onClick={() => choose(p)} className="w-full text-left px-3 py-2 hover:bg-green-50 transition">
                <span className="text-sm font-medium text-gray-800">{p.products?.name}</span>
                <span className="block text-xs text-gray-400">
                  {[p.products?.brand, p.products?.category, p.products?.unit_of_measurement].filter(Boolean).join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
        <option value="">{searching ? `Matching products (${matches.length})` : 'Or choose from the list'}</option>
        {showSelectedExtra && <option value={value}>{nameOf(selected)}</option>}
        {options.map((p) => (
          <option key={p.product_id} value={p.product_id}>
            {p.products?.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export default ProductPicker