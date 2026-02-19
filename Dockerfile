# 1. Base image (Node installed already)
FROM node:18

# 2. Set working directory inside container
WORKDIR /app

# 3. Copy package files first
COPY package*.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy rest of the code
COPY . .

# 6. Expose port
EXPOSE 7777

# 7. Start the app
CMD ["npm", "start"]