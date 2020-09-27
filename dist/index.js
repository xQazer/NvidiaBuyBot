"use strict";
// https://www.nvidia.com/da-dk/geforce/buy/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = __importDefault(require("puppeteer"));
const setDomainLocalStorage = (browser, url, localStorageValues) => __awaiter(void 0, void 0, void 0, function* () {
    const page = yield browser.newPage();
    yield page.setRequestInterception(true);
    page.on('request', r => {
        r.respond({
            status: 200,
            contentType: 'text/plain',
            body: 'tweak me.',
        });
    });
    yield page.goto(url);
    yield page.evaluate((localStorageValues) => {
        Object.entries(localStorageValues).forEach(([key, value]) => {
            // @ts-ignore
            localStorage.setItem(key, value);
        });
    }, localStorageValues);
    yield page.close();
});
const DEBUG = true;
const timeout = 60e3;
const tryCheckOutInterval = 30e3;
const tryCheckOut = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`[${new Date().toISOString()}] Scan check`);
    const start = Date.now();
    const browser = yield puppeteer_1.default.launch({
        headless: false,
        timeout,
        args: ['--disable-web-security'],
        defaultViewport: { width: 1200, height: 900 }
    });
    const page = yield browser.newPage();
    yield page.setRequestInterception(true);
    page.on('request', (request) => {
        if (['image', 'stylesheet', 'font'].indexOf(request.resourceType()) !== -1) {
            request.abort();
        }
        else {
            request.continue();
        }
    });
    yield page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36');
    yield page.goto('https://www.nvidia.com/da-dk/geforce/buy/');
    yield page.waitForSelector('#founder-edition');
    const mainProduct = yield page.$('article .column');
    const products = yield page.$$('#founder-edition .column');
    const processProduct = (el) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        if (!el)
            return;
        const text = yield page.evaluate(element => element.innerText, el);
        if (!(/GEFORCE.RTX.?\W30[789]0/g.test(text)))
            return;
        const hit = yield el.$$eval('a', arr => {
            return arr.reduce((hit, el) => {
                if (!['javascript:void(0)', '#'].some(str => el.href.toLowerCase().includes(str)))
                    return hit;
                console.log('Pass href', el.href);
                if (['se alle', 'giv mig', 'udsolgt'].some(str => el.innerText.toLowerCase().includes(str)))
                    return hit;
                console.log('Pass text', el.innerText);
                el.click();
                return true;
            }, false);
        });
        if (hit) {
            const productName = (_a = text === null || text === void 0 ? void 0 : text.split('\n')) === null || _a === void 0 ? void 0 : _a[0];
            console.log(`[${new Date().toISOString()}] Product hit (${productName})! (${Date.now() - start} ms)`);
        }
        return hit;
    });
    const hits = yield Promise.all([
        processProduct(mainProduct),
        ...products.map(processProduct)
    ]);
    if (hits.every((hit) => !hit)) {
        console.log(`[${new Date().toISOString()}] No product hits! (${Date.now() - start} ms)`);
        if (!DEBUG) {
            yield browser.close();
            return false;
        }
    }
    // const 
    if (DEBUG) {
        yield page.waitForSelector('div[data-digital-river-id="5438793500"] a');
        const btn = yield page.$('a[data-digital-river-id="5438793500"] a');
        yield (btn === null || btn === void 0 ? void 0 : btn.click());
    }
    console.log(`[${new Date().toISOString()}] Checking out... (${Date.now() - start} ms)`);
    yield page.waitForSelector('.cart__checkout-button');
    const checkoutBtn = yield page.$('.cart__checkout-button');
    yield (checkoutBtn === null || checkoutBtn === void 0 ? void 0 : checkoutBtn.click());
    // Billing page
    yield page.waitForSelector('#btnCheckoutAsGuest');
    console.log(`[${new Date().toISOString()}] Checking out as guest... (${Date.now() - start} ms)`);
    yield (new Promise((r) => {
        const interval = setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const checkoutContinueBtn = yield page.$('#btnCheckoutAsGuest');
                checkoutContinueBtn === null || checkoutContinueBtn === void 0 ? void 0 : checkoutContinueBtn.click();
            }
            catch (_a) { }
            try {
                const billingForm = yield page.$('#dr_billingContainer');
                if (!billingForm)
                    return;
            }
            catch (_b) {
                return;
            }
            clearInterval(interval);
            r();
        }), 100);
    }));
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
    };
    yield page.waitForSelector('#dr_AddressEntryFields');
    yield page.$eval('#billingName1', (el, value) => el.value = value, billingData.firstName);
    yield page.$eval('#billingName2', (el, value) => el.value = value, billingData.lastName);
    yield page.$eval('#billingPhoneNumber', (el, value) => el.value = value, billingData.phoneNumber);
    yield page.$eval('#email', (el, value) => el.value = value, billingData.email);
    yield page.$eval('#verEmail', (el, value) => el.value = value, billingData.email);
    yield page.$eval('#billingAddress1', (el, value) => el.value = value, billingData.address);
    yield page.$eval('#billingCity', (el, value) => el.value = value, billingData.city);
    yield page.$eval('#billingPostalCode', (el, value) => el.value = value, billingData.postalCode);
    yield page.$eval('#billingCountry', (el, value) => el.value = value, billingData.country);
    yield page.$eval('#ccNum', (el, value) => el.value = value, billingData.cc);
    yield page.$eval('#expirationDateMonth', (el, value) => el.value = value, billingData.expMonth); // 1 - 12
    yield page.$eval('#expirationDateYear', (el, value) => el.value = value, billingData.expYear); // 2020 - 2034
    yield page.$eval('#cardSecurityCode', (el, value) => el.value = value, billingData.secCode); // 2020 - 2034
    const submitBtn = yield page.$('#dr_CheckoutPayment #dr_siteButtons input[type=submit]');
    yield (submitBtn === null || submitBtn === void 0 ? void 0 : submitBtn.click());
    yield page.waitForSelector('#selectionButton');
    const verfiyAddrBtn = yield page.$('#selectionButton');
    yield (verfiyAddrBtn === null || verfiyAddrBtn === void 0 ? void 0 : verfiyAddrBtn.click());
    yield page.waitForSelector('form[name=PlaceRequisitionForm]');
    yield page.waitForSelector('form[name=PlaceRequisitionForm]');
    const verifyBtn = yield page.$('form[name=PlaceRequisitionForm] input[type=submit]');
    console.log(`[${new Date().toISOString()}] Verifying order... (${Date.now() - start} ms)`);
    if (!DEBUG)
        yield (verifyBtn === null || verifyBtn === void 0 ? void 0 : verifyBtn.click());
    console.log(`[${new Date().toISOString()}] Order completed! (${Date.now() - start} ms)`);
    setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
        yield browser.close();
    }), 30e3);
    return true;
});
if (DEBUG)
    tryCheckOut();
else {
    const interval = setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const didCheckOut = yield tryCheckOut();
            if (didCheckOut)
                clearInterval(interval);
        }
        catch (err) {
            console.log('Check cycle failed');
        }
    }), tryCheckOutInterval);
}
//# sourceMappingURL=index.js.map