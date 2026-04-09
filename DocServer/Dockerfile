From node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install 

COPY . .

CMD [ "npm","start" ]

EXPOSE 5000