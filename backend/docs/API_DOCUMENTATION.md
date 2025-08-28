# API Documentation - Autocontrol Sanitario Pro

## Overview

Esta documentación describe la API REST del sistema Autocontrol Sanitario Pro, una plataforma SaaS multi-tenant para la gestión de controles sanitarios en establecimientos alimentarios.

## Base URL

- **Desarrollo**: `http://localhost:5000/api`
- **Producción**: `https://api.autocontrolpro.com/api`

## Authentication

La API utiliza JWT (JSON Web Tokens) para autenticación. Incluye el token en el header `Authorization`:

```
Authorization: Bearer <your-jwt-token>
```

### Obtener Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "tu-contraseña"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_id",
      "name": "Nombre Usuario",
      "email": "usuario@ejemplo.com",
      "role": "Admin",
      "organizationId": "org_id"
    },
    "organization": {
      "id": "org_id",
      "name": "Mi Organización",
      "subdomain": "mi-org"
    }
  }
}
```

## Error Handling

La API devuelve errores en formato JSON estándar:

```json
{
  "success": false,
  "message": "Descripción del error",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Códigos de Estado HTTP

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Rate Limiting

La API implementa límites de velocidad:

- **API General**: 100 requests por 15 minutos
- **Autenticación**: 5 requests por 15 minutos
- **Registro**: 3 requests por hora
- **Reset Password**: 3 requests por hora

## Endpoints

### Authentication

#### POST /api/auth/register
Registra un nuevo usuario y crea una organización.

**Request Body:**
```json
{
  "name": "Nombre Usuario",
  "email": "usuario@ejemplo.com",
  "password": "contraseña-segura",
  "organizationName": "Mi Restaurante"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "data": {
    "token": "jwt-token",
    "refreshToken": "refresh-token",
    "user": { /* user object */ },
    "organization": { /* organization object */ }
  }
}
```

#### POST /api/auth/login
Autentica un usuario existente.

**Request Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña"
}
```

#### POST /api/auth/forgot-password
Solicita restablecimiento de contraseña.

**Request Body:**
```json
{
  "email": "usuario@ejemplo.com"
}
```

#### POST /api/auth/reset-password
Restablece la contraseña con token.

**Request Body:**
```json
{
  "token": "reset-token",
  "password": "nueva-contraseña"
}
```

### Organization Management

#### GET /api/organization/profile
Obtiene información de la organización actual.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "org_id",
    "name": "Mi Organización",
    "subdomain": "mi-org",
    "settings": {
      "establishmentInfo": {
        "name": "Mi Restaurante",
        "address": "Calle Principal 123",
        "city": "Madrid",
        "phone": "+34 123 456 789"
      }
    },
    "subscription": {
      "plan": "basic",
      "status": "active"
    }
  }
}
```

#### PUT /api/organization/profile
Actualiza información de la organización.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Nuevo Nombre",
  "settings": {
    "establishmentInfo": {
      "name": "Restaurante Actualizado",
      "address": "Nueva Dirección 456"
    }
  }
}
```

#### GET /api/organization/users
Lista usuarios de la organización (solo administradores).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Número de página (default: 1)
- `limit` (optional): Elementos por página (default: 10)
- `role` (optional): Filtrar por rol (Admin, User, ReadOnly)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_id",
        "name": "Usuario",
        "email": "usuario@ejemplo.com",
        "role": "User",
        "isActive": true,
        "lastLogin": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

#### POST /api/organization/users/invite
Invita un nuevo usuario a la organización.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "email": "nuevo@usuario.com",
  "role": "User",
  "name": "Nuevo Usuario"
}
```

### Analytics

#### GET /api/analytics/organization
Obtiene análisis de la organización.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `timeRange` (optional): Rango de tiempo (1d, 7d, 30d, 90d, 1y)

**Response:**
```json
{
  "success": true,
  "data": {
    "organizationId": "org_id",
    "timeRange": "30d",
    "analytics": [
      {
        "_id": "user_login",
        "totalEvents": 150,
        "avgDuration": 250,
        "dailyStats": [
          {
            "date": "2024-01-15",
            "count": 12,
            "uniqueUsers": 8
          }
        ]
      }
    ]
  }
}
```

#### GET /api/analytics/dashboard
Obtiene métricas del dashboard.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `timeRange` (optional): Rango de tiempo

#### POST /api/analytics/track
Registra un evento personalizado.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "eventType": "feature_used",
  "data": {
    "feature": "export_data",
    "format": "csv"
  }
}
```

### Monitoring

#### GET /api/monitoring/health
Obtiene estado de salud del sistema (solo administradores).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "message": "All systems operational",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "metrics": {
      "cpu": { "usage": 45.2 },
      "memory": { "usage": 67.8 },
      "database": { "responseTime": 25 }
    }
  }
}
```

#### GET /api/monitoring/metrics
Obtiene métricas históricas del sistema.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `timeRange` (optional): Rango de tiempo (1h, 6h, 24h, 7d, 30d)

#### GET /api/monitoring/alerts
Obtiene alertas recientes del sistema.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (optional): Número máximo de alertas (default: 50)
- `severity` (optional): Filtrar por severidad (low, medium, high, critical)

### Audit

#### GET /api/audit/logs
Obtiene logs de auditoría.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Número de página
- `limit` (optional): Elementos por página
- `action` (optional): Filtrar por acción
- `userId` (optional): Filtrar por usuario
- `startDate` (optional): Fecha de inicio (ISO 8601)
- `endDate` (optional): Fecha de fin (ISO 8601)

## Data Models

### User
```json
{
  "id": "string",
  "organizationId": "string",
  "email": "string",
  "name": "string",
  "role": "Admin | User | ReadOnly",
  "isActive": "boolean",
  "isEmailVerified": "boolean",
  "lastLogin": "date",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### Organization
```json
{
  "id": "string",
  "name": "string",
  "subdomain": "string",
  "settings": {
    "establishmentInfo": {
      "name": "string",
      "address": "string",
      "city": "string",
      "postalCode": "string",
      "phone": "string",
      "email": "string"
    },
    "branding": {
      "logo": "string",
      "primaryColor": "string",
      "secondaryColor": "string"
    }
  },
  "subscription": {
    "plan": "free | basic | premium",
    "status": "active | suspended | cancelled",
    "expiresAt": "date"
  },
  "isActive": "boolean",
  "createdAt": "date",
  "updatedAt": "date"
}
```

## SDKs and Libraries

### JavaScript/Node.js

```javascript
const axios = require('axios');

class AutocontrolAPI {
  constructor(baseURL, token) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async login(email, password) {
    const response = await this.client.post('/auth/login', {
      email,
      password
    });
    return response.data;
  }

  async getOrganizationProfile() {
    const response = await this.client.get('/organization/profile');
    return response.data;
  }

  async getAnalytics(timeRange = '30d') {
    const response = await this.client.get('/analytics/organization', {
      params: { timeRange }
    });
    return response.data;
  }
}

// Uso
const api = new AutocontrolAPI('http://localhost:5000/api', 'your-token');
const profile = await api.getOrganizationProfile();
```

## Webhooks

El sistema puede enviar webhooks para eventos importantes:

### Configuración
```http
POST /api/organization/webhooks
{
  "url": "https://tu-servidor.com/webhook",
  "events": ["user.created", "record.created", "alert.triggered"],
  "secret": "webhook-secret"
}
```

### Eventos Disponibles
- `user.created` - Nuevo usuario creado
- `user.login` - Usuario inició sesión
- `record.created` - Nuevo registro creado
- `record.updated` - Registro actualizado
- `alert.triggered` - Alerta del sistema activada

### Formato del Webhook
```json
{
  "event": "user.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "organizationId": "org_id",
  "data": {
    "user": { /* user object */ }
  },
  "signature": "sha256=..."
}
```

## Testing

### Postman Collection

Importa nuestra colección de Postman para probar la API:

```bash
curl -o autocontrol-api.postman_collection.json \
  https://api.autocontrolpro.com/docs/postman-collection
```

### Ambiente de Pruebas

- **URL**: `https://api-staging.autocontrolpro.com/api`
- **Credenciales de prueba**:
  - Email: `demo@autocontrolpro.com`
  - Password: `demo123456`

## Support

- **Documentación**: https://docs.autocontrolpro.com
- **Email**: support@autocontrolpro.com
- **Status Page**: https://status.autocontrolpro.com

## Changelog

### v1.0.0 (2024-01-15)
- Lanzamiento inicial de la API
- Autenticación JWT
- Gestión de organizaciones multi-tenant
- Sistema de análisis y monitoreo
- Auditoría completa

---

*Última actualización: 15 de enero de 2024*

## Analytics Endpoints

### GET /api/analytics/dashboard
Get analytics dashboard data for the organization.

**Authentication:** Required
**Authorization:** User must belong to organization

**Query Parameters:**
- `timeRange` (optional): Time range for analytics (1d, 7d, 30d, 90d). Default: 7d

**Response:**
```json
{
  "success": true,
  "data": {
    "dashboard": {
      "summary": {
        "totalEvents": 1250,
        "uniqueUsers": 45,
        "pageViews": 890,
        "timeRange": "7d"
      },
      "topPages": [
        { "page": "/dashboard", "views": 234 },
        { "page": "/storage", "views": 189 }
      ],
      "userActivity": [
        { "date": "2024-01-15", "events": 156, "uniqueUsers": 23 }
      ],
      "performance": {
        "avgResponseTime": 245.5,
        "maxResponseTime": 1200,
        "minResponseTime": 45,
        "totalRequests": 2340
      }
    },
    "realTime": {
      "activeUsers": 12,
      "recentEvents": 45,
      "eventsByType": {
        "page_view": 23,
        "user_action": 18,
        "business_metric": 4
      },
      "timestamp": "2024-01-15T10:30:00Z"
    }
  }
}
```

### GET /api/analytics/realtime
Get real-time analytics metrics.

**Authentication:** Required
**Authorization:** User must belong to organization

**Response:**
```json
{
  "success": true,
  "data": {
    "activeUsers": 12,
    "recentEvents": 45,
    "eventsByType": {
      "page_view": 23,
      "user_action": 18,
      "business_metric": 4
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### GET /api/analytics/events
Get analytics events for the organization.

**Authentication:** Required
**Authorization:** User must belong to organization

**Query Parameters:**
- `category` (optional): Filter by event category
- `name` (optional): Filter by event name
- `startDate` (optional): Start date for filtering (ISO string)
- `endDate` (optional): End date for filtering (ISO string)
- `limit` (optional): Number of events to return (default: 100)
- `page` (optional): Page number for pagination (default: 1)

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "_id": "event_id",
        "name": "page_view",
        "category": "navigation",
        "userId": "user_id",
        "organizationId": "org_id",
        "timestamp": "2024-01-15T10:30:00Z",
        "properties": {
          "page": "/dashboard",
          "method": "GET"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 100,
      "total": 1250,
      "pages": 13
    }
  }
}
```

### GET /api/analytics/summary
Get analytics summary for the organization.

**Authentication:** Required
**Authorization:** User must belong to organization

**Query Parameters:**
- `timeRange` (optional): Time range for summary (1d, 7d, 30d). Default: 7d

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "category": "navigation",
      "name": "page_view",
      "count": 234,
      "uniqueUsers": 45,
      "lastEvent": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### GET /api/analytics/performance
Get performance metrics for the organization.

**Authentication:** Required
**Authorization:** User must belong to organization

**Query Parameters:**
- `timeRange` (optional): Time range for metrics (1d, 7d, 30d). Default: 7d

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": [
      {
        "endpoint": "/api/organizations",
        "avgResponseTime": 245.67,
        "maxResponseTime": 1200,
        "minResponseTime": 45,
        "totalRequests": 156,
        "errorCount": 2,
        "errorRate": 1.28
      }
    ],
    "timeRange": "7d"
  }
}
```

### POST /api/analytics/track
Manually track an analytics event.

**Authentication:** Required
**Authorization:** User must belong to organization

**Request Body:**
```json
{
  "name": "custom_event",
  "category": "business",
  "properties": {
    "action": "feature_used",
    "feature": "export_data",
    "value": 1
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event tracked successfully"
}
```

### DELETE /api/analytics/cleanup
Clean old analytics data (Admin only).

**Authentication:** Required
**Authorization:** Admin role required

**Request Body:**
```json
{
  "daysToKeep": 90
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cleaned 1250 old analytics events",
  "data": {
    "deletedCount": 1250,
    "daysToKeep": 90
  }
}
```

## Monitoring Endpoints

### GET /api/monitoring/health
Get basic system health status (public endpoint for load balancers).

**Authentication:** Not required

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "issues": [],
  "uptime": 86400
}
```

### GET /api/monitoring/status
Get detailed system status information.

**Authentication:** Required
**Authorization:** Admin role required

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "issues": [],
    "timestamp": "2024-01-15T10:30:00Z",
    "metrics": {
      "cpu": { "usage": 45.2 },
      "memory": { "usage": 67.8 },
      "database": { "connection": { "readyState": 1 } }
    },
    "recentAlerts": 0
  }
}
```

### GET /api/monitoring/dashboard
Get comprehensive monitoring dashboard data.

**Authentication:** Required
**Authorization:** Admin role required

**Response:**
```json
{
  "success": true,
  "data": {
    "health": {
      "status": "healthy",
      "issues": [],
      "timestamp": "2024-01-15T10:30:00Z"
    },
    "metrics": {
      "system": [
        {
          "timestamp": "2024-01-15T10:30:00Z",
          "cpu": { "usage": 45.2, "cores": 4 },
          "memory": { "usage": 67.8, "total": 8589934592 },
          "database": { "connection": { "readyState": 1 } }
        }
      ]
    },
    "alerts": [],
    "thresholds": {
      "cpu": 80,
      "memory": 85,
      "responseTime": 2000,
      "errorRate": 5
    }
  }
}
```

### GET /api/monitoring/metrics
Get system metrics.

**Authentication:** Required
**Authorization:** Admin role required

**Query Parameters:**
- `type` (optional): Type of metrics (default: system)
- `limit` (optional): Number of metrics to return (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "system",
    "metrics": [
      {
        "timestamp": "2024-01-15T10:30:00Z",
        "cpu": { "usage": 45.2, "cores": 4 },
        "memory": { "usage": 67.8, "total": 8589934592 }
      }
    ],
    "count": 20
  }
}
```

### GET /api/monitoring/alerts
Get system alerts.

**Authentication:** Required
**Authorization:** Admin role required

**Query Parameters:**
- `severity` (optional): Filter by alert severity (info, warning, critical)
- `limit` (optional): Number of alerts to return (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "type": "cpu_high",
        "severity": "warning",
        "message": "High CPU usage: 85.2%",
        "timestamp": "2024-01-15T10:30:00Z",
        "value": 85.2,
        "threshold": 80
      }
    ],
    "count": 1,
    "total": 5
  }
}
```

### PUT /api/monitoring/thresholds
Update monitoring alert thresholds.

**Authentication:** Required
**Authorization:** Admin role required

**Request Body:**
```json
{
  "cpu": 85,
  "memory": 90,
  "responseTime": 3000,
  "errorRate": 10
}
```

**Response:**
```json
{
  "success": true,
  "message": "Alert thresholds updated successfully",
  "data": {
    "cpu": 85,
    "memory": 90,
    "responseTime": 3000,
    "errorRate": 10,
    "diskSpace": 90
  }
}
```

### POST /api/monitoring/test-alert
Send a test alert to verify the alerting system.

**Authentication:** Required
**Authorization:** Admin role required

**Request Body:**
```json
{
  "type": "test",
  "severity": "warning",
  "message": "Test alert message"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test alert sent successfully",
  "data": {
    "type": "test",
    "severity": "warning",
    "message": "Test alert message",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Error Codes

### Common Error Responses

All endpoints may return the following error responses:

**400 Bad Request**
```json
{
  "success": false,
  "message": "Invalid request data",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

**401 Unauthorized**
```json
{
  "success": false,
  "message": "Authentication required"
}
```

**403 Forbidden**
```json
{
  "success": false,
  "message": "Access denied. Insufficient permissions."
}
```

**404 Not Found**
```json
{
  "success": false,
  "message": "Resource not found"
}
```

**429 Too Many Requests**
```json
{
  "success": false,
  "message": "Rate limit exceeded. Please try again later."
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Authentication endpoints**: 5 requests per minute per IP
- **General API endpoints**: 100 requests per minute per user
- **Analytics tracking**: 1000 requests per minute per organization

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)

## Webhooks

The system supports webhooks for real-time notifications:

### Organization Events
- `organization.created`: When a new organization is created
- `organization.updated`: When organization settings are modified
- `organization.user.invited`: When a user is invited to an organization
- `organization.user.joined`: When a user accepts an invitation

### System Events
- `system.alert`: When a system alert is triggered
- `system.maintenance`: When system maintenance is scheduled

### Webhook Payload Format
```json
{
  "event": "organization.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "organizationId": "org_id",
    "organization": {
      "name": "Company Name",
      "subdomain": "company"
    }
  },
  "signature": "sha256=signature_hash"
}
```

## SDK and Libraries

Official SDKs are available for:
- JavaScript/Node.js
- Python
- PHP
- C#/.NET

Example usage (JavaScript):
```javascript
import { AutoControlAPI } from '@autocontrol/api-client';

const client = new AutoControlAPI({
  apiKey: 'your-api-key',
  baseURL: 'https://api.autocontrol.pro'
});

// Get organization data
const org = await client.organizations.get();

// Track analytics event
await client.analytics.track({
  name: 'feature_used',
  category: 'interaction',
  properties: { feature: 'export' }
});
```