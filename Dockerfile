FROM node:24-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends poppler-utils ghostscript \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY server ./server
COPY public ./public

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
