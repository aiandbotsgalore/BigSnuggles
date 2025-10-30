# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files only
COPY package.json ./

# Install dependencies
RUN npm install --only=production

# Copy source code and config files (exclude pnpm files)
COPY src/ ./src/
COPY voice_config.json ./

# Expose port
EXPOSE 8000

# Set environment to production
ENV NODE_ENV=production

# Start the server
CMD ["node", "src/server.js"]
