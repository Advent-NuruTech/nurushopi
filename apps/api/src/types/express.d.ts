import type {
  AccessTokenClaims,
  AdminAccessTokenClaims,
  PickupAgentAccessTokenClaims,
  VendorAccessTokenClaims,
} from "@nuru/types";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenClaims;
      admin?: AdminAccessTokenClaims;
      vendor?: VendorAccessTokenClaims;
      pickupAgent?: PickupAgentAccessTokenClaims;
      id?: string;
    }
  }
}

export {};
