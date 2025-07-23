# Dockerfile para el backend Node.js
FROM node:18-alpine

# Instalar wget para healthcheck
RUN apk add --no-cache wget

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --only=production

# Copiar código fuente
COPY . .

# Exponer puerto
EXPOSE 5000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=5000

# Comando por defecto
CMD ["npm", "start"]