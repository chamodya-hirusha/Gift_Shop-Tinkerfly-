# Step 1: Build Stage
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and lock files
COPY package.json package-lock.json* bun.lock* ./

# Install dependencies
RUN npm ci || npm install

# Copy the rest of the application
COPY . .

# Define build arguments for Vite
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_URL

# Set environment variables for the build process
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL

# Build the application
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
