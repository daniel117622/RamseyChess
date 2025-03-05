# Use an official Node.js runtime as a parent image
FROM node:16 AS build

# Set the working directory inside the container
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app's code
COPY . .

# Build the Angular app for production
RUN npm run build --prod

# Stage 2: Serve the app using a lightweight web server
FROM nginx:alpine

# Copy the build artifacts from the previous build stage to the Nginx container
COPY --from=build /app/dist/your-app-name /usr/share/nginx/html

# Expose port 80 for the Nginx web server
EXPOSE 80

# Start Nginx when the container starts
CMD ["nginx", "-g", "daemon off;"]
