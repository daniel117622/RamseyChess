# Step 1: Use Node.js version 16 for building the Angular app
FROM node:16 AS dev-stage

# Step 2: Set the working directory inside the container
WORKDIR /app

# Step 3: Copy package.json and package-lock.json to the working directory
COPY package*.json ./ 

# Step 4: Install Angular and project dependencies using npm with legacy peer deps (dev stage)
RUN npx npm@7 install --legacy-peer-deps
RUN npm install socket.io-client --legacy-peer-deps
RUN npm install uuid --legacy-peer-deps
RUN npm install md5 --legacy-peer-deps

# Step 5: Copy the rest of the application source code
COPY . .

# Step 6: Expose the port that Angular's dev server will run on (default 4200)
EXPOSE 4200

# Step 7: Start the Angular development server (ng serve)
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--disable-host-check"]


# Production Stage: Now create a production build with legacy peer deps

FROM node:16 AS prod-stage

# Step 1: Set the working directory inside the container
WORKDIR /app

# Step 2: Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Step 3: Install dependencies with legacy peer deps for production
RUN npx npm@7 install --legacy-peer-deps

# Step 4: Copy the rest of the application source code
COPY . .

# Step 5: Build Angular app for production
RUN npx ng build --configuration production


# Step 6: Expose the production port (default 80)
EXPOSE 80

# Step 7: Serve the Angular production build
CMD ["npx", "http-server", "dist", "--host", "0.0.0.0", "--port", "80"]
