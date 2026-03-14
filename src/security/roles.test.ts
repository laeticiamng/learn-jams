import { describe, it, expect } from "vitest";
import { hasPermission, getRolePermissions, isAdmin } from "./roles";

describe("roles", () => {
  describe("hasPermission", () => {
    it("user has data:own:read", () => {
      expect(hasPermission("user", "data:own:read")).toBe(true);
    });

    it("user cannot access admin dashboard", () => {
      expect(hasPermission("user", "admin:dashboard")).toBe(false);
    });

    it("admin can access admin dashboard", () => {
      expect(hasPermission("admin", "admin:dashboard")).toBe(true);
    });

    it("guardian can view child data", () => {
      expect(hasPermission("guardian", "data:child:read")).toBe(true);
    });

    it("guardian cannot generate content", () => {
      expect(hasPermission("guardian", "generate:song")).toBe(false);
    });

    it("user can generate content", () => {
      expect(hasPermission("user", "generate:song")).toBe(true);
      expect(hasPermission("user", "generate:escape")).toBe(true);
    });
  });

  describe("getRolePermissions", () => {
    it("returns all permissions for admin", () => {
      const perms = getRolePermissions("admin");
      expect(perms).toContain("admin:dashboard");
      expect(perms).toContain("data:own:read");
    });

    it("user has limited permissions", () => {
      const perms = getRolePermissions("user");
      expect(perms).not.toContain("admin:dashboard");
      expect(perms).toContain("generate:song");
    });
  });

  describe("isAdmin", () => {
    it("returns true for admin role", () => {
      expect(isAdmin({ role: "admin" })).toBe(true);
    });

    it("returns true for is_admin flag", () => {
      expect(isAdmin({ is_admin: true })).toBe(true);
    });

    it("returns false for normal user", () => {
      expect(isAdmin({ role: "user" })).toBe(false);
    });

    it("returns false for null metadata", () => {
      expect(isAdmin(null)).toBe(false);
      expect(isAdmin(undefined)).toBe(false);
    });
  });
});
