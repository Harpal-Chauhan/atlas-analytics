import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
  internalRole?: "OPS" | null;
}

  interface Session {
    user: {
      id: string;
      activeTenantId?: string;
      internalRole?: "OPS" | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    activeTenantId?: string;
    internalRole?: "OPS" | null;
  }
}