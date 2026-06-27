import { Router } from "express";
import { sendOk } from "./lib/response.js";
import { authRouter } from "./modules/auth/auth.routes.js";

export const apiRouter: Router = Router();

apiRouter.get("/", (_req, res) => {
  sendOk(res, { name: "NuruShop API", version: "v1" });
});

apiRouter.use("/auth", authRouter);

// Future feature modules mount here:
// apiRouter.use("/products", productsRouter);
// apiRouter.use("/orders", ordersRouter);
// apiRouter.use("/admin", adminRouter);
