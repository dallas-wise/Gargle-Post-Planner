// utils/pdfParser.ts
// Works with Vite + pdfjs-dist v4.
// If your build complains, read the NOTE below and switch to Option B.

import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

// Option A (recommended): import the worker as a URL asset that Vite emits
// This keeps the worker version in sync with the library you installed.
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
GlobalWorkerOptions.workerSrc = workerUrl;

// Option B (fallback): run the worker via ?worker and set workerPort instead
// import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";
// GlobalWorkerOptions.workerPort = new PdfWorker();

export async function extractTextFromPdf(file: File): Promise<string> {
  if (!file || file.size === 0) throw new Error("Empty file");

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let allText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // content.items is TextItem[]
    const pageText = (content.items as Array<{ str?: string }>).map(i => i?.str ?? "").join(" ");
    allText += pageText + "\n";
  }

  return allText.trim();
}

