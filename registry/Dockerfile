FROM node:22-slim

WORKDIR /app

COPY registry/package.json registry/package-lock.json* ./
RUN npm install --production

COPY registry/ .

EXPOSE 3000

CMD ["node", "server.js"]
