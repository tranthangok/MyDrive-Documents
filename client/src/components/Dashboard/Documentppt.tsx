declare global {
  interface Window {
    PptxGenJS: any;
  }
}

export const exportToPPT = async (title: string, content: string, fileName?: string) => {
  if (!window.PptxGenJS) {
    throw new Error('PptxGenJS library not loaded');
  }
  const PptxGenJS = window.PptxGenJS;
  const pptx = new PptxGenJS();
  // Slide title
  const titleSlide = pptx.addSlide();
  titleSlide.addText(title, {
    x: 1,
    y: 1.5,
    w: 8,
    h: 2,
    fontSize: 44,
    color: '0077B6',
    bold: true,
    align: 'center'
  });
  const plainText = content.replace(/<[^>]*>/g, '');
  const bulletPoints = plainText.split('\n').filter(line => line.trim() !== '');
  if (bulletPoints.length === 0) return;
  const SLIDES_COUNT = Math.ceil(bulletPoints.length / 5);
  for (let slideIdx = 0; slideIdx < SLIDES_COUNT; slideIdx++) {
    const slide = pptx.addSlide();
    const startIdx = slideIdx * 5;
    const endIdx = Math.min(startIdx + 5, bulletPoints.length);
    const slideBullets = bulletPoints.slice(startIdx, endIdx);
    slide.addText(`Slide ${slideIdx + 1}`, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 1,
      fontSize: 32,
      color: '0077B6',
      bold: true
    });
    slideBullets.forEach((point, idx) => {
      slide.addText(point, {
        x: 1,
        y: 1.8 + (idx * 0.6),
        w: 8,
        h: 0.5,
        fontSize: 18,
        bullet: true
      });
    });
  }
  const downloadFileName = fileName || `${title || 'document'}.pptx`;
  await pptx.writeFile({ fileName: downloadFileName });
};