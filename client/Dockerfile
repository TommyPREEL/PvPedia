# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# VITE_SERVER_URL is baked in at build time (pass via --build-arg)
ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
