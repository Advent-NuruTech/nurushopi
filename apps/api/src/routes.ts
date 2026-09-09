import { Router } from "express";
import { sendOk } from "./lib/response.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { adminAuthRouter } from "./modules/admin/admin.routes.js";
import { vendorAuthRouter } from "./modules/vendor-auth/vendor-auth.routes.js";
import {
  catalogAdminRouter,
  catalogPublicRouter,
  catalogVendorRouter,
} from "./modules/catalog/catalog.routes.js";
import {
  wholesaleAdminRouter,
  wholesalePublicRouter,
  wholesaleVendorRouter,
} from "./modules/wholesale/wholesale.routes.js";
import { ordersAdminRouter, ordersCustomerRouter } from "./modules/orders/orders.routes.js";
import { walletAdminRouter, walletCustomerRouter } from "./modules/wallet/wallet.routes.js";
import { dashboardAdminRouter } from "./modules/dashboard/dashboard.routes.js";
import { reviewsAdminRouter, reviewsPublicRouter } from "./modules/reviews/reviews.routes.js";
import {
  contactPublicRouter,
  contactsAdminRouter,
  messagesAdminRouter,
  messagesCustomerRouter,
  notificationsAdminRouter,
  notificationsCustomerRouter,
} from "./modules/notifications/notifications.routes.js";
import { vendorsAdminRouter, vendorsPublicRouter } from "./modules/vendors/vendors.routes.js";
import { pwaAdminRouter, pwaPublicRouter } from "./modules/pwa/pwa.routes.js";
import { usersAdminRouter } from "./modules/users/users.routes.js";
import { sabbathAdminRouter, sabbathPublicRouter } from "./modules/sabbath/sabbath.routes.js";
import {
  merchandisingAdminRouter,
  merchandisingPublicRouter,
  merchandisingVendorRouter,
} from "./modules/merchandising/merchandising.routes.js";
import { wishlistRouter } from "./modules/wishlist/wishlist.routes.js";
import {
  fulfillmentAdminRouter,
  fulfillmentPublicRouter,
} from "./modules/fulfillment/fulfillment.routes.js";

export const apiRouter: Router = Router();

apiRouter.get("/", (_req, res) => {
  sendOk(res, { name: "NuruShop API", version: "v1" });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/admin/auth", adminAuthRouter);
apiRouter.use("/vendor/auth", vendorAuthRouter);
apiRouter.use("/catalog", catalogPublicRouter);
apiRouter.use("/admin/catalog", catalogAdminRouter);
apiRouter.use("/vendor/catalog", catalogVendorRouter);
apiRouter.use("/wholesale", wholesalePublicRouter);
apiRouter.use("/admin/wholesale", wholesaleAdminRouter);
apiRouter.use("/vendor/wholesale", wholesaleVendorRouter);
apiRouter.use("/orders", ordersCustomerRouter);
apiRouter.use("/admin/orders", ordersAdminRouter);
apiRouter.use("/fulfillment", fulfillmentPublicRouter);
apiRouter.use("/admin/fulfillment", fulfillmentAdminRouter);
apiRouter.use("/wallet", walletCustomerRouter);
apiRouter.use("/admin/wallet", walletAdminRouter);
apiRouter.use("/admin/dashboard", dashboardAdminRouter);
apiRouter.use("/reviews", reviewsPublicRouter);
apiRouter.use("/admin/reviews", reviewsAdminRouter);
apiRouter.use("/notifications", notificationsCustomerRouter);
apiRouter.use("/wishlist", wishlistRouter);
apiRouter.use("/messages", messagesCustomerRouter);
apiRouter.use("/contact", contactPublicRouter);
apiRouter.use("/admin/notifications", notificationsAdminRouter);
apiRouter.use("/admin/messages", messagesAdminRouter);
apiRouter.use("/admin/contacts", contactsAdminRouter);
apiRouter.use("/vendors", vendorsPublicRouter);
apiRouter.use("/admin/vendors", vendorsAdminRouter);
apiRouter.use("/pwa-installs", pwaPublicRouter);
apiRouter.use("/admin/pwa-installs", pwaAdminRouter);
apiRouter.use("/sabbath-messages", sabbathPublicRouter);
apiRouter.use("/admin/sabbath-messages", sabbathAdminRouter);
apiRouter.use("/admin/users", usersAdminRouter);
apiRouter.use("/", merchandisingPublicRouter);
apiRouter.use("/admin/merchandising", merchandisingAdminRouter);
apiRouter.use("/vendor/merchandising", merchandisingVendorRouter);
