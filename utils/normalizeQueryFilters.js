export function normalizeQueryFilters(query = {}) {
  const normalized = { ...query };

  // tipo → types
  if (normalized.tipo && !normalized.types) {
    normalized.types = normalized.tipo;
    delete normalized.tipo;
  }

  // asegurar arrays
  Object.keys(normalized).forEach(key => {
    const val = normalized[key];

    if (typeof val === "string") {
      // caso array en JSON string
      if (val.startsWith("[") && val.endsWith("]")) {
        try {
          normalized[key] = JSON.parse(val);
        } catch {
          normalized[key] = val;
        }
      }
      // caso lista separada por comas
      else if (val.includes(",")) {
        normalized[key] = val.split(",").map(v => v.trim());
      }
      else {
        normalized[key] = [val]; // convierto a array por consistencia
      }
    }
    else if (Array.isArray(val)) {
      normalized[key] = val.map(v => String(v).trim());
    }
  });

  return normalized;
}