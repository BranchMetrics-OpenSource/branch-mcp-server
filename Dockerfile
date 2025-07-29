# Stage 1: Builder
# Use a specific Node.js LTS version on Alpine for a smaller base image
FROM node:22-alpine AS builder

LABEL stage=builder
WORKDIR /app

# Copy all project files from the context to /app in the image.
# .dockerignore should be used to exclude node_modules, .git, etc. from the context.
COPY . .



# Install all dependencies (including devDependencies) and build the project.
# Using --mount for BuildKit caching of npm packages.
RUN --mount=type=cache,target=/root/.npm npm install
RUN npm run build # This executes "tsc --skipLibCheck" as per package.json

# After this stage, /app/dist contains the compiled JavaScript,
# and /app/node_modules contains all dependencies (dev and prod).

# Stage 2: Release
# Use a matching Node.js Alpine version for the final image
FROM node:22-alpine AS release

WORKDIR /app

# Copy only the compiled code from the builder stage
COPY --from=builder /app/dist ./dist/

# Copy package.json and package-lock.json to install *only* production dependencies
COPY --from=builder /app/package.json /app/package-lock.json ./

# Set NODE_ENV to production for security and performance benefits
ENV NODE_ENV=production

# Install only production dependencies using package-lock.json.
# --omit=dev ensures devDependencies are not installed.
# --ignore-scripts can be a security measure if no production post-install scripts are needed.
RUN npm ci --omit=dev --ignore-scripts

# The application now defaults to streamable-http on port 8080.
EXPOSE 8080

# IMPORTANT: The BRANCH_KEY environment variable must be provided at runtime.
# Example: docker run -p 8080:8080 -e BRANCH_KEY=your_key_here branch-mcp-image

# Default command to run the application. Using exec form (JSON array) for proper signal handling.
# Matches "main" and "start" script in package.json
ENTRYPOINT ["node", "dist/index.js"]
