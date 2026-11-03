import { describe, it, expect, beforeEach, vi } from "vitest";

/* ============================================================
   Unit tests for src/lib/rbac.ts (P0-5, P1-20)
   HEAVIX-SECURITY-BASELINE-V1.md §3, §5
   HEAVIX-P0-IMPLEMENTATION-PLAN.md   STEP 3 (RBAC)
   ------------------------------------------------------------
   rbac.ts depends on `db` (Prisma client). To keep these tests
   hermetic (no live DB needed), we mock `@/lib/db` with predictable
   per-call return values. The mock is reset before each test so
   tests do not leak state into each other.

   Verifies:
     • ForbiddenError is an Error subclass with statusCode=403.
     • getUserPermissions aggregates through UserRole→Role→Permission
       and de-duplicates.
     • getUserPermissions returns [] on DB error (fail-safe).
     • hasPermission returns true/false.
     • requirePermission throws ForbiddenError when missing.
     • isAdmin returns true when UserRole has ADMIN role.
     • isAdmin falls back to legacy User.role column ("ADMIN",
       "SUPERADMIN") for unmigrated users.
     • hasRole works with single key and array of keys.
   ============================================================ */

/* ── Mock the db module ────────────────────────────────────────
   vi.mock is hoisted by Vitest before any import runs, so the
   rbac module gets the mock even though it imports `db` at the
   top of the file. We use `mockImpl` as a mutable per-test impl
   so individual tests can swap return values.
   ============================================================ */

type MockImpl = {
  userRole: {
    findMany: (args: any) => Promise<any[]>;
    findFirst: (args: any) => Promise<any | null>;
  };
  user: {
    findUnique: (args: any) => Promise<any | null>;
  };
};

let mockImpl: MockImpl;

vi.mock("@/lib/db", () => ({
  get db(): MockImpl {
    return mockImpl;
  },
}));

// Import AFTER vi.mock so the rbac module picks up the mock.
const { ForbiddenError, getUserPermissions, hasPermission, requirePermission, isAdmin, hasRole } =
  await import("@/lib/rbac");

beforeEach(() => {
  // Default: empty results so tests start from a known state.
  mockImpl = {
    userRole: {
      findMany: async () => [],
      findFirst: async () => null,
    },
    user: {
      findUnique: async () => null,
    },
  };
});

describe("ForbiddenError", () => {
  it("is an Error subclass with statusCode=403", () => {
    const e = new ForbiddenError("nope");
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("ForbiddenError");
    expect(e.statusCode).toBe(403);
    expect(e.message).toBe("nope");
  });

  it("has a default message", () => {
    const e = new ForbiddenError();
    expect(e.message).toBe("Forbidden");
  });
});

describe("getUserPermissions", () => {
  it("aggregates permissions through UserRole→Role→Permission and de-duplicates", async () => {
    mockImpl.userRole.findMany = async () => [
      {
        role: {
          permissions: [
            { permission: { key: "listing.read" } },
            { permission: { key: "listing.publish" } },
          ],
        },
      },
      {
        role: {
          permissions: [
            { permission: { key: "listing.read" } }, // duplicate
            { permission: { key: "brand.read" } },
          ],
        },
      },
    ];

    const perms = await getUserPermissions("user-1");
    expect(perms.sort()).toEqual(["brand.read", "listing.publish", "listing.read"]);
  });

  it("returns [] when the user has no roles", async () => {
    mockImpl.userRole.findMany = async () => [];
    expect(await getUserPermissions("user-no-roles")).toEqual([]);
  });

  it("returns [] on DB error (fail-safe — never throws)", async () => {
    mockImpl.userRole.findMany = async () => {
      throw new Error("DB down");
    };
    expect(await getUserPermissions("user-err")).toEqual([]);
  });
});

describe("hasPermission", () => {
  it("returns true when the user has the permission", async () => {
    mockImpl.userRole.findMany = async () => [
      {
        role: {
          permissions: [{ permission: { key: "listing.publish" } }],
        },
      },
    ];
    expect(await hasPermission("user-1", "listing.publish")).toBe(true);
  });

  it("returns false when the user lacks the permission", async () => {
    mockImpl.userRole.findMany = async () => [
      {
        role: {
          permissions: [{ permission: { key: "listing.read" } }],
        },
      },
    ];
    expect(await hasPermission("user-1", "listing.publish")).toBe(false);
  });
});

describe("requirePermission", () => {
  it("resolves silently when the user has the permission", async () => {
    mockImpl.userRole.findMany = async () => [
      {
        role: {
          permissions: [{ permission: { key: "taxonomy.write" } }],
        },
      },
    ];
    await expect(requirePermission("user-1", "taxonomy.write")).resolves.toBeUndefined();
  });

  it("throws ForbiddenError when the user lacks the permission", async () => {
    mockImpl.userRole.findMany = async () => [];
    await expect(requirePermission("user-1", "taxonomy.write")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("the thrown ForbiddenError mentions the required permission", async () => {
    mockImpl.userRole.findMany = async () => [];
    try {
      await requirePermission("user-1", "user.suspend");
      throw new Error("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(ForbiddenError);
      expect(e.message).toContain("user.suspend");
    }
  });
});

describe("isAdmin", () => {
  it("returns true when the user has an ADMIN UserRole", async () => {
    mockImpl.userRole.findFirst = async () => ({ id: "ur-1" });
    expect(await isAdmin("user-1")).toBe(true);
  });

  it("falls back to legacy User.role='ADMIN'", async () => {
    mockImpl.userRole.findFirst = async () => null;
    mockImpl.user.findUnique = async () => ({ role: "ADMIN" });
    expect(await isAdmin("user-legacy-admin")).toBe(true);
  });

  it("falls back to legacy User.role='SUPERADMIN' (case-insensitive)", async () => {
    mockImpl.userRole.findFirst = async () => null;
    mockImpl.user.findUnique = async () => ({ role: "superadmin" });
    expect(await isAdmin("user-legacy-super")).toBe(true);
  });

  it("returns false for a BUYER (no ADMIN role, no legacy fallback)", async () => {
    mockImpl.userRole.findFirst = async () => null;
    mockImpl.user.findUnique = async () => ({ role: "BUYER" });
    expect(await isAdmin("user-buyer")).toBe(false);
  });

  it("returns false when the user does not exist", async () => {
    mockImpl.userRole.findFirst = async () => null;
    mockImpl.user.findUnique = async () => null;
    expect(await isAdmin("nonexistent")).toBe(false);
  });

  it("returns false on DB error (fail-safe)", async () => {
    mockImpl.userRole.findFirst = async () => {
      throw new Error("DB down");
    };
    mockImpl.user.findUnique = async () => {
      throw new Error("DB down");
    };
    expect(await isAdmin("user-err")).toBe(false);
  });
});

describe("hasRole", () => {
  it("returns true when the user has the role (single key)", async () => {
    mockImpl.userRole.findFirst = async () => ({ id: "ur-1" });
    expect(await hasRole("user-1", "SELLER")).toBe(true);
  });

  it("returns true when the user has ANY of the role keys (array)", async () => {
    mockImpl.userRole.findFirst = async () => ({ id: "ur-1" });
    expect(await hasRole("user-1", ["ADMIN", "MODERATOR"])).toBe(true);
  });

  it("returns false when the user has none of the role keys", async () => {
    mockImpl.userRole.findFirst = async () => null;
    expect(await hasRole("user-1", ["ADMIN", "MODERATOR"])).toBe(false);
  });

  it("returns false for an empty array of role keys", async () => {
    expect(await hasRole("user-1", [])).toBe(false);
  });

  it("does NOT consult the legacy User.role column (exact-match only)", async () => {
    mockImpl.userRole.findFirst = async () => null;
    // Even if the user had role="ADMIN" in the legacy column, hasRole
    // should not consult it — that's the documented behavior.
    mockImpl.user.findUnique = async () => ({ role: "ADMIN" });
    expect(await hasRole("user-1", "ADMIN")).toBe(false);
  });

  it("returns false on DB error (fail-safe)", async () => {
    mockImpl.userRole.findFirst = async () => {
      throw new Error("DB down");
    };
    expect(await hasRole("user-1", "ADMIN")).toBe(false);
  });
});
