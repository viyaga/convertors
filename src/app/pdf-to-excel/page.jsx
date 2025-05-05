'use client';

import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';

export default function PdfToExcelPage() {
  const [loading, setLoading] = useState(false);
  const [excelBlob, setExcelBlob] = useState(null);
  const pdfjsLibRef = useRef(null);

  useEffect(() => {
    (async () => {
      const pdfjs = await import('pdfjs-dist/build/pdf');
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
      pdfjsLibRef.current = pdfjs;
    })();
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !pdfjsLibRef.current) return;

    setLoading(true);
    setExcelBlob(null);

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLibRef.current.getDocument({ data: buffer }).promise;
    const allRows = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();

      const items = content.items
        .map((item) => ({
          str: item.str.trim(),
          x: item.transform[4],
          y: item.transform[5],
        }))
        .filter((item) => item.str);

      const rowTolerance = 2;
      const rows = {};

      for (const item of items) {
        const existingKey = Object.keys(rows).find(
          (y) => Math.abs(Number(y) - item.y) < rowTolerance
        );
        const yKey = existingKey || item.y.toFixed(1);
        if (!rows[yKey]) rows[yKey] = [];
        rows[yKey].push({ x: item.x, str: item.str });
      }

      const sortedY = Object.keys(rows)
        .map(Number)
        .sort((a, b) => b - a);

      for (const y of sortedY) {
        const row = rows[y.toFixed(1)]
          .sort((a, b) => a.x - b.x)
          .map((item) => item.str);
        allRows.push(row);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(allRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const blob = XLSX.write(wb, { bookType: 'xlsx', type: 'blob' });
    setExcelBlob(blob);
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-xl mx-auto text-center">
      <h1 className="text-2xl font-bold mb-4">📄 PDF to Excel Converter</h1>
      <input type="file" accept="application/pdf" onChange={handleFile} className="mb-4" />
      {loading && <p className="text-gray-600">Processing PDF...</p>}
      {excelBlob && (
        <a
          href={URL.createObjectURL(excelBlob)}
          download="output.xlsx"
          className="mt-4 inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          ⬇️ Download Excel
        </a>
      )}
    </div>
  );
}
