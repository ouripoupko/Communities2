import { jsPDF } from 'jspdf';
import type { DocElement, ElementType } from './docApi';

// ---------------------------------------------------------------------------
// PDF rendering configuration per element type
// ---------------------------------------------------------------------------
interface TypeConfig {
  fontSize: number;
  fontStyle: 'normal' | 'bold';
  indent: number;     // mm from left margin
  spaceBefore: number; // mm
  spaceAfter: number;  // mm
}

const TYPE_CONFIG: Record<ElementType, TypeConfig> = {
  title:      { fontSize: 20, fontStyle: 'bold',   indent: 0,  spaceBefore: 0,  spaceAfter: 10 },
  section:    { fontSize: 16, fontStyle: 'bold',   indent: 0,  spaceBefore: 10, spaceAfter: 4  },
  subsection: { fontSize: 13, fontStyle: 'bold',   indent: 8,  spaceBefore: 6,  spaceAfter: 3  },
  paragraph:  { fontSize: 11, fontStyle: 'bold',   indent: 16, spaceBefore: 4,  spaceAfter: 2  },
  sentence:   { fontSize: 11, fontStyle: 'normal', indent: 24, spaceBefore: 1,  spaceAfter: 1  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getChildrenOf(elements: DocElement[], parentId: string | null): DocElement[] {
  return elements
    .filter(e => e.parentId === parentId && e.type !== 'title')
    .sort((a, b) => a.order - b.order);
}

interface State { y: number }

function renderElement(
  doc: jsPDF,
  el: DocElement,
  elements: DocElement[],
  state: State,
  margin: number,
  pageW: number,
  pageH: number,
): void {
  const cfg = TYPE_CONFIG[el.type];
  doc.setFontSize(cfg.fontSize);
  doc.setFont('helvetica', cfg.fontStyle);

  const maxWidth = pageW - 2 * margin - cfg.indent;
  const lines = doc.splitTextToSize(el.text || ' ', maxWidth) as string[];
  const lineH = cfg.fontSize * 0.3528 + 1.2; // pt → mm + leading

  state.y += cfg.spaceBefore;
  if (state.y + lines.length * lineH > pageH - margin) {
    doc.addPage();
    state.y = margin;
  }
  doc.text(lines, margin + cfg.indent, state.y);
  state.y += lines.length * lineH + cfg.spaceAfter;

  for (const child of getChildrenOf(elements, el.id)) {
    renderElement(doc, child, elements, state, margin, pageW, pageH);
  }
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------
export function downloadDocumentPDF(elements: DocElement[]): void {
  const doc   = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 20;
  const pageW  = doc.internal.pageSize.getWidth();
  const pageH  = doc.internal.pageSize.getHeight();
  const state: State = { y: margin };

  // Title first
  const title = elements.find(e => e.type === 'title');
  if (title) renderElement(doc, title, elements, state, margin, pageW, pageH);

  // Top-level sections
  for (const section of getChildrenOf(elements, null)) {
    renderElement(doc, section, elements, state, margin, pageW, pageH);
  }

  const filename = (title?.text ?? 'document').toLowerCase().replace(/\s+/g, '-');
  doc.save(`${filename}.pdf`);
}
