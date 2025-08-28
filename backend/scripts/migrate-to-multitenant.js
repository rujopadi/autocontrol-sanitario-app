const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelos
const User = require('../models/User');
const Organization = require('../models/Organization');

// Función principal de migración
async function migrateToMultiTenant() {
  try {
    console.log('🚀 Iniciando migración a multi-tenant...');
    
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    // 1. Verificar si ya hay organizaciones (migración ya ejecutada)
    const existingOrgs = await Organization.countDocuments();
    if (existingOrgs > 0) {
      console.log('⚠️ Ya existen organizaciones. La migración puede haber sido ejecutada anteriormente.');
      console.log('¿Desea continuar? (Esto puede crear organizaciones duplicadas)');
      // En un script real, aquí pedirías confirmación del usuario
    }

    // 2. Buscar usuarios existentes sin organizationId
    const usersWithoutOrg = await User.find({ 
      organizationId: { $exists: false } 
    });

    console.log(`📊 Encontrados ${usersWithoutOrg.length} usuarios sin organización`);

    if (usersWithoutOrg.length === 0) {
      console.log('✅ No hay usuarios que migrar');
      return;
    }

    // 3. Crear organizaciones para usuarios existentes
    for (const user of usersWithoutOrg) {
      console.log(`👤 Migrando usuario: ${user.email}`);

      // Crear organización para el usuario
      const organization = new Organization({
        name: `${user.name}'s Organization`,
        settings: {
          establishmentInfo: {
            name: `${user.name}'s Organization`,
            email: user.email
          }
        },
        createdBy: user._id
      });

      await organization.save();
      console.log(`🏢 Organización creada: ${organization.name} (${organization._id})`);

      // Actualizar usuario con organizationId y nuevos campos
      await User.findByIdAndUpdate(user._id, {
        $set: {
          organizationId: organization._id,
          role: user.isAdmin ? 'Admin' : 'User',
          isActive: true,
          isEmailVerified: true, // Asumir que usuarios existentes tienen email verificado
          createdBy: user._id // Auto-creado
        }
      });

      console.log(`✅ Usuario actualizado: ${user.email}`);
    }

    // 4. Migrar otros modelos de datos (si existen)
    await migrateDataModels();

    console.log('🎉 Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Conexión a MongoDB cerrada');
  }
}

// Función para migrar modelos de datos existentes
async function migrateDataModels() {
  console.log('📦 Migrando modelos de datos...');

  // Lista de modelos que necesitan organizationId
  const modelsToMigrate = [
    'DeliveryRecord',
    'StorageRecord', 
    'DailyCleaningRecord',
    'TechnicalSheet',
    'Incident',
    'CorrectiveAction'
    // Añadir más modelos según sea necesario
  ];

  for (const modelName of modelsToMigrate) {
    try {
      // Verificar si el modelo existe
      const Model = mongoose.models[modelName];
      if (!Model) {
        console.log(`⚠️ Modelo ${modelName} no encontrado, saltando...`);
        continue;
      }

      // Buscar documentos sin organizationId
      const documentsWithoutOrg = await Model.find({ 
        organizationId: { $exists: false } 
      });

      if (documentsWithoutOrg.length === 0) {
        console.log(`✅ ${modelName}: No hay documentos que migrar`);
        continue;
      }

      console.log(`📊 ${modelName}: Encontrados ${documentsWithoutOrg.length} documentos`);

      // Para cada documento, asignar a la primera organización disponible
      // En un caso real, necesitarías lógica más sofisticada para determinar
      // a qué organización pertenece cada documento
      const firstOrg = await Organization.findOne();
      if (!firstOrg) {
        console.log(`❌ No hay organizaciones disponibles para migrar ${modelName}`);
        continue;
      }

      // Actualizar todos los documentos
      const result = await Model.updateMany(
        { organizationId: { $exists: false } },
        { $set: { organizationId: firstOrg._id } }
      );

      console.log(`✅ ${modelName}: ${result.modifiedCount} documentos actualizados`);

    } catch (error) {
      console.error(`❌ Error migrando ${modelName}:`, error.message);
    }
  }
}

// Función para rollback (deshacer migración)
async function rollbackMigration() {
  try {
    console.log('🔄 Iniciando rollback de migración...');
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Eliminar todas las organizaciones
    const orgResult = await Organization.deleteMany({});
    console.log(`🗑️ Eliminadas ${orgResult.deletedCount} organizaciones`);

    // Remover campos de multi-tenant de usuarios
    const userResult = await User.updateMany(
      {},
      { 
        $unset: { 
          organizationId: 1,
          role: 1,
          isEmailVerified: 1,
          emailVerificationToken: 1,
          emailVerificationExpires: 1,
          passwordResetToken: 1,
          passwordResetExpires: 1,
          lastLogin: 1,
          loginAttempts: 1,
          lockUntil: 1,
          createdBy: 1
        }
      }
    );
    console.log(`👤 Actualizados ${userResult.modifiedCount} usuarios`);

    console.log('✅ Rollback completado');

  } catch (error) {
    console.error('❌ Error durante rollback:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'rollback') {
    rollbackMigration()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    migrateToMultiTenant()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

module.exports = {
  migrateToMultiTenant,
  rollbackMigration
};