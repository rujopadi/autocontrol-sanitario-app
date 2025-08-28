// Tipos adicionales para autenticación y multi-tenancy
// Estos tipos extienden los tipos existentes para compatibilidad

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Manager' | 'User';
  isAdmin: boolean;
  organizationId: string;
  organization: AuthOrganization;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: Date;
}

export interface AuthOrganization {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  subscription: {
    plan: 'free' | 'basic' | 'premium' | 'enterprise';
    status: 'active' | 'inactive' | 'suspended' | 'cancelled';
    expiresAt?: Date;
  };
  settings: {
    allowUserRegistration: boolean;
    requireEmailVerification: boolean;
    sessionTimeout: number;
  };
  branding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
}

// Función para convertir AuthUser a User (compatibilidad con Dashboard)
export function authUserToUser(authUser: AuthUser): import('../types').User {
  return {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    isAdmin: authUser.isAdmin,
  };
}

// Función para convertir User a AuthUser (si es necesario)
export function userToAuthUser(user: import('../types').User, organization: AuthOrganization): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.isAdmin ? 'Admin' : 'User',
    isAdmin: user.isAdmin || false,
    organizationId: organization.id,
    organization,
    isActive: true,
    emailVerified: true,
  };
}