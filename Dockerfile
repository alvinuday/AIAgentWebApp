FROM node:20.5.1

WORKDIR /app

COPY package*.json /app

RUN npm install

COPY . .

ENV NODE_ENV='production'
ENV DB_PASSWORD=default

EXPOSE 5000

CMD [ "npm", "run", "build-app" ]