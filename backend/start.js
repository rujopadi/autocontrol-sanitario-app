// Script de inicio robusto para el servidor
const { spawn } = require('child_process');

console.log('🚀 Iniciando servidor backend...');
console.log('📊 Variables de entorno:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- MONGO_URI:', process.env.MONGO_URI ? 'Configurado' : 'NO CONFIGURADO');
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'Configurado' : 'NO CONFIGURADO');

// Iniciar el servidor
const server = spawn('node', ['server.js'], {
  stdio: 'inherit',
  env: process.env
});

server.on('error', (error) => {
  console.error('❌ Error al iniciar el servidor:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`🔄 Servidor terminó con código: ${code}`);
  if (code !== 0) {
    console.error('❌ El servidor terminó con error');
    process.exit(code);
  }
});

// Manejar señales de terminación
process.on('SIGTERM', () => {
  console.log('📡 Recibida señal SIGTERM, cerrando servidor...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('📡 Recibida señal SIGINT, cerrando servidor...');
  server.kill('SIGINT');
});