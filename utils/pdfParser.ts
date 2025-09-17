import * as pdfjsLib from 'pdfjs-dist';

// The Vite-specific '?url' import for the worker does not work in an environment
// that uses a CDN and import maps. Instead, we explicitly provide the full URL
// to the worker script from the CDN. The version is based on index.html's import map.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@5.4.149/build/pdf.worker.mjs';

export const extractTextFromPdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();

  // The type for getDocument parameters is `DocumentInitParameters`, which can accept an ArrayBuffer.
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    // The item in textContent.items is of type TextItem
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n\n'; // Add newlines between pages for separation
  }

  return fullText.trim();
};
