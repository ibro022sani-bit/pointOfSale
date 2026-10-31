export const cleanName = (v) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)

// Matches a product's category / unit against the business's own lists (ignoring capital letters)
// and returns the official spelling. Drug type is only kept for medicine categories.
export async function resolveCatalog(req, { category, unit_of_measurement, drug_type }) {
  const values = { category, unit_of_measurement, drug_type: drug_type || null }
  let isMedicine = false

  if (category !== undefined && category !== null && category !== '') {
    const wanted = cleanName(category).toLowerCase()
    const { data: cats, error } = await req.db.from('product_categories').select('name, is_medicine')
    if (error) return { error: 'Could not check categories' }
    const match = (cats || []).find((c) => c.name.toLowerCase() === wanted)
    if (!match) return { error: 'Unknown category. Add it first using "Add a new category".' }
    values.category = match.name
    isMedicine = match.is_medicine
  }

  if (unit_of_measurement !== undefined && unit_of_measurement !== null && unit_of_measurement !== '') {
    const wanted = cleanName(unit_of_measurement).toLowerCase()
    const { data: units, error } = await req.db.from('product_units').select('name')
    if (error) return { error: 'Could not check units' }
    const match = (units || []).find((u) => u.name.toLowerCase() === wanted)
    if (!match) return { error: 'Unknown unit. Add it first using "Add a new unit".' }
    values.unit_of_measurement = match.name
  }

  if (!isMedicine) values.drug_type = null
  return { values }
}