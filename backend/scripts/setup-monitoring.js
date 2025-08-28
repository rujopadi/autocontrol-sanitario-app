#!/usr/bin/env node

/**
 * Monitoring Setup Script
 * Initializes monitoring and analytics services
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { MonitoringService } = require('../services/monitoringService');
const { AnalyticsService } = require('../services/analyticsService');

async function setupMonitoring() {
  try {
    console.log('🔧 Configurando sistema de monitoreo...');

    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/autocontrol-dev';
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Conectado a la base de datos');

    // Initialize monitoring service
    console.log('🔍 Iniciando servicio de monitoreo...');
    const monitoringInterval = parseInt(process.env.MONITORING_INTERVAL) || 60000;
    MonitoringService.startMonitoring(monitoringInterval);
    console.log(`✅ Monitoreo iniciado (intervalo: ${monitoringInterval}ms)`);

    // Collect initial metrics
    console.log('📊 Recolectando métricas iniciales...');
    await MonitoringService.collectMetrics();
    console.log('✅ Métricas iniciales recolectadas');

    // Test analytics service
    console.log('📈 Probando servicio de análisis...');
    const testEvent = {
      organizationId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      eventType: 'system_startup',
      data: {
        message: 'Sistema de monitoreo inicializado',
        version: process.env.APP_VERSION || '1.0.0'
      },
      metadata: {
        timestamp: new Date(),
        source: 'setup-script'
      }
    };
    
    await AnalyticsService.trackEvent(testEvent);
    console.log('✅ Servicio de análisis funcionando correctamente');

    // Setup cleanup job
    console.log('🧹 Configurando limpieza automática...');
    const retentionDays = parseInt(process.env.ANALYTICS_RETENTION_DAYS) || 90;
    await AnalyticsService.cleanupOldData(retentionDays);
    console.log(`✅ Limpieza configurada (retención: ${retentionDays} días)`);

    // Display configuration summary
    console.log('\n📋 Resumen de configuración:');
    console.log(`   • Intervalo de monitoreo: ${monitoringInterval}ms`);
    console.log(`   • Retención de análisis: ${retentionDays} días`);
    console.log(`   • Retención de métricas: ${process.env.METRICS_RETENTION_DAYS || 30} días`);
    console.log(`   • Base de datos: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`);

    console.log('\n🎉 Sistema de monitoreo configurado exitosamente!');
    console.log('\n📊 Accede al dashboard en: http://localhost:5000/monitoring');
    console.log('🔑 Necesitarás un token de autenticación de administrador');

    // Keep the script running for a few seconds to collect some metrics
    console.log('\n⏳ Recolectando métricas de prueba...');
    setTimeout(async () => {
      await MonitoringService.collectMetrics();
      console.log('✅ Métricas de prueba recolectadas');
      
      // Stop monitoring and exit
      MonitoringService.stopMonitoring();
      await mongoose.connection.close();
      console.log('\n✅ Configuración completada. El monitoreo se iniciará automáticamente con el servidor.');
      process.exit(0);
    }, 5000);

  } catch (error) {
    console.error('❌ Error configurando monitoreo:', error);
    process.exit(1);
  }
}

// Handle script termination
process.on('SIGINT', async () => {
  console.log('\n⏹️  Deteniendo configuración...');
  MonitoringService.stopMonitoring();
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏹️  Deteniendo configuración...');
  MonitoringService.stopMonitoring();
  await mongoose.connection.close();
  process.exit(0);
});

// Run setup
setupMonitoring();