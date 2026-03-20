FROM node:20-alpine

# Directorio de trabajo en el contenedor
WORKDIR /app

# Copia los definitions de dependencias primero para aprovechar caché
COPY package*.json ./

# Instala todas las dependencias (incluyendo devDependencies como nodemon)
RUN npm install

# Copia el resto del código
COPY . .

# Expone el puerto 3000
EXPOSE 3000

# Arranca usando nodemon para reflejar cambios automáticos
CMD ["npm", "run", "dev"]
