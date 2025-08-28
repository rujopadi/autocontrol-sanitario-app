# Design Document - SaaS MVP Transformation

## Overview

This design document outlines the technical architecture and implementation strategy for transforming the Autocontrol Sanitario Pro application from a single-tenant system to a professional multi-tenant SaaS platform. The design prioritizes security, data isolation, and maintainability while preserving all existing functionality.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React SPA)   │◄──►│   (Node.js)     │◄──►│   (MongoDB)     │
│                 │    │                 │    │                 │
│ • Multi-tenant  │    │ • JWT Auth      │    │ • Multi-tenant  │
│ • Organization  │    │ • Rate Limiting │    │ • Data isolation│
│ • Professional │    │ • Input Validation│   │ • Automated     │
│   UI/UX        │    │ • Audit Logging │    │   Backups       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Multi-Tenant Data Model

```
Organization (Tenant)
├── id: ObjectId
├── name: String
├── subdomain: String (unique)
├── settings: Object
├── createdAt: Date
└── isActive: Boolean

User
├── id: ObjectId
├── organizationId: ObjectId (FK)
├── email: String (unique globally)
├── password: String (hashed)
├── role: Enum ['Admin', 'User', 'ReadOnly']
├── isEmailVerified: Boolean
├── emailVerificationToken: String
├── passwordResetToken: String
├── passwordResetExpires: Date
└── lastLogin: Date

All Business Data Models
├── organizationId: ObjectId (FK) // Added to every model
├── ... existing fields
└── ... existing relationships
```

## Components and Interfaces

### 1. Authentication System

#### JWT Token Structure
```javascript
{
  userId: ObjectId,
  organizationId: ObjectId,
  role: String,
  email: String,
  iat: Number,
  exp: Number
}
```

#### Authentication Middleware
```javascript
// Validates JWT and adds user/org context to requests
const authenticateToken = (req, res, next) => {
  // Verify JWT token
  // Add user and organization to req object
  // Ensure user belongs to organization
}

const requireRole = (roles) => (req, res, next) => {
  // Check if user has required role
}
```

#### Email Service Integration
- **Service**: SendGrid or similar
- **Templates**: Welcome, Email Verification, Password Reset
- **Configuration**: Environment-based SMTP settings

### 2. Multi-Tenant Data Access Layer

#### Tenant Context Middleware
```javascript
const addTenantContext = (req, res, next) => {
  // Extract organizationId from JWT
  // Add to all database queries automatically
  // Prevent cross-tenant data access
}
```

#### Database Query Wrapper
```javascript
class TenantAwareModel {
  constructor(model, organizationId) {
    this.model = model;
    this.organizationId = organizationId;
  }
  
  find(query = {}) {
    return this.model.find({ 
      ...query, 
      organizationId: this.organizationId 
    });
  }
  
  // Similar wrappers for create, update, delete
}
```

### 3. Organization Management

#### Organization Service
```javascript
class OrganizationService {
  async createOrganization(data) {
    // Create organization
    // Generate unique subdomain
    // Set up default settings
    // Create admin user
  }
  
  async inviteUser(organizationId, email, role) {
    // Send invitation email
    // Create pending user record
    // Generate invitation token
  }
}
```

#### User Management API
- `POST /api/organizations/:id/users` - Invite user
- `GET /api/organizations/:id/users` - List organization users
- `PUT /api/organizations/:id/users/:userId` - Update user role
- `DELETE /api/organizations/:id/users/:userId` - Deactivate user

### 4. Security Enhancements

#### Input Validation
```javascript
const { body, validationResult } = require('express-validator');

const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('organizationName').trim().isLength({ min: 2, max: 100 }),
  // Handle validation errors
];
```

#### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later'
});
```

#### Security Headers
```javascript
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));
```

### 5. Frontend Architecture Changes

#### Context Providers
```javascript
// OrganizationContext.js
const OrganizationContext = createContext();

export const OrganizationProvider = ({ children }) => {
  const [organization, setOrganization] = useState(null);
  const [users, setUsers] = useState([]);
  
  // Organization management methods
  
  return (
    <OrganizationContext.Provider value={{
      organization,
      users,
      // methods
    }}>
      {children}
    </OrganizationContext.Provider>
  );
};
```

#### Enhanced Authentication Flow
```javascript
// AuthContext.js - Updated
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  
  const login = async (email, password) => {
    // Enhanced login with organization context
  };
  
  const register = async (userData, organizationData) => {
    // Registration with organization creation
  };
  
  const verifyEmail = async (token) => {
    // Email verification flow
  };
  
  const resetPassword = async (email) => {
    // Password reset initiation
  };
};
```

#### Professional UI Components
```javascript
// Components/Auth/LoginForm.js
const LoginForm = () => {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="brand-header">
          <img src="/logo.svg" alt="Autocontrol Pro" />
          <h1>Autocontrol Sanitario Pro</h1>
          <p>Plataforma profesional de control sanitario</p>
        </div>
        
        <form onSubmit={handleLogin}>
          {/* Professional form fields */}
          {/* Error handling */}
          {/* Loading states */}
        </form>
        
        <div className="auth-links">
          <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
          <Link to="/register">Crear cuenta empresarial</Link>
        </div>
      </div>
    </div>
  );
};
```

## Data Models

### Enhanced User Model
```javascript
const userSchema = new mongoose.Schema({
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true,
    index: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true 
  },
  password: { 
    type: String, 
    required: true,
    minlength: 8 
  },
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  role: { 
    type: String, 
    enum: ['Admin', 'User', 'ReadOnly'], 
    default: 'User' 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  isEmailVerified: { 
    type: Boolean, 
    default: false 
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  loginAttempts: { 
    type: Number, 
    default: 0 
  },
  lockUntil: Date
}, {
  timestamps: true
});

// Compound index for organization queries
userSchema.index({ organizationId: 1, email: 1 });
```

### Organization Model
```javascript
const organizationSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  subdomain: { 
    type: String, 
    unique: true,
    lowercase: true,
    trim: true 
  },
  settings: {
    establishmentInfo: {
      name: String,
      address: String,
      city: String,
      postalCode: String,
      phone: String,
      email: String,
      cif: String,
      sanitaryRegistry: String,
      technicalResponsible: String
    },
    branding: {
      logo: String,
      primaryColor: String,
      secondaryColor: String
    },
    features: {
      maxUsers: { type: Number, default: 10 },
      storageLimit: { type: Number, default: 1000 }, // MB
      apiCallsLimit: { type: Number, default: 10000 }
    }
  },
  subscription: {
    plan: { 
      type: String, 
      enum: ['free', 'basic', 'premium'], 
      default: 'free' 
    },
    status: { 
      type: String, 
      enum: ['active', 'suspended', 'cancelled'], 
      default: 'active' 
    },
    expiresAt: Date
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, {
  timestamps: true
});
```

### Updated Business Models
All existing models (DeliveryRecord, StorageRecord, etc.) will be updated to include:
```javascript
organizationId: { 
  type: mongoose.Schema.Types.ObjectId, 
  ref: 'Organization', 
  required: true,
  index: true 
}
```

## Error Handling

### Centralized Error Handler
```javascript
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Recurso no encontrado';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Recurso duplicado';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { message, statusCode: 400 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Error del servidor'
  });
};
```

## Testing Strategy

### Unit Tests
- Authentication functions
- Multi-tenant data access
- Input validation
- Business logic functions

### Integration Tests
- API endpoints with authentication
- Database operations with tenant isolation
- Email service integration
- File upload and processing

### Security Tests
- JWT token validation
- Cross-tenant data access prevention
- Input sanitization
- Rate limiting effectiveness

### End-to-End Tests
- Complete user registration flow
- Organization setup and management
- Multi-user scenarios
- Data isolation verification

## Deployment Architecture

### Environment Configuration
```javascript
// config/database.js
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
```

### Docker Configuration
```dockerfile
# Dockerfile - Backend
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

### Environment Variables
```bash
# Production Environment
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
JWT_EXPIRE=30d
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=...
FRONTEND_URL=https://autocontrolpro.com
```

This design provides a solid foundation for a professional SaaS application while maintaining all existing functionality and ensuring data security and isolation between tenants.