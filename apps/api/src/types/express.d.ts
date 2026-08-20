import type { AccessTokenClaims, AdminAccessTokenClaims, VendorAccessTokenClaims } from "@nuru/types";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenClaims;
      admin?: AdminAccessTokenClaims;
      vendor?: VendorAccessTokenClaims;
      id?: string;
    }
  }
}

export {};
