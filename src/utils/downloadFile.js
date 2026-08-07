// src/utils/downloadFile.js

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

// Extrae el filename de un header Content-Disposition tipo:
// attachment; filename="catalogo_deduplicado.xlsx"
export function filenameFromContentDisposition(contentDisposition, fallback = 'archivo.xlsx') {
  if (!contentDisposition) return fallback

  const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  return match ? decodeURIComponent(match[1]) : fallback
}