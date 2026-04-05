import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generatePDF(reportElement: HTMLElement, filename = 'property-analysis.pdf'): Promise<void> {
  const sections = Array.from(reportElement.querySelectorAll<HTMLElement>('[data-pdf-page]'));

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Allow any async canvas rendering (tile maps) to finish
  await new Promise((r) => setTimeout(r, 800));

  for (let i = 0; i < sections.length; i++) {
    if (i > 0) pdf.addPage();

    const canvas = await html2canvas(sections[i], {
      scale: 2,
      useCORS: true,
      backgroundColor: '#fff',
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
  }

  pdf.save(filename);
}
