"use client";

import { useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
import * as XLSX from 'xlsx';

// Ensure you copy `pdf.worker.min.mjs` into your `public/` directory
GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export default function PDFToExcelPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      const rows = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageLines = {};

        content.items.forEach((item) => {
          const y = Math.round(item.transform[5]);
          pageLines[y] = pageLines[y] || [];
          pageLines[y].push(item.str);
        });

        Object.keys(pageLines)
          .sort((a, b) => Number(b) - Number(a))
          .forEach((y) => rows.push(pageLines[y]));
      }

      // Generate Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Extracted');
      XLSX.writeFile(wb, `${file.name.replace(/\.pdf$/i, '')}_extracted.xlsx`);
    } catch (err) {
      console.error(err);
      setError('Failed to process PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-4">PDF → Excel Converter</h1>
      <input
        type="file"
        accept="application/pdf"
        onChange={handleFile}
        disabled={loading}
        className="mb-4"
      />
      {loading && <p>Processing...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <p className="text-sm text-gray-500">
        Select a PDF to extract text into an Excel file.
      </p>
    </main>
  );
}
