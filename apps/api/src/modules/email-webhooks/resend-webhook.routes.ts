import { Router, type Request, type Response } from "express";
import { Webhook } from "svix";
import { ZodError } from "zod";
import { env } from "../../env.js";
import { Errors } from "../../lib/errors.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { sendOk } from "../../lib/response.js";
import {
  parseResendWebhookEvent,
  processResendWebhookEvent,
} from "./resend-webhook.service.js";

export const resendWebhookRouter: Router = Router();

async function receiveResendWebhook(req: Request, res: Response): Promise<void> {
  if (!env.RESEND_WEBHOOK_SECRET) {
    throw Errors.internal("Resend webhook signing secret is not configured.");
  }
  if (!Buffer.isBuffer(req.body)) {
    throw Errors.badRequest("Webhook body must be raw JSON.");
  }

  const eventId = req.get("svix-id");
  const timestamp = req.get("svix-timestamp");
  const signature = req.get("svix-signature");
  if (!eventId || !timestamp || !signature) {
    throw Errors.badRequest("Missing webhook signature headers.");
  }

  const rawBody = req.body.toString("utf8");
  try {
    new Webhook(env.RESEND_WEBHOOK_SECRET).verify(rawBody, {
      "svix-id": eventId,
      "svix-timestamp": timestamp,
      "svix-signature": signature,
    });
  } catch {
    throw Errors.badRequest("Invalid webhook signature.");
  }

  let event;
  try {
    event = parseResendWebhookEvent(JSON.parse(rawBody) as unknown);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      throw Errors.badRequest("Invalid Resend webhook payload.");
    }
    throw error;
  }

  const result = await processResendWebhookEvent(eventId, event);
  sendOk(res, { received: true, duplicate: result.duplicate });
}

resendWebhookRouter.post("/", asyncHandler(receiveResendWebhook));
