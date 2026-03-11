export async function getPDFPageCount(file: File): Promise<number> {
  const text = await file.text()
  const matches = text.match(/\/Type\s*\/Page[^s]/g)
  return matches ? matches.length : 1
}
