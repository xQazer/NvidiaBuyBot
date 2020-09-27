"use strict";
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
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const transporter = nodemailer_1.default.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});
const mailOptions = (productName) => {
    var _a;
    return ({
        from: `Luxed <${process.env.EMAIL_USER}>`,
        to: (_a = process.env.EMAIL_LIST) === null || _a === void 0 ? void 0 : _a.split(','),
        subject: `${productName} in stock!`,
        html: `
    <h3>${productName} is now in stock!</h3>
    <a href='https://www.nvidia.com/da-dk/geforce/buy/'>Go to site</a>
  `
    });
};
const timeout = 60e3;
const scanRate = 60e3;
const scan = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`[${new Date().toISOString()}] Starting check...`);
    const start = Date.now();
    const browser = yield puppeteer_1.default.launch({
        headless: true,
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
            return null;
        const text = yield page.evaluate(element => element.innerText, el);
        if (!(/GEFORCE.RTX.?\W30[789]0/gi.test(text)))
            return null;
        const hit = yield el.$$eval('a', arr => {
            return arr.reduce((hit, el) => {
                if (!['javascript:void(0)', '#'].some(str => el.href.toLowerCase().includes(str)))
                    return hit;
                if (['se alle', 'giv mig', 'udsolgt'].some(str => el.innerText.toLowerCase().includes(str)))
                    return hit;
                return true;
            }, false);
        });
        if (hit) {
            const productName = (_a = text === null || text === void 0 ? void 0 : text.split('\n')) === null || _a === void 0 ? void 0 : _a[0];
            console.log(`[${new Date().toISOString()}] Product hit (${productName})! (${Date.now() - start} ms)`);
            return productName;
        }
        return null;
    });
    const hits = yield Promise.all([
        processProduct(mainProduct),
        ...products.map(processProduct)
    ]);
    yield browser.close();
    console.log(`[${new Date().toISOString()}] Scan completed (${Date.now() - start} ms)`);
    return hits;
});
const hitExpire = 43200000;
let lastProductHits = {};
setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const hits = yield scan();
        hits.forEach((product) => {
            if (!product)
                return;
            const lastProductHit = lastProductHits[product];
            if (lastProductHit && lastProductHit > Date.now() - hitExpire)
                return;
            console.log(`[${new Date().toISOString()}] Sending notifications for product '${product}'!`);
            lastProductHits[product] = Date.now();
            transporter.sendMail(mailOptions(product), (err, info) => {
                if (err)
                    return console.error(err);
                console.log(`[${new Date().toISOString()}] Notifications send!`);
            });
        });
    }
    catch (err) {
        console.log('Check cycle failed');
    }
}), scanRate);
//# sourceMappingURL=watch.js.map