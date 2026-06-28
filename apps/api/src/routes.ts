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
