import puppeteer from 'puppeteer';
import { buildReportHtml } from './reportTemplate.js';

export async function generatePDF(reportData) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(buildReportHtml(reportData), { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

export default generatePDF;
