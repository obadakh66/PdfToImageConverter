const express = require('express');
const app = express();
const port = 3000;
const fs = require('fs');
var outDir = '';
const pdfjsLib = require('pdfjs-dist');
var pdf2img = require('pdf-img-convert');
const path = require('path');
const Jimp = require('jimp');


async function getCropBox(pdfPath, pageNumber) {
    const loadingTask = pdfjsLib.getDocument(pdfPath);
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNumber);
    const viewport = await page.getViewport({ scale: 1 });
    if (!viewport) {
        throw new Error(`CropBox not defined for page ${pageNumber}`);
    }
    const box = viewport.viewBox;
    const cropBox = [box.offsetX, box.offsetY, box.offsetX + box.width, box.offsetY + box.height];
    return cropBox;
}
const origWarning = process.emitWarning;
process.emitWarning = function (...args) {
    if (args[2] !== 'DEP0005') {
        // pass any other warnings through normally
        return origWarning.apply(process, args);
    } else {
        // do nothing, eat the warning
    }
}
// Define a route for the API endpoint

app.get("/api/getquranpages", async (req, res, next) => {
    const imageUrls = [];
    res.header('Access-Control-Allow-Origin', '*');
    const pageNumber = Number(req.query.pageNumber);
    const isFull = Boolean(req.query.isFull == 'true' ? true : false);
    const isDark = Boolean(req.query.isDark == 'true' ? true : false);
    const previous = pageNumber - 1;
    const nextPage = Number(pageNumber) + 1;
    const readerId = req.query.readerId;
    const quranId = req.query.quranId;
    const cacheKey = `${readerId}_${quranId}_${pageNumber}_${isFull}_${isDark}`;
    const cacheData = getCachedData(cacheKey);
    if (cacheData) {
        res.json({ imageUrls: cacheData });
        return;
    }

    outDir = `images/${readerId}/${quranId}/`;
    cacheDir = `cache/`;
    //const pagesArray = Array.from({ length: 10 }, (_, index) => index + 1); //pageNumber == 1 ? [pageNumber, nextPage, nextPage + 1] : [previous, pageNumber, nextPage];
    try {
        fs.mkdirSync(outDir, { recursive: true });
        fs.mkdirSync(cacheDir, { recursive: true });
        fs.chmodSync(outDir, 0o777);
        fs.chmodSync(cacheDir, 0o777);
    } catch (error) {
        if (error.code !== 'EEXIST') {
            console.error(`Failed to create directory: ${outDir}`);
            res.status(500).send('Internal Server Error');
            return;
        }
    }
    const pdfPath = isFull == true ? readerId + '/' + quranId + '_full.pdf' : readerId + '/' + quranId + '.pdf';
    console.log(pdfPath);
    var cropBox = getCropBox(pdfPath, 120)
    const config = {
        // width: 100, //Number in px
        //height: 100, // Number in px
        page_numbers: [pageNumber], //pagesArray, // A list of pages to render instead of all of them
        base64: false,
        scale: 2.0,
        cropBox: cropBox,// crop the page using the CropBox coordinates
        bgcolor: '#000000'
    }
    var outputImages2 = pdf2img.convert(pdfPath, config);
    console.log(outputImages2);
    outputImages2.then(async function (outputImages) {
        //for (i = 0; i < pagesArray.length; i++) {
        console.log(outputImages);
        fs.writeFile(isFull == true ?
            isDark == true ? outDir + pageNumber + '_full_dark.png' : outDir + pageNumber + '_full.png' :
            isDark == true ? outDir + pageNumber + '_dark.png' : outDir + pageNumber + '.png', outputImages[0], async (error) => {
                if (error) {
                    console.error("Error: " + error);
                }
                if (isDark == true) {
                    const image = await Jimp.read('images/' + fileUrl);
                    image.invert().write('images/' + fileUrl);
                }
            });
        const fileUrl = isFull == true ?
            isDark == true ? `${readerId}/${quranId}/${pageNumber}_full_dark.png` : `${readerId}/${quranId}/${pageNumber}_full.png` :
            isDark == true ? `${readerId}/${quranId}/${pageNumber}_dark.png` : `${readerId}/${quranId}/${pageNumber}.png`;
        console.log(fileUrl);


        imageUrls.push({
            pageNumber: pageNumber,
            pageUrl: isFull == true ? `https://${req.get('host')}/${fileUrl}` : `https://${req.get('host')}/${fileUrl}`
        });
        //}
        fs.writeFile(`${cacheDir}/${cacheKey}.json`, JSON.stringify(imageUrls), (error) => {
            if (error) {
                console.error("Error: " + error);
            }
        });

        res.json({ imageUrls: imageUrls });

    });

});
function getCachedData(cacheKey) {
    try {
        const cacheFilePath = path.join(cacheDir, `${cacheKey}.json`);
        const cacheStats = fs.statSync(cacheFilePath);
        const cacheModifiedTime = cacheStats.mtimeMs;
        const now = new Date().getTime();
        const cacheAge = (now - cacheModifiedTime) / 1000; // convert to seconds
        if (cacheAge < 60 * 60 * 24) { // cache is valid for 24 hours
            const cacheData = fs.readFileSync(cacheFilePath, 'utf-8');
            return JSON.parse(cacheData);
        }
    } catch (error) {
        // cache file does not exist or there was an error reading it
    }
    return null;
}


app.use(express.static(`images`))
/* app.use(cors({
    origin: true,
    credentials: true
  })); */
// Start the server
app.listen(process.env.PORT ?? 3000, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
