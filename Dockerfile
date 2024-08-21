FROM node:20.5.1

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV NODE_ENV='production'
ENV DB_PASSWORD=default

EXPOSE 5000

WORKDIR /app/client

RUN npm install

RUN npm run build

WORKDIR /app

CMD [ "npm", "run", "server" ]