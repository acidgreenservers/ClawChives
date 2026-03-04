FROM node:20-alpine

# Install SQLite dependencies just in case the app uses local SQLite as per user preference
RUN apk add --no-cache sqlite \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Enable hot module replacement polling since we use volume bind mounts
ENV CHOKIDAR_USEPOLLING=true

COPY package*.json ./

# Install dependencies
RUN npm install

# Note: Source code and rest of files are expected to be volume mounted in docker-compose.yml
# Expose Vite's default dev port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev", "--", "--host"]
