import type { Request, Response } from "express";
import {
  bundleQuoteSchema,
  collectionCreateSchema,
  collectionMembershipSchema,
  collectionOverrideSchema,
  collectionProductsQuerySchema,
  collectionUpdateSchema,
  commerceEventBatchSchema,
  homepageSectionCreateSchema,
  homepageSectionUpdateSchema,
  promotionCreateSchema,
  notificationPreferenceSchema,
  retentionSubscriptionSchema,
} from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { sendOk } from "../../lib/response.js";
import * as merchandising from "./merchandising.service.js";
import * as retention from "./retention.service.js";

function param(req: Request, key: string): string {
  const value = req.params[key];
  if (!value) throw Errors.badRequest(`Missing ${key}.`);
  return value;
}

function adminId(req: Request): string {
  if (!req.admin) throw Errors.unauthorized();
  return req.admin.sub;
}

export async function homepage(req: Request, res: Response): Promise<void> {
  const device = req.query.device === "mobile" || req.query.device === "desktop"
    ? req.query.device
    : "all";
  const anonymousId = typeof req.query.anonymousId === "string" ? req.query.anonymousId : undefined;
  res.setHeader(
    "Cache-Control",
    req.user ? "private, no-store" : "public, s-maxage=60, stale-while-revalidate=300",
  );
  sendOk(res, await merchandising.getHomepage({ userId: req.user?.sub, anonymousId, device }));
}

export async function publicCollections(_req: Request, res: Response): Promise<void> {
  sendOk(res, { collections: await merchandising.listCollections({ activeOnly: true }) });
}

export async function collectionProducts(req: Request, res: Response): Promise<void> {
  const query = collectionProductsQuerySchema.parse(req.query);
  res.setHeader(
    "Cache-Control",
    req.user ? "private, no-store" : "public, s-maxage=60, stale-while-revalidate=300",
  );
  sendOk(res, await merchandising.listCollectionProducts(param(req, "idOrKey"), query, {
    userId: req.user?.sub,
  }));
}

export async function events(req: Request, res: Response): Promise<void> {
  const { events } = commerceEventBatchSchema.parse(req.body);
  sendOk(
    res,
    await merchandising.ingestEvents(events, {
      userId: req.user?.sub,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    }),
    202,
  );
}

export async function bundleQuote(req: Request, res: Response): Promise<void> {
  const input = bundleQuoteSchema.parse(req.body);
  sendOk(res, await merchandising.quoteBundle(input.bundleId, input.productIds));
}

export async function retentionPreferences(req: Request, res: Response): Promise<void> {
  if (!req.user) throw Errors.unauthorized();
  sendOk(res, { preferences: await retention.listPreferences(req.user.sub) });
}

export async function saveRetentionPreference(req: Request, res: Response): Promise<void> {
  if (!req.user) throw Errors.unauthorized();
  const input = notificationPreferenceSchema.parse(req.body);
  sendOk(res, { preference: await retention.savePreference(req.user.sub, input) });
}

export async function subscribeRetention(req: Request, res: Response): Promise<void> {
  if (!req.user) throw Errors.unauthorized();
  const input = retentionSubscriptionSchema.parse(req.body);
  sendOk(res, { subscription: await retention.subscribe(req.user.sub, input) }, 201);
}

export async function unsubscribeRetention(req: Request, res: Response): Promise<void> {
  if (!req.user) throw Errors.unauthorized();
  const input = retentionSubscriptionSchema.parse(req.body);
  await retention.unsubscribe(req.user.sub, input);
  sendOk(res, { success: true });
}

export async function adminCollections(_req: Request, res: Response): Promise<void> {
  sendOk(res, { collections: await merchandising.listCollections() });
}

export async function adminCreateCollection(req: Request, res: Response): Promise<void> {
  const input = collectionCreateSchema.parse(req.body);
  sendOk(res, { collection: await merchandising.createCollection(input, adminId(req)) }, 201);
}

export async function adminUpdateCollection(req: Request, res: Response): Promise<void> {
  const input = collectionUpdateSchema.parse(req.body);
  sendOk(res, { collection: await merchandising.updateCollection(param(req, "id"), input, adminId(req)) });
}

export async function adminUpsertMembership(req: Request, res: Response): Promise<void> {
  const input = collectionMembershipSchema.parse(req.body);
  sendOk(res, { membership: await merchandising.upsertMembership(param(req, "id"), input, adminId(req)) });
}

export async function adminRemoveMembership(req: Request, res: Response): Promise<void> {
  await merchandising.removeMembership(param(req, "id"), param(req, "productId"), adminId(req));
  sendOk(res, { success: true });
}

export async function adminCreateOverride(req: Request, res: Response): Promise<void> {
  const input = collectionOverrideSchema.parse(req.body);
  sendOk(res, { override: await merchandising.createOverride(param(req, "id"), input, adminId(req)) }, 201);
}

export async function adminHomepageSections(_req: Request, res: Response): Promise<void> {
  sendOk(res, { sections: await merchandising.listHomepageSections() });
}

export async function adminCreateHomepageSection(req: Request, res: Response): Promise<void> {
  const input = homepageSectionCreateSchema.parse(req.body);
  sendOk(res, { section: await merchandising.createHomepageSection(input, adminId(req)) }, 201);
}

export async function adminUpdateHomepageSection(req: Request, res: Response): Promise<void> {
  const input = homepageSectionUpdateSchema.parse(req.body);
  sendOk(res, { section: await merchandising.updateHomepageSection(param(req, "id"), input, adminId(req)) });
}

export async function adminCreatePromotion(req: Request, res: Response): Promise<void> {
  const input = promotionCreateSchema.parse(req.body);
  sendOk(res, { promotion: await merchandising.createPromotion(input, adminId(req)) }, 201);
}

export async function adminCollectionAnalytics(req: Request, res: Response): Promise<void> {
  const days = typeof req.query.days === "string" ? Number.parseInt(req.query.days, 10) : 30;
  sendOk(res, { analytics: await merchandising.collectionAnalytics(param(req, "id"), days) });
}
