import puppeteer from 'puppeteer';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const mailOptions = (productName: string) => ({
  from: `Luxed <${process.env.EMAIL_USER}>`,
  to: process.env.EMAIL_LIST?.split(','),
  subject: `${productName} in stock!`,
  html: `
    <h3>${productName} is now in stock!</h3>
    <a href='https://www.nvidia.com/da-dk/geforce/buy/'>Go to site</a>
  `
});


const timeout = 60e3;
const scanRate = 60e3;
 
const scan = async () => {
  
  console.log(`[${new Date().toISOString()}] Starting check...`);
  const start = Date.now();


  const browser = await puppeteer.launch({
    headless: true,
    timeout,
    args: ['--disable-web-security'],
    defaultViewport: { width: 1200, height: 900}
  });

  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (request) => {
      if (['image', 'stylesheet', 'font'].indexOf(request.resourceType()) !== -1) {
        request.abort();
      } else {
        request.continue();
      }
  });

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36');

  await page.goto('https://www.nvidia.com/da-dk/geforce/buy/');

  await page.waitForSelector('#founder-edition');

  const mainProduct = await page.$('article .column');
  const products = await page.$$('#founder-edition .column');

  const processProduct = async (el: null | puppeteer.ElementHandle<any>) => {
    if(!el) return null;

    const text = await page.evaluate(element => element.innerText, el);

    if (!(/GEFORCE.RTX.?\W30[789]0/gi.test(text))) return null;

    const hit = await el.$$eval('a', arr => {
      return arr.reduce((hit, el) => {
        if (!['javascript:void(0)', '#'].some(str => (el as any).href.toLowerCase().includes(str))) return hit;
        if (['se alle', 'giv mig', 'udsolgt'].some(str => (el as any).innerText.toLowerCase().includes(str))) return hit;
        return true;
      }, false)
    });

    if (hit) {
      const productName = text?.split('\n')?.[0]
      console.log(`[${new Date().toISOString()}] Product hit (${productName})! (${Date.now() - start} ms)`);
      return productName;
    }

    return null;
  }


  const hits = await Promise.all([
    processProduct(mainProduct),
    ...products.map(processProduct)
  ]);
  
  await browser.close();
  console.log(`[${new Date().toISOString()}] Scan completed (${Date.now() - start} ms)`);
  return hits;
};

const hitExpire = 43200000;
let lastProductHits: { [key: string]: number } = {};


setInterval(async () => {
  try {
    const hits = await scan();

    hits.forEach((product) => {
      if (!product) return;
      
      const lastProductHit = lastProductHits[product];
      if(lastProductHit && lastProductHit > Date.now() - hitExpire) return;

      console.log(`[${new Date().toISOString()}] Sending notifications for product '${product}'!`);
      
      lastProductHits[product] = Date.now();

      transporter.sendMail(mailOptions(product), (err, info) => {
        if (err) return console.error(err);
        console.log(`[${new Date().toISOString()}] Notifications send!`)
      });
    })

  } catch(err) {
    console.log('Check cycle failed');
  }
}, scanRate);