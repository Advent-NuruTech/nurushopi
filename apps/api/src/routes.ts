import { Router } from "express";
import { sendOk } from "./lib/response.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import {
  catalogAdminRouter,
  catalogPublicRouter,
} from "./modules/catalog/catalog.routes.js";
import {
  wholesaleAdminRouter,
  wholesalePublicRouter,
} from "./modules/wholesale/wholesale.routes.js";
import {
  ordersAdminRouter,
  ordersCustomerRouter,
} from "./modules/orders/orders.routes.js";
import {
  walletAdminRouter,
  walletCustomerRouter,
} from "./modules/wallet/wallet.routes.js";
import { dashboardAdminRouter } from "./modules/dashboard/dashboard.routes.js";
import {
  reviewsAdminRouter,
  reviewsPublicRouter,
} from "./modules/reviews/reviews.routes.js";
import {
  contactPublicRouter,
  contactsAdminRouter,
  messagesAdminRouter,
  messagesCustomerRouter,
  notificationsAdminRouter,
  notificationsCustomerRouter,
} from "./modules/notifications/notifications.routes.js";
import {
  vendorsAdminRouter,
  vendorsPublicRouter,
} from "./modules/vendors/vendors.routes.js";

export const apiRouter: Router = Router();

apiRouter.get("/", (_req, res) => {
  sendOk(res, { name: "NuruShop API", version: "v1" });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/catalog", catalogPublicRouter);
apiRouter.use("/admin/catalog", catalogAdminRouter);
apiRouter.use("/wholesale", wholesalePublicRouter);
apiRouter.use("/admin/wholesale", wholesaleAdminRouter);
apiRouter.use("/orders", ordersCustomerRouter);
apiRouter.use("/admin/orders", ordersAdminRouter);
apiRouter.use("/wallet", walletCustomerRouter);
apiRouter.use("/admin/wallet", walletAdminRouter);
apiRouter.use("/admin/dashboard", dashboardAdminRouter);
apiRouter.use("/reviews", reviewsPublicRouter);
apiRouter.use("/admin/reviews", reviewsAdminRouter);
apiRouter.use("/notifications", notificationsCustomerRouter);
apiRouter.use("/messages", messagesCustomerRouter);
apiRouter.use("/contact", contactPublicRouter);
apiRouter.use("/admin/notifications", notificationsAdminRouter);
apiRouter.use("/admin/messages", messagesAdminRouter);
apiRouter.use("/admin/contacts", contactsAdminRouter);
apiRouter.use("/vendors", vendorsPublicRouter);
apiRouter.use("/admin/vendors", vendorsAdminRouter);
