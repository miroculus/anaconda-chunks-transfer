FROM node:8.15.1-alpine

ARG NPM_TOKEN={$NPM_TOKEN}
RUN npm config set //registry.npmjs.org/:_authToken=$NPM_TOKEN

WORKDIR /src

COPY package.json ./package.json
COPY package-lock.json ./package-lock.json

RUN npm install

COPY . ./

RUN npm run standard & npm run test

RUN npx can-npm-publish --verbose & npm publish
