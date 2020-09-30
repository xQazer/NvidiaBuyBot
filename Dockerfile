FROM buildkite/puppeteer:5.2.1

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install typescript tsc
RUN npm install

COPY . .

RUN npm run build


CMD [ "npm", "run", "start:watch" ]