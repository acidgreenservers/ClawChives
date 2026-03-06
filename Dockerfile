FROM node:20-alpine
RUN apk add --no-cache sqlite \
    && rm -rf /var/cache/apk/*
WORKDIR /app
ENV CHOKIDAR_USEPOLLING=true
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 4545
CMD ["npm", "run", "dev", "--", "--host"]
