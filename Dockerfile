# Dockerfile simplificado para la aplicación React
FROM node:18-alpine as build

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Build de la aplicación
RUN npm run build

# Verificar build
RUN echo "=== CONTENIDO DE DIST ===" && ls -la /app/dist/ && echo "=== FIN DIST ==="

# Etapa de producción
FROM nginx:alpine

# Limpiar directorio por defecto
RUN rm -rf /usr/share/nginx/html/*

# Copiar archivos del build
COPY --from=build /app/dist /usr/share/nginx/html

# Verificar copia (con timestamp para evitar cache)
RUN echo "=== CONTENIDO DE NGINX $(date) ===" && ls -la /usr/share/nginx/html/ && echo "=== FIN NGINX ==="

# Configuración básica de Nginx
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    error_log /var/log/nginx/error.log; \
    access_log /var/log/nginx/access.log; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Verificar configuración de Nginx
RUN nginx -t

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]