import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import { readFile } from 'fs/promises';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function renderMapImage(): Promise<string> {
  // Launch a headless browser
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.setViewport({ width: 1344, height: 1080 });

  // Set up the HTML and CSS needed for Leaflet
  await page.setContent(
    await readFile('./rawhtml/image/screenshot.html', 'utf-8'),
  );

  // Wait for the map to load
  await page.waitForResponse('http://localhost:3000/api/typhoon');

  // Take a screenshot and save it as a base64 string
  const imageBuffer = await page.screenshot({ fullPage: false });
  await browser.close();
  // Save the image to a file
  const imagePath = './map.png';
  await fs.writeFile(imagePath, imageBuffer);
  return imagePath;
}

renderMapImage();
