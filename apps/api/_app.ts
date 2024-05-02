import { PORT } from "@keyguard/database";
import * as trpcExpress from "@trpc/server/adapters/express";
import cors from "cors";
import express, { Application } from "express";

import { TRPCContext, createContextInner } from "./createContext";
import { appRouter } from "./routes";

const app: Application = express();

app.use(cors());

app.use(
  "/api",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: createContextInner as unknown as () => Promise<TRPCContext>,
  })
);

app.use(express.json());

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
});
