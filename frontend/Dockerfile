# Step 1: Use Node.js version 16 for building the Angular app
FROM node:16 AS dev-stage

# Step 2: Set the working directory inside the container
WORKDIR /app

# Step 3: Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Step 4: Install Angular and project dependencies using npm with legacy peer deps
RUN npx npm@7 install --legacy-peer-deps
RUN npm install socket.io-client --legacy-peer-deps
RUN npm install uuid --legacy-peer-deps
# Step 5: Copy the rest of the application source code
COPY . .

# Step 6: Expose the port that Angular's dev server will run on (default 4200)
EXPOSE 4200

# Step 7: Start the Angular development server (ng serve)
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--disable-host-check"]
