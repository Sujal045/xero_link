// PDF page count detection using pdfjs-dist (runs in browser)
// NOTE: pdfjs requires a worker. We load it from CDN to keep bundle lean.
export async function getPDFPageCount(file: File): Promise<number> {
  const pdfjsLib = await import('pdfjs-dist')
  // Use CDN worker to avoid bundling issues with Next.js
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
  
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  return pdf.numPages
}
