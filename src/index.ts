// https://www.nvidia.com/da-dk/geforce/buy/

import puppeteer from 'puppeteer';

const setDomainLocalStorage = async (browser: puppeteer.Browser, url: string, localStorageValues: { [key: string]: string }) => {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', r => {
    r.respond({
      status: 200,
      contentType: 'text/plain',
      body: 'tweak me.',
    });
  });
  await page.goto(url);
  await page.evaluate((localStorageValues) => {
    Object.entries(localStorageValues).forEach(([key, value]) => {
      // @ts-ignore
      localStorage.setItem(key, value);
    })
  }, localStorageValues);
  await page.close();
};

const DEBUG = true;

const timeout = 60e3;
const tryCheckOutInterval = 30e3;

const tryCheckOut = async () => {
  
  console.log(`[${new Date().toISOString()}] Scan check`);
  const start = Date.now();


  const browser = await puppeteer.launch({
    headless: false,
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
    if(!el) return;
    
    const text = await page.evaluate(element => element.innerText, el);
    if (!(/GEFORCE.RTX.?\W30[789]0/g.test(text))) return;

    const hit = await el.$$eval('a', arr => {
      return arr.reduce((hit, el) => {
        if (!['javascript:void(0)', '#'].some(str => el.href.toLowerCase().includes(str))) return hit;
        console.log('Pass href', el.href);
        if (['se alle', 'giv mig', 'udsolgt'].some(str => el.innerText.toLowerCase().includes(str))) return hit;
        console.log('Pass text', el.innerText);
        el.click();
        return true;
      }, false)
    });

    if (hit) {
      const productName = text?.split('\n')?.[0]
      console.log(`[${new Date().toISOString()}] Product hit (${productName})! (${Date.now() - start} ms)`)
    }

    return hit;
  }


  const hits = await Promise.all([
    processProduct(mainProduct),
    ...products.map(processProduct)
  ]);
  
  if (hits.every((hit) => !hit)) {
    console.log(`[${new Date().toISOString()}] No product hits! (${Date.now() - start} ms)`);
    if (!DEBUG) {
      await browser.close();
      return false;
    }
  }

  // const 

  if (DEBUG){
    await page.waitForSelector('div[data-digital-river-id="5438793500"] a');
    const btn = await page.$('a[data-digital-river-id="5438793500"] a');
    
    await btn?.click();
  }

  console.log(`[${new Date().toISOString()}] Checking out... (${Date.now() - start} ms)`);

  await page.waitForSelector('.cart__checkout-button');
  const checkoutBtn = await page.$('.cart__checkout-button');
  await checkoutBtn?.click();

  // Billing page

  await page.waitForSelector('#btnCheckoutAsGuest');

  console.log(`[${new Date().toISOString()}] Checking out as guest... (${Date.now() - start} ms)`);
  
  await (new Promise((r) => {
    const interval = setInterval(async () => {
      try {
        const checkoutContinueBtn = await page.$('#btnCheckoutAsGuest');
        checkoutContinueBtn?.click();
      } catch { }

      try {
        const billingForm = await page.$('#dr_billingContainer');
        if(!billingForm) return;
      } catch { return }

      clearInterval(interval);
      r();

    }, 100);
  }))

  console.log(`[${new Date().toISOString()}] Filling billing form... (${Date.now() - start} ms)`);

  const billingData = {
    firstName: 'Justin',
    lastName: 'H',
    phoneNumber: '88888888',
    email: 'email@gmail.com',
    address: 'addr',
    city: 'city',
    postalCode: '4444',
    country: 'DK',
    cc: '4242424242424242',
    expMonth: '8',
    expYear: '2022',
    secCode: '444'
  }

  await page.waitForSelector('#dr_AddressEntryFields');
  await page.$eval('#billingName1', (el, value) => el.value = value, billingData.firstName);
  await page.$eval('#billingName2', (el, value) => el.value = value, billingData.lastName);
  await page.$eval('#billingPhoneNumber', (el, value) => el.value = value, billingData.phoneNumber);
  await page.$eval('#email', (el, value) => el.value = value, billingData.email);
  await page.$eval('#verEmail', (el, value) => el.value = value, billingData.email);
  await page.$eval('#billingAddress1', (el, value) => el.value = value, billingData.address);
  await page.$eval('#billingCity', (el, value) => el.value = value, billingData.city);
  await page.$eval('#billingPostalCode', (el, value) => el.value = value, billingData.postalCode);
  await page.$eval('#billingCountry', (el, value) => el.value = value, billingData.country);

  await page.$eval('#ccNum', (el, value) => el.value = value, billingData.cc);
  await page.$eval('#expirationDateMonth', (el, value) => el.value = value, billingData.expMonth); // 1 - 12
  await page.$eval('#expirationDateYear', (el, value) => el.value = value, billingData.expYear); // 2020 - 2034
  await page.$eval('#cardSecurityCode', (el, value) => el.value = value, billingData.secCode); // 2020 - 2034

  const submitBtn = await page.$('#dr_CheckoutPayment #dr_siteButtons input[type=submit]');
  await submitBtn?.click();


  await page.waitForSelector('#selectionButton');
  const verfiyAddrBtn = await page.$('#selectionButton');
  await verfiyAddrBtn?.click();


  
  await page.waitForSelector('form[name=PlaceRequisitionForm]');

  await page.waitForSelector('form[name=PlaceRequisitionForm]');
  const verifyBtn = await page.$('form[name=PlaceRequisitionForm] input[type=submit]');
  
  console.log(`[${new Date().toISOString()}] Verifying order... (${Date.now() - start} ms)`);

  if (!DEBUG) await verifyBtn?.click();

  console.log(`[${new Date().toISOString()}] Order completed! (${Date.now() - start} ms)`);

  setTimeout(async () => {
    await browser.close();
  }, 30e3);

  return true;
};

if(DEBUG) tryCheckOut();
else {

  const interval = setInterval(async () => {
    try {
      const didCheckOut = await tryCheckOut();
      if(didCheckOut) clearInterval(interval);

    } catch(err) {
      console.log('Check cycle failed');
    }
  }, tryCheckOutInterval);
}