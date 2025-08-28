// MongoDB initialization script for Docker
// This script runs when the MongoDB container starts for the first time

// Switch to the autocontrol database
db = db.getSiblingDB('autocontrol');

// Create application user with read/write permissions
db.createUser({
  user: 'autocontrol_user',
  pwd: process.env.MONGO_APP_PASSWORD || 'autocontrol_password_change_me',
  roles: [
    {
      role: 'readWrite',
      db: 'autocontrol'
    }
  ]
});

// Create collections with validation schemas
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'organizationId', 'name', 'role'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
          description: 'must be a valid email address'
        },
        password: {
          bsonType: 'string',
          minLength: 8,
          description: 'must be a string with at least 8 characters'
        },
        organizationId: {
          bsonType: 'objectId',
          description: 'must be a valid ObjectId'
        },
        name: {
          bsonType: 'string',
          minLength: 1,
          description: 'must be a non-empty string'
        },
        role: {
          bsonType: 'string',
          enum: ['Admin', 'User', 'ReadOnly'],
          description: 'must be one of the allowed roles'
        },
        isActive: {
          bsonType: 'bool',
          description: 'must be a boolean'
        },
        isEmailVerified: {
          bsonType: 'bool',
          description: 'must be a boolean'
        }
      }
    }
  }
});

db.createCollection('organizations', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name'],
      properties: {
        name: {
          bsonType: 'string',
          minLength: 1,
          description: 'must be a non-empty string'
        },
        subdomain: {
          bsonType: 'string',
          pattern: '^[a-z0-9-]+$',
          description: 'must be a valid subdomain'
        },
        isActive: {
          bsonType: 'bool',
          description: 'must be a boolean'
        }
      }
    }
  }
});

// Create indexes for better performance
print('Creating indexes...');

// User indexes
db.users.createIndex({ 'email': 1 }, { unique: true });
db.users.createIndex({ 'organizationId': 1, 'email': 1 }, { unique: true });
db.users.createIndex({ 'organizationId': 1, 'role': 1 });
db.users.createIndex({ 'emailVerificationToken': 1 }, { sparse: true });
db.users.createIndex({ 'passwordResetToken': 1 }, { sparse: true });
db.users.createIndex({ 'lastLogin': 1 });
db.users.createIndex({ 'createdAt': 1 });

// Organization indexes
db.organizations.createIndex({ 'subdomain': 1 }, { unique: true, sparse: true });
db.organizations.createIndex({ 'subscription.status': 1 });
db.organizations.createIndex({ 'subscription.expiresAt': 1 });
db.organizations.createIndex({ 'isActive': 1 });
db.organizations.createIndex({ 'createdAt': 1 });

// Business data indexes (these will be created when collections are first used)
// DeliveryRecord indexes
db.deliveryrecords.createIndex({ 'organizationId': 1, 'date': -1 });
db.deliveryrecords.createIndex({ 'organizationId': 1, 'supplier': 1 });
db.deliveryrecords.createIndex({ 'organizationId': 1, 'product': 1 });
db.deliveryrecords.createIndex({ 'organizationId': 1, 'createdBy': 1 });

// StorageRecord indexes
db.storagerecords.createIndex({ 'organizationId': 1, 'date': -1 });
db.storagerecords.createIndex({ 'organizationId': 1, 'location': 1 });
db.storagerecords.createIndex({ 'organizationId': 1, 'product': 1 });
db.storagerecords.createIndex({ 'organizationId': 1, 'createdBy': 1 });

// Escandallo indexes
db.escandallos.createIndex({ 'organizationId': 1, 'name': 1 });
db.escandallos.createIndex({ 'organizationId': 1, 'category': 1 });
db.escandallos.createIndex({ 'organizationId': 1, 'createdBy': 1 });
db.escandallos.createIndex({ 'organizationId': 1, 'updatedAt': -1 });

// TechnicalSheet indexes
db.technicalsheets.createIndex({ 'organizationId': 1, 'product': 1 });
db.technicalsheets.createIndex({ 'organizationId': 1, 'category': 1 });
db.technicalsheets.createIndex({ 'organizationId': 1, 'createdBy': 1 });

// Incident indexes
db.incidents.createIndex({ 'organizationId': 1, 'date': -1 });
db.incidents.createIndex({ 'organizationId': 1, 'type': 1 });
db.incidents.createIndex({ 'organizationId': 1, 'severity': 1 });
db.incidents.createIndex({ 'organizationId': 1, 'status': 1 });
db.incidents.createIndex({ 'organizationId': 1, 'assignedTo': 1 });

// AuditLog indexes
db.auditlogs.createIndex({ 'organizationId': 1, 'timestamp': -1 });
db.auditlogs.createIndex({ 'organizationId': 1, 'action': 1 });
db.auditlogs.createIndex({ 'organizationId': 1, 'userId': 1 });
db.auditlogs.createIndex({ 'organizationId': 1, 'resourceType': 1 });

// Compound indexes for common queries
db.deliveryrecords.createIndex({ 'organizationId': 1, 'date': -1, 'supplier': 1 });
db.storagerecords.createIndex({ 'organizationId': 1, 'date': -1, 'location': 1 });
db.incidents.createIndex({ 'organizationId': 1, 'status': 1, 'severity': 1 });

print('Database initialization completed successfully!');
print('Created collections: users, organizations');
print('Created indexes for optimal performance');
print('Application user created with readWrite permissions');