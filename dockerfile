# Dockerfile for Node.js Backend

# Use Node.js image
FROM node:18

# Set working directory
WORKDIR /backend

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose port 4000 for the backend API
EXPOSE 4000

# Start the Node.js app
CMD ["npm", "start"]