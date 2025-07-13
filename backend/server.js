
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Conectar a la Base de Datos
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());

// Mensaje de bienvenida en la ruta raíz
app.get('/', (req, res) => res.send('API para Autocontrol Sanitario Pro funcionando.'));

// Definir Rutas de la API
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/establishment', require('./routes/establishment.routes'));
app.use('/api/records/delivery', require('./routes/delivery.routes'));
// Aquí añadirías el resto de rutas para las otras funcionalidades

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
