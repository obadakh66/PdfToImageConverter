const express = require('express');
const app = express();
const pdfjsLib = require('pdfjs-dist');
const { createCanvas, loadImage } = require('canvas');
const { PDFDocumentProxy, PDFPageProxy, CanvasRenderingContext2D } = require('pdfjs-dist/legacy/build/pdf');

const fs = require('fs');

async function getPageAsBase64(pdfPath, pageNum) {
    const loadingTask = pdfjsLib.getDocument(pdfPath);
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    console.log(viewport.width);
    //const { width, height } = page.getSize();
    const canvas = createCanvas(Number(viewport.width),Number(viewport.height),'pdf');
    console.log(canvas);
   /*    canvas.width = viewport.width;
    canvas.height = viewport.height; */
    await page.render({
      canvasContext: canvas,
      viewport,
    }).promise;
    const imageData = canvas.canvas.toBuffer();
    return imageData.toString('base64');
  }

getPageAsBase64('quran.pdf', 1)
    .then(base64Data => {
        console.log(base64Data);
    })
    .catch(err => {
        console.error(err);
    });

/* app.get('/pdf-page/:pageNum', async (req, res) => {
    console.log(req.params);
  const pageNum = parseInt(req.params.pageNum, 10);
  const pdfDoc = await pdfjsLib.getDocument('1/1.pdf').promise;
  const pdfPage = await pdfDoc.getPage(pageNum);
  const scale = 1.5;
  const pageData = await pdfPage.render({ scale, canvasFactory: new pdfjsLib.CanvasFactory() });
  const imageData = pageData.toDataURL();
  res.send(imageData);
}); */

app.listen(3100, () => {
    console.log('Server is listening on port 3000');
});
