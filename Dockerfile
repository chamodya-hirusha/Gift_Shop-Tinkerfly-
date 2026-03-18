# Step 1: Build Stage
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and lock files
COPY package.json package-lock.json* bun.lock* ./

# Install dependencies
# Using npm as primary, but including bun files in copy just in case.
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
# We use --frozen-lockfile equivalent if needed, but simple npm build is fine here.
RUN npm run build

# Step 2: Runtime Stage
FROM nginx:stable-alpine

# Copy built files from the build stage to nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy our custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 3006
EXPOSE 3006

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
