import {
  EasyReadStep,
  FullAccessibleDocument,
  GuidelineCheck,
  PictogramPhrase,
  PictogramToken,
  UserProfileOption
} from '../types';
import { summarizeChecks } from './easyReadValidator';

export interface PdfExportPayload {
  title: string;
  userProfile: UserProfileOption;
  summary?: string;
  fullDocument?: FullAccessibleDocument | null;
  steps?: EasyReadStep[];
  pictoPhrases?: PictogramPhrase[];
  guidelineChecks?: GuidelineCheck[];
}

/**
 * Carga una imagen externa (por ejemplo un pictograma de ARASAAC) con CORS habilitado
 * para poder dibujarla dentro del lienzo del PDF sin bloquear la exportación.
 */
function loadImageSafe(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 3500);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Divide un párrafo largo en líneas que caben en el ancho máximo indicado del canvas
 */
function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.length > 0 ? lines : [''];
}

/**
 * Empaqueta una lista de páginas JPEG (en DataURL) dentro de un archivo binario PDF 1.4 estándar
 * (A4: 595.28 x 841.89 pt) sin requerir librerías externas.
 */
function buildPdfFromJpegPages(
  pages: { dataUrl: string; widthPx: number; heightPx: number }[]
): Blob {
  const PAGE_W_PT = 595.28;
  const PAGE_H_PT = 841.89;

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let byteOffset = 0;
  const offsets: number[] = [0]; // Índice 0 reservado para el objeto libre 0

  const writeStr = (str: string) => {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    byteOffset += bytes.length;
  };

  const writeBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    byteOffset += bytes.length;
  };

  const base64ToBytes = (b64: string): Uint8Array => {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      arr[i] = bin.charCodeAt(i);
    }
    return arr;
  };

  // Cabecera PDF 1.4 con comentario binario
  writeStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  // Objeto 1: Catalog
  offsets[1] = byteOffset;
  writeStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Objeto 2: Pages (reservamos IDs: cada página usa 3 objetos: Page, ContentStream, ImageXObject)
  const pageObjIds: number[] = [];
  for (let i = 0; i < pages.length; i++) {
    pageObjIds.push(3 + i * 3);
  }

  offsets[2] = byteOffset;
  writeStr(
    `2 0 obj\n<< /Type /Pages /Kids [ ${pageObjIds
      .map((id) => `${id} 0 R`)
      .join(' ')} ] /Count ${pages.length} >>\nendobj\n`
  );

  // Objetos por cada página
  for (let i = 0; i < pages.length; i++) {
    const pageObjId = 3 + i * 3;
    const contentObjId = pageObjId + 1;
    const imgObjId = pageObjId + 2;
    const page = pages[i];
    const cleanB64 = page.dataUrl.replace(/^data:image\/jpeg;base64,/, '');
    const jpegBytes = base64ToBytes(cleanB64);

    // 1) Objeto Page
    offsets[pageObjId] = byteOffset;
    writeStr(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W_PT} ${PAGE_H_PT}] /Resources << /XObject << /Im${i} ${imgObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`
    );

    // 2) Objeto Content Stream
    const contentStream = `q\n${PAGE_W_PT} 0 0 ${PAGE_H_PT} 0 0 cm\n/Im${i} Do\nQ\n`;
    const contentBytes = encoder.encode(contentStream);
    offsets[contentObjId] = byteOffset;
    writeStr(`${contentObjId} 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
    writeBytes(contentBytes);
    writeStr('\nendstream\nendobj\n');

    // 3) Objeto Image XObject (DCTDecode JPEG)
    offsets[imgObjId] = byteOffset;
    writeStr(
      `${imgObjId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.widthPx} /Height ${page.heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
    );
    writeBytes(jpegBytes);
    writeStr('\nendstream\nendobj\n');
  }

  // Tabla XREF
  const totalObjects = offsets.length;
  const xrefStart = byteOffset;
  writeStr(`xref\n0 ${totalObjects}\n0000000000 65535 f \n`);
  for (let id = 1; id < totalObjects; id++) {
    const padded = String(offsets[id]).padStart(10, '0');
    writeStr(`${padded} 00000 n \n`);
  }

  writeStr(
    `trailer\n<< /Size ${totalObjects} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  );

  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

/**
 * Genera y descarga directamente un archivo PDF A4 accesible con todo el contenido generado por la IA
 * (Texto Completo en Lectura Fácil, Resumen, Pasos, Glosario, Pictogramas ARASAAC y Validación UNE/ATECA).
 */
export async function exportAccessibleDocumentToPdf(payload: PdfExportPayload): Promise<void> {
  const PAGE_W = 1240; // A4 a 150 DPI
  const PAGE_H = 1754;
  const MARGIN_X = 80;
  const CONTENT_W = PAGE_W - MARGIN_X * 2;
  const BOTTOM_LIMIT = PAGE_H - 120;

  const canvases: HTMLCanvasElement[] = [];

  const createNewPage = (): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; y: number } => {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext('2d')!;

    // Fondo blanco limpio para lectura e impresión óptima
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    // Franja superior institucional y de accesibilidad
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, PAGE_W, 118);

    ctx.fillStyle = '#FACC15';
    ctx.font = 'bold 26px Verdana, Arial, sans-serif';
    ctx.fillText('ASISTENTE ADAPTADO MULTIMODAL CON IA — LA SALLE BILBAO', MARGIN_X, 52);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 19px Verdana, Arial, sans-serif';
    ctx.fillText(
      `Perfil: ${payload.userProfile.categoryLabel} (${payload.userProfile.levelLabel}) • Norma UNE 153101:2018 EX y ATECA`,
      MARGIN_X,
      90
    );

    canvases.push(canvas);
    return { canvas, ctx, y: 165 };
  };

  let { ctx, y } = createNewPage();

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > BOTTOM_LIMIT) {
      const next = createNewPage();
      ctx = next.ctx;
      y = next.y;
    }
  };

  // 1. TÍTULO PRINCIPAL DEL DOCUMENTO
  ctx.font = 'bold 38px Verdana, Arial, sans-serif';
  ctx.fillStyle = '#0F172A';
  const titleLines = wrapTextLines(ctx, payload.title || 'Documento Adaptado en Lectura Fácil', CONTENT_W);
  ensureSpace(titleLines.length * 48 + 25);
  for (const line of titleLines) {
    ctx.fillText(line, MARGIN_X, y);
    y += 48;
  }
  y += 10;

  // Línea divisoria destacada
  ctx.fillStyle = '#0284C7';
  ctx.fillRect(MARGIN_X, y, CONTENT_W, 5);
  y += 32;

  // 2. RESUMEN GENERAL / IDEA PRINCIPAL
  const summaryText = payload.fullDocument?.summary || payload.summary || '';
  if (summaryText) {
    ctx.font = 'bold 25px Verdana, Arial, sans-serif';
    const sumLines = wrapTextLines(ctx, summaryText, CONTENT_W - 56);
    const boxH = sumLines.length * 36 + 70;
    ensureSpace(boxH + 25);

    ctx.fillStyle = '#F0F9FF';
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 4;
    ctx.fillRect(MARGIN_X, y, CONTENT_W, boxH);
    ctx.strokeRect(MARGIN_X, y, CONTENT_W, boxH);

    ctx.fillStyle = '#0369A1';
    ctx.font = 'bold 22px Verdana, Arial, sans-serif';
    ctx.fillText('IDEA PRINCIPAL / RESUMEN EN LECTURA FÁCIL:', MARGIN_X + 28, y + 36);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 25px Verdana, Arial, sans-serif';
    let sumY = y + 74;
    for (const line of sumLines) {
      ctx.fillText(line, MARGIN_X + 28, sumY);
      sumY += 36;
    }
    y += boxH + 34;
  }

  // 3. TEXTO COMPLETO ADAPTADO POR LA IA (Párrafo a párrafo)
  const paragraphs = payload.fullDocument?.fullTextParagraphs || [];
  if (paragraphs.length > 0) {
    ensureSpace(90);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 28px Verdana, Arial, sans-serif';
    ctx.fillText('TEXTO COMPLETO ADAPTADO (LECTURA FÁCIL):', MARGIN_X, y);
    y += 38;

    for (const para of paragraphs) {
      ctx.font = '25px Verdana, Arial, sans-serif';
      const lines = wrapTextLines(ctx, para, CONTENT_W - 36);
      const blockH = lines.length * 38 + 26;
      ensureSpace(blockH + 14);

      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2;
      ctx.fillRect(MARGIN_X, y, CONTENT_W, blockH);
      ctx.strokeRect(MARGIN_X, y, CONTENT_W, blockH);

      // Barra lateral azul de guía de lectura
      ctx.fillStyle = '#0284C7';
      ctx.fillRect(MARGIN_X, y, 8, blockH);

      ctx.fillStyle = '#0F172A';
      let lineY = y + 36;
      for (const line of lines) {
        ctx.fillText(line, MARGIN_X + 24, lineY);
        lineY += 38;
      }
      y += blockH + 16;
    }
    y += 14;
  }

  // 4. PASOS NUMERADOS / SECUENCIA DE INSTRUCCIONES
  const stepsToRender =
    payload.fullDocument?.steps && payload.fullDocument.steps.length > 0
      ? payload.fullDocument.steps
      : payload.steps || [];

  if (stepsToRender.length > 0) {
    ensureSpace(90);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 28px Verdana, Arial, sans-serif';
    ctx.fillText('PASOS A SEGUIR / PUNTOS CLAVE:', MARGIN_X, y);
    y += 36;

    for (const step of stepsToRender) {
      const label = `PASO ${step.stepNumber}: ${step.instruction}`;
      ctx.font = 'bold 24px Verdana, Arial, sans-serif';
      const lines = wrapTextLines(ctx, label, CONTENT_W - 95);
      const cardH = Math.max(78, lines.length * 36 + 32);
      ensureSpace(cardH + 14);

      ctx.fillStyle = '#FEFCE8';
      ctx.strokeStyle = '#EAB308';
      ctx.lineWidth = 3;
      ctx.fillRect(MARGIN_X, y, CONTENT_W, cardH);
      ctx.strokeRect(MARGIN_X, y, CONTENT_W, cardH);

      // Círculo con número de paso
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(MARGIN_X + 18, y + 16, 48, 48);
      ctx.fillStyle = '#FACC15';
      ctx.font = 'bold 24px Verdana, Arial, sans-serif';
      ctx.fillText(String(step.stepNumber), MARGIN_X + 34, y + 48);

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 24px Verdana, Arial, sans-serif';
      let stepY = y + 42;
      for (const line of lines) {
        ctx.fillText(line, MARGIN_X + 82, stepY);
        stepY += 36;
      }
      y += cardH + 14;
    }
    y += 16;
  }

  // 5. GLOSARIO DE PALABRAS DIFÍCILES EXPLICADAS (NORMA UNE 153101:2018 EX)
  const glossary = payload.fullDocument?.glossary || [];
  if (glossary.length > 0) {
    ensureSpace(90);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 28px Verdana, Arial, sans-serif';
    ctx.fillText('GLOSARIO DE PALABRAS EXPLICADAS:', MARGIN_X, y);
    y += 34;

    for (const item of glossary) {
      const text = `• ${item.term}: ${item.definition}`;
      ctx.font = 'bold 23px Verdana, Arial, sans-serif';
      const lines = wrapTextLines(ctx, text, CONTENT_W - 40);
      const itemH = lines.length * 34 + 24;
      ensureSpace(itemH + 12);

      ctx.fillStyle = '#F0FDF4';
      ctx.strokeStyle = '#22C55E';
      ctx.lineWidth = 2;
      ctx.fillRect(MARGIN_X, y, CONTENT_W, itemH);
      ctx.strokeRect(MARGIN_X, y, CONTENT_W, itemH);

      ctx.fillStyle = '#14532D';
      let gY = y + 32;
      for (const line of lines) {
        ctx.fillText(line, MARGIN_X + 20, gY);
        gY += 34;
      }
      y += itemH + 12;
    }
    y += 16;
  }

  // 6. PICTOGRAMAS ARASAAC DE APOYO VISUAL (Si hay frases pictografiadas o tokens del documento)
  const tokensToRender: PictogramToken[] =
    payload.fullDocument?.pictogramTokens && payload.fullDocument.pictogramTokens.length > 0
      ? payload.fullDocument.pictogramTokens
      : payload.pictoPhrases
      ? payload.pictoPhrases.flatMap((p) => p.tokens).slice(0, 12)
      : [];

  if (tokensToRender.length > 0) {
    ensureSpace(260);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 28px Verdana, Arial, sans-serif';
    ctx.fillText('APOYO VISUAL CON PICTOGRAMAS ARASAAC:', MARGIN_X, y);
    y += 30;

    const loadedImages = await Promise.all(
      tokensToRender.map((t) => (t.imageUrl ? loadImageSafe(t.imageUrl) : Promise.resolve(null)))
    );

    const cardW = 240;
    const cardH = 220;
    const gap = 24;
    const cols = 4;

    for (let idx = 0; idx < tokensToRender.length; idx++) {
      const col = idx % cols;
      if (col === 0) {
        ensureSpace(cardH + 30);
      }
      const x = MARGIN_X + col * (cardW + gap);
      const token = tokensToRender[idx];
      const img = loadedImages[idx];

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 3;
      ctx.fillRect(x, y, cardW, cardH);
      ctx.strokeRect(x, y, cardW, cardH);

      if (img) {
        ctx.drawImage(img, x + 45, y + 12, 150, 150);
      } else {
        ctx.fillStyle = '#F1F5F9';
        ctx.fillRect(x + 20, y + 18, cardW - 40, 140);
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 20px Verdana, Arial, sans-serif';
        ctx.fillText(token.word.toUpperCase().slice(0, 12), x + 36, y + 95);
      }

      // Etiqueta inferior de la palabra
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(x, y + 172, cardW, 48);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px Verdana, Arial, sans-serif';
      const wordLabel = token.word.toUpperCase().slice(0, 15);
      ctx.fillText(wordLabel, x + 16, y + 203);

      if (col === cols - 1 || idx === tokensToRender.length - 1) {
        y += cardH + gap;
      }
    }
    y += 10;
  }

  // 7. RESUMEN DE VALIDACIÓN NORMA UNE 153101:2018 EX + HERRAMIENTA ATECA
  if (payload.guidelineChecks && payload.guidelineChecks.length > 0) {
    const ateca = summarizeChecks(payload.guidelineChecks);
    ensureSpace(120);
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2;
    ctx.fillRect(MARGIN_X, y, CONTENT_W, 92);
    ctx.strokeRect(MARGIN_X, y, CONTENT_W, 92);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 21px Verdana, Arial, sans-serif';
    ctx.fillText(
      `Verificación Norma UNE 153101:2018 EX y ATECA: ${ateca.passed}/${ateca.total} criterios cumplidos (${ateca.score}%)`,
      MARGIN_X + 22,
      y + 38
    );
    ctx.fillStyle = '#475569';
    ctx.font = '18px Verdana, Arial, sans-serif';
    ctx.fillText(
      'Pictogramas propiedad del Gobierno de Aragón (ARASAAC - Licencia CC BY-NC-SA 4.0).',
      MARGIN_X + 22,
      y + 70
    );
  }

  // 8. PIE DE PÁGINA EN TODAS LAS PÁGINAS (Numeración y Créditos La Salle Bilbao)
  const totalPages = canvases.length;
  const dateStr = new Date().toLocaleDateString('es-ES');
  for (let i = 0; i < totalPages; i++) {
    const pCtx = canvases[i].getContext('2d')!;
    pCtx.fillStyle = '#0F172A';
    pCtx.fillRect(0, PAGE_H - 74, PAGE_W, 74);

    pCtx.fillStyle = '#E2E8F0';
    pCtx.font = 'bold 17px Verdana, Arial, sans-serif';
    pCtx.fillText(
      `La Salle Bilbao • Ana Jaramillo, Ane Santiago, Anne Isabel Romero, Ander Seco, Jon Andoni Bernal`,
      MARGIN_X,
      PAGE_H - 30
    );

    pCtx.fillStyle = '#FACC15';
    pCtx.font = 'bold 18px Verdana, Arial, sans-serif';
    pCtx.fillText(
      `Fecha: ${dateStr}  |  Página ${i + 1} de ${totalPages}`,
      PAGE_W - MARGIN_X - 290,
      PAGE_H - 30
    );
  }

  // Construir el archivo binario PDF y descargarlo automáticamente
  const jpegPages = canvases.map((c) => ({
    dataUrl: c.toDataURL('image/jpeg', 0.92),
    widthPx: c.width,
    heightPx: c.height
  }));

  const pdfBlob = buildPdfFromJpegPages(jpegPages);
  const url = URL.createObjectURL(pdfBlob);

  const safeFileName = (payload.title || 'Documento_Lectura_Facil')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 45);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeFileName || 'Documento_Adaptado_IA'}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
