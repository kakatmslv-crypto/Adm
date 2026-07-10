/**
 * Deterministic barcode generator that creates a highly realistic SVG barcode.
 * Generates vertical lines of varying widths based on characters.
 */
export function generateBarcodeSVG(text: string, width = 240, height = 70): string {
  // Let's create a deterministic sequence of widths based on the string chars.
  // Each character corresponds to a sequence of 1s (bars) and 0s (spaces)
  // For simplicity and 100% reliability, we define a small lookup table for alpha-numeric,
  // and default back to a safe pattern.
  
  const charMap: { [key: string]: string } = {
    '0': '101001101101',
    '1': '110100101011',
    '2': '101100101011',
    '3': '110110010101',
    '4': '101001101011',
    '5': '110100110101',
    '6': '101100110101',
    '7': '101001011011',
    '8': '110100101101',
    '9': '101100101101',
    'A': '110101001011',
    'B': '110101100101',
    'C': '110110101101',
    'D': '101101101101',
    'E': '101001101101',
    'F': '110100110110',
    'G': '101100110110',
    'H': '110110011010',
    'I': '101101100110',
    'J': '101101101100',
    'K': '110101011001',
    'L': '110101101001',
    'M': '110110101100',
    'N': '101101101001',
    'O': '101101101100',
    'P': '110100110110',
    'Q': '101100110110',
    'R': '110110011010',
    'S': '101101100110',
    'T': '101101101100',
    'U': '110010101011',
    'V': '110011010101',
    'W': '110011011010',
    'X': '110010110101',
    'Y': '110010101101',
    'Z': '110011010110',
    '-': '100101101101',
  };

  const cleanText = text.toUpperCase().replace(/[^A-Z0-9-]/g, '0');
  
  // Start and end guard bars
  const startGuard = '101';
  const endGuard = '101';
  
  let barcodePattern = startGuard;
  for (const char of cleanText) {
    barcodePattern += charMap[char] || '101001101011';
  }
  barcodePattern += endGuard;

  // Let's draw SVG bars
  const numBars = barcodePattern.length;
  const barWidth = width / numBars;
  
  let svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; padding: 4px; border-radius: 4px;">`;
  
  // Group for barcode lines
  svgContent += `<g fill="#000000">`;
  for (let i = 0; i < numBars; i++) {
    if (barcodePattern[i] === '1') {
      const x = i * barWidth;
      // Leave space at bottom for text
      svgContent += `<rect x="${x}" y="5" width="${barWidth + 0.1}" height="${height - 22}" />`;
    }
  }
  svgContent += `</g>`;
  
  // Barcode text label
  svgContent += `<text x="${width / 2}" y="${height - 4}" font-family="monospace, Courier" font-size="11" font-weight="bold" fill="#000000" text-anchor="middle" letter-spacing="1.5">${text}</text>`;
  svgContent += `</svg>`;
  
  return svgContent;
}

/**
 * Auto-generate a readable barcode for a new book depending on category and standard ID sequence
 */
export function generateBookBarcode(categoryPrefix: string, count: number): string {
  const paddedCount = String(count + 1).padStart(3, '0');
  return `${categoryPrefix.toUpperCase()}-${paddedCount}`;
}

/**
 * Auto-generate a Student ID in form STU-GRADE-SEQ
 */
export function generateStudentID(classGrade: string, count: number): string {
  const paddedCount = String(count + 1).padStart(3, '0');
  const cleanGrade = classGrade.toUpperCase().replace(/\s+/g, '');
  return `STU-${cleanGrade}-${paddedCount}`;
}
