import type { AccessTokenClaims, AdminAccessTokenClaims } from "@nuru/types";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenClaims;
      admin?: AdminAccessTokenClaims;
      id?: string;
    }
  }
}

export {};
