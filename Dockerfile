# Base image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy only package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install --only=production

# Copy the build artifacts
COPY dist ./dist

# Expose the port on which the app will run
EXPOSE 307

# Start the server using the production build
CMD ["npm", "run", "start:prod"]