// // @ts-check
// import * as dotenv from "dotenv";
// dotenv.config();

// import { join } from "path";
// import { readFileSync } from "fs";
// import express from "express";
// import serveStatic from "serve-static";

// import shopify from "./shopify.js";
// import productCreator from "./product-creator.js";
// import PrivacyWebhookHandlers from "./privacy.js";

// import mongoose from "mongoose";
// import Announcement from "./models/Announcement.js";

// // Connect to MongoDB
// const mongoURI =
//   process.env.MONGO_URI ||
//   process.env.MONGO_URL ||
//   "mongodb://localhost:27017/announcement-app";
// mongoose
//   .connect(mongoURI)
//   .then(() => {
//     console.log("Connected to MongoDB!");
//   })
//   .catch((err) => {
//     console.error("MongoDB connection error:", err);
//   });

// const PORT = parseInt(
//   process.env.BACKEND_PORT || process.env.PORT || "3000",
//   10
// );

// const STATIC_PATH =
//   process.env.NODE_ENV === "production"
//     ? `${process.cwd()}/frontend/dist`
//     : `${process.cwd()}/frontend/`;

// const app = express();

// // Set up Shopify authentication and webhook handling
// app.get(shopify.config.auth.path, shopify.auth.begin());
// app.get(
//   shopify.config.auth.callbackPath,
//   shopify.auth.callback(),
//   shopify.redirectToShopifyOrAppRoot()
// );
// app.post(
//   shopify.config.webhooks.path,
//   shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
// );

// // If you are adding routes outside of the /api path, remember to
// // also add a proxy rule for them in web/frontend/vite.config.js

// app.use("/api/*", shopify.validateAuthenticatedSession());
// app.use("/api/auth", shopify.auth.begin());
// app.use("/api/auth/callback", shopify.auth.callback());

// app.use(express.json());

// app.get("/api/products/count", async (_req, res) => {
//   const client = new shopify.api.clients.Graphql({
//     session: res.locals.shopify.session,
//   });

//   const countData = await client.request(`
//     query shopifyProductCount {
//       productsCount {
//         count
//       }
//     }
//   `);

//   res.status(200).send({ count: countData.data.productsCount.count });
// });

// app.post("/api/products", async (_req, res) => {
//   let status = 200;
//   let error = null;

//   try {
//     await productCreator(res.locals.shopify.session);
//   } catch (e) {
//     const errorMsg = e instanceof Error ? e.message : String(e);
//     console.log(`Failed to process products/create: ${errorMsg}`);
//     status = 500;
//     error = errorMsg;
//   }
//   res.status(status).send({ success: status === 200, error });
// });

// // GET announcement from DB
// app.get("/api/announcement", async (_req, res) => {
//   const session = res.locals.shopify.session;

//   try {
//     const announcement = await Announcement.findOne({
//       shop: session.shop,
//     }).sort({ timestamp: -1 });
//     res
//       .status(200)
//       .send({ announcement: announcement ? announcement.text : "" });
//   } catch (err) {
//     const errorMsg = err instanceof Error ? err.message : String(err);
//     res.status(500).send({ error: errorMsg });
//   }
// });

// // POST announcement to DB and update Shopify Shop Metafield
// app.post("/api/announcement", async (req, res) => {
//   const session = res.locals.shopify.session;
//   const { text } = req.body;

//   try {
//     // 1. Save to MongoDB
//     const announcement = new Announcement({ shop: session.shop, text });
//     await announcement.save();

//     // 2. Sync to Shopify via GraphQL Admin API
//     const client = new shopify.api.clients.Graphql({
//       session,
//     });

//     // We can update the metafield for the current AppInstallation or Shop.
//     // Given the task says "Shop Metafield", we query for Shop.
//     const metafieldMutation = `
//       mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
//         metafieldsSet(metafields: $metafields) {
//           metafields {
//             key
//             namespace
//             value
//             createdAt
//             updatedAt
//           }
//           userErrors {
//             field
//             message
//             code
//           }
//         }
//       }
//     `;

//     // Wait, first we need the ID of the Shop.
//     // Or we can use the ownerId directly if we query it.
//     // A simpler way up-to-date in Shopify GraphQL for AppData is appInstallation,
//     // but a global Shop Metafield uses the Shop ID.
//     const shopQuery = `
//       query {
//         shop {
//           id
//         }
//       }
//     `;
//     const shopRes = await client.request(shopQuery);
//     const shopId = shopRes.data.shop.id;

//     const mutationRes = await client.request(metafieldMutation, {
//       variables: {
//         metafields: [
//           {
//             key: "announcement",
//             namespace: "my_app",
//             ownerId: shopId,
//             type: "single_line_text_field",
//             value: text,
//           },
//         ],
//       },
//     });

//     if (mutationRes.data.metafieldsSet.userErrors.length > 0) {
//       console.error(
//         "Metafield saving errors:",
//         mutationRes.data.metafieldsSet.userErrors
//       );
//       return res
//         .status(400)
//         .send({ error: "Failed to save metafield to Shopify." });
//     }

//     res.status(200).send({ success: true, text });
//   } catch (err) {
//     const errorMsg = err instanceof Error ? err.message : String(err);
//     console.error("Error saving announcement:", errorMsg);
//     res.status(500).send({ error: errorMsg });
//   }
// });

// app.use(shopify.cspHeaders());
// app.use(serveStatic(STATIC_PATH, { index: false }));

// app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
//   return res
//     .status(200)
//     .set("Content-Type", "text/html")
//     .send(
//       readFileSync(join(STATIC_PATH, "index.html"))
//         .toString()
//         .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
//     );
// });

// app.listen(PORT);
// @ts-check
import * as dotenv from "dotenv";
dotenv.config();

import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";

import mongoose from "mongoose";
import Announcement from "./models/Announcement.js";

// --------------------
// MongoDB Connection
// --------------------
const mongoURI =
  process.env.MONGO_URI ||
  process.env.MONGO_URL ||
  "mongodb://localhost:27017/announcement-app";

mongoose
  .connect(mongoURI)
  .then(() => console.log("Connected to MongoDB!"))
  .catch((err) => console.error("MongoDB connection error:", err));

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

// --------------------
// Shopify Auth Routes
// --------------------

app.get(shopify.config.auth.path, shopify.auth.begin());

app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);

// Root route
// app.get("/", async (req, res, next) => {
//   const { shop } = req.query;

//   if (shop) {
//     return res.redirect(`${shopify.config.auth.path}?shop=${shop}`);
//   }

//   // Health check safe response
//   return res.status(200).send("App is running");
// });

app.get("/", async (req, res) => {
  const { shop, host } = req.query;

  // If no shop param, this is probably Render health check
  if (!shop) {
    return res.status(200).send("App is running");
  }

  // If embedded app without host, redirect to OAuth
  if (!host) {
    return res.redirect(`${shopify.config.auth.path}?shop=${shop}`);
  }

  return shopify.ensureInstalledOnShop()(req, res);
});

// --------------------
// Webhooks
// --------------------

app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

// --------------------
// JSON Middleware
// --------------------

app.use(express.json());

// --------------------
// Authenticated API Routes
// --------------------

app.use("/api/*", shopify.validateAuthenticatedSession());

// Product Count
app.get("/api/products/count", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });

  const countData = await client.request(`
    query {
      productsCount {
        count
      }
    }
  `);

  res.status(200).send({ count: countData.data.productsCount.count });
});

// Create Product
app.post("/api/products", async (_req, res) => {
  try {
    await productCreator(res.locals.shopify.session);
    res.status(200).send({ success: true });
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    res.status(500).send({ success: false, error: errorMsg });
  }
});

// --------------------
// Announcement API
// --------------------

app.get("/api/announcement", async (_req, res) => {
  const session = res.locals.shopify.session;

  try {
    const announcement = await Announcement.findOne({
      shop: session.shop,
    }).sort({ timestamp: -1 });

    res.status(200).send({
      announcement: announcement ? announcement.text : "",
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).send({ error: errorMsg });
  }
});

app.post("/api/announcement", async (req, res) => {
  const session = res.locals.shopify.session;
  const { text } = req.body;

  try {
    const announcement = new Announcement({ shop: session.shop, text });
    await announcement.save();

    const client = new shopify.api.clients.Graphql({ session });

    const shopRes = await client.request(`
      query {
        shop {
          id
        }
      }
    `);

    const shopId = shopRes.data.shop.id;

    await client.request(
      `
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors {
            message
          }
        }
      }
    `,
      {
        variables: {
          metafields: [
            {
              key: "announcement",
              namespace: "my_app",
              ownerId: shopId,
              type: "single_line_text_field",
              value: text,
            },
          ],
        },
      }
    );

    res.status(200).send({ success: true, text });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).send({ error: errorMsg });
  }
});

// --------------------
// Frontend Serving (SAFE)
// --------------------

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.get("/*", async (req, res, next) => {
  const { shop, host } = req.query;

  // Prevent crash when no shop (Render health check)
  if (!shop && !host) {
    return res.status(200).send("App is running");
  }

  return shopify.ensureInstalledOnShop()(req, res, next);
});

app.get("/*", async (_req, res) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

// --------------------

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
