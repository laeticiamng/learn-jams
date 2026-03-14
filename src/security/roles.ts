// ============================================================
// Roles & Permissions — Role-based access control
// ============================================================

export const ROLES = ["user", "guardian", "admin", "service"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = {
  // User data
  "data:own:read": ["user", "admin", "service"],
  "data:own:write": ["user", "admin", "service"],
  "data:child:read": ["guardian", "admin", "service"],

  // Generation
  "generate:song": ["user", "admin"],
  "generate:sheet": ["user", "admin"],
  "generate:story": ["user", "admin"],
  "generate:escape": ["user", "admin"],
  "generate:video": ["user", "admin"],

  // Guardian
  "guardian:invite": ["user", "admin"],
  "guardian:accept": ["guardian"],
  "guardian:revoke": ["user", "admin"],
  "guardian:view_child": ["guardian", "admin"],

  // Billing
  "billing:checkout": ["user"],
  "billing:manage": ["user", "admin"],
  "billing:view_reports": ["admin", "service"],

  // Admin
  "admin:dashboard": ["admin"],
  "admin:margin_reports": ["admin"],
  "admin:cost_events": ["admin"],
  "admin:feature_flags": ["admin"],
  "admin:webhook_logs": ["admin"],
  "admin:security_audit": ["admin"],
  "admin:user_management": ["admin"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const allowed = PERMISSIONS[permission];
  return (allowed as readonly string[]).includes(role);
}

/**
 * Get all permissions for a role.
 */
export function getRolePermissions(role: Role): Permission[] {
  return (Object.entries(PERMISSIONS) as [Permission, readonly string[]][])
    .filter(([, roles]) => roles.includes(role))
    .map(([perm]) => perm);
}

/**
 * Check if user has admin role (for route guards).
 */
export function isAdmin(userMetadata: Record<string, unknown> | null | undefined): boolean {
  if (!userMetadata) return false;
  return userMetadata.role === "admin" || userMetadata.is_admin === true;
}
