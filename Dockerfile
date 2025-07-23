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

# Verificar copia
RUN echo "=== CONTENIDO DE NGINX ===" && ls -la /usr/share/nginx/html/ && echo "=== FIN NGINX ==="

# Configuración básica de Nginx
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]