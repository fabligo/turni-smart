import test from 'node:test';
import assert from 'node:assert/strict';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

function buildMinimalPdf() {
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n',
    '4 0 obj\n<< /Length 0 >>\nstream\n\nendstream\nendobj\n',
  ];
  let content = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(content));
    content += object;
  });

  const xrefOffset = Buffer.byteLength(content);
  content += `xref\n0 ${objects.length + 1}\n`;
  content += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    content += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  content += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  content += `startxref\n${xrefOffset}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(content));
}

test('il motore PDF apre un documento locale senza servizi esterni', async () => {
  const loadingTask = getDocument({ data: buildMinimalPdf(), disableWorker: true });
  const document = await loadingTask.promise;
  assert.equal(document.numPages, 1);
  await document.destroy();
});
