import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import * as controller from "./wishlist.controller.js";

export const wishlistRouter: Router = Router();
wishlistRouter.use(requireAuth);
wishlistRouter.get("/", asyncHandler(controller.list));
wishlistRouter.get("/:productId", asyncHandler(controller.status));
wishlistRouter.post("/", asyncHandler(controller.save));
wishlistRouter.delete("/:productId", asyncHandler(controller.remove));
