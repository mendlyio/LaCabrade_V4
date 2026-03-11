import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib"

interface GiftCardPDFData {
  code: string
  amount: number // en euros (ex: 50)
  recipientName: string
  message: string
  senderName?: string
}

// Couleur La Cabrade (amber-600 / #9e354a)
const BRAND_COLOR = rgb(0.62, 0.21, 0.29)
const DARK_COLOR = rgb(0.15, 0.15, 0.15)
const MEDIUM_COLOR = rgb(0.4, 0.4, 0.4)
const LIGHT_BG = rgb(0.98, 0.96, 0.95)
const WHITE = rgb(1, 1, 1)

/**
 * Génère un PDF de bon cadeau La Cabrade.
 * Retourne un Buffer prêt pour l'envoi par email en pièce jointe.
 */
export async function generateGiftCardPDF(data: GiftCardPDFData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 420]) // Format paysage A5-ish
  const { width, height } = page.getSize()

  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const courier = await pdfDoc.embedFont(StandardFonts.CourierBold)

  // --- Background ---
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: WHITE,
  })

  // --- Bande décorative en haut ---
  page.drawRectangle({
    x: 0,
    y: height - 8,
    width,
    height: 8,
    color: BRAND_COLOR,
  })

  // --- Cadre principal ---
  const margin = 30
  page.drawRectangle({
    x: margin,
    y: margin,
    width: width - 2 * margin,
    height: height - 2 * margin - 8,
    borderColor: BRAND_COLOR,
    borderWidth: 1.5,
    color: LIGHT_BG,
    opacity: 0.3,
  })

  // --- Header "LA CABRADE" ---
  drawCenteredText(page, "LA CABRADE", helveticaBold, 22, height - 55, BRAND_COLOR, width)

  // --- Sous-titre ---
  drawCenteredText(page, "- BON CADEAU -", helveticaBold, 14, height - 80, MEDIUM_COLOR, width)

  // --- Ligne séparatrice ---
  page.drawLine({
    start: { x: width / 2 - 80, y: height - 95 },
    end: { x: width / 2 + 80, y: height - 95 },
    thickness: 1,
    color: BRAND_COLOR,
    opacity: 0.5,
  })

  // --- Montant ---
  const amountStr = `${data.amount}€`
  drawCenteredText(page, amountStr, helveticaBold, 56, height - 160, BRAND_COLOR, width)

  // --- Destinataire ---
  if (data.recipientName) {
    drawCenteredText(page, `Pour : ${data.recipientName}`, helveticaBold, 14, height - 195, DARK_COLOR, width)
  }

  // --- Message personnalisé ---
  if (data.message) {
    const maxCharsPerLine = 55
    const lines = wrapText(data.message, maxCharsPerLine)
    let yPos = height - 225
    
    // Guillemets
    drawCenteredText(page, `"`, helvetica, 18, yPos + 10, MEDIUM_COLOR, width)
    
    for (const line of lines.slice(0, 4)) { // Max 4 lignes
      drawCenteredText(page, line, helvetica, 10, yPos, MEDIUM_COLOR, width)
      yPos -= 15
    }

    drawCenteredText(page, `"`, helvetica, 18, yPos + 5, MEDIUM_COLOR, width)
  }

  // --- Expéditeur ---
  if (data.senderName) {
    drawCenteredText(page, `De la part de : ${data.senderName}`, helvetica, 10, 115, MEDIUM_COLOR, width)
  }

  // --- Code du bon cadeau ---
  // Fond pour le code
  const codeWidth = 220
  const codeHeight = 32
  const codeX = (width - codeWidth) / 2
  const codeY = 70

  page.drawRectangle({
    x: codeX,
    y: codeY,
    width: codeWidth,
    height: codeHeight,
    color: BRAND_COLOR,
    borderColor: BRAND_COLOR,
    borderWidth: 1,
  })

  drawCenteredText(page, data.code, courier, 16, codeY + 10, WHITE, width)

  // --- Mentions légales ---
  const legalLines = [
    "Valable 1 an à compter de la date d'émission • Utilisable en ligne sur sellerie-lacabrade.be et en magasin",
    "Ce bon cadeau est personnel et ne peut être échangé contre de l'argent.",
  ]

  let legalY = 52
  for (const line of legalLines) {
    drawCenteredText(page, line, helvetica, 6.5, legalY, MEDIUM_COLOR, width)
    legalY -= 10
  }

  // --- Bande décorative en bas ---
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height: 4,
    color: BRAND_COLOR,
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

/**
 * Dessine du texte centré sur la page.
 */
function drawCenteredText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  y: number,
  color: ReturnType<typeof rgb>,
  pageWidth: number
) {
  const textWidth = font.widthOfTextAtSize(text, size)
  page.drawText(text, {
    x: (pageWidth - textWidth) / 2,
    y,
    size,
    font,
    color,
  })
}

/**
 * Découpe un texte en lignes en respectant une largeur max de caractères.
 */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ")
  const lines: string[] = []
  let currentLine = ""

  for (const word of words) {
    if ((currentLine + " " + word).trim().length > maxChars) {
      if (currentLine) lines.push(currentLine.trim())
      currentLine = word
    } else {
      currentLine += " " + word
    }
  }
  if (currentLine.trim()) lines.push(currentLine.trim())

  return lines
}

/**
 * Génère un code unique pour le bon cadeau.
 * Format : LC-XXXX-XXXX-XXXX
 */
export function generateGiftCardCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Exclus 0/O/I/1 pour éviter confusion
  const segments: string[] = []

  for (let s = 0; s < 3; s++) {
    let segment = ""
    for (let i = 0; i < 4; i++) {
      const randomBytes = new Uint8Array(1)
      crypto.getRandomValues(randomBytes)
      segment += chars[randomBytes[0] % chars.length]
    }
    segments.push(segment)
  }

  return `LC-${segments.join("-")}`
}
