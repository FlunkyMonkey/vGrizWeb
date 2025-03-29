// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/fileManager.ts
import fs from "fs";
import path from "path";
var subscribersFilePath = path.join(process.cwd(), "data", "subscribers.txt");
function ensureDataDirExists() {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(subscribersFilePath)) {
    fs.writeFileSync(subscribersFilePath, "", "utf8");
  }
}
function getSubscribers() {
  ensureDataDirExists();
  try {
    const fileContent = fs.readFileSync(subscribersFilePath, "utf8");
    if (!fileContent.trim()) {
      return [];
    }
    return fileContent.split("\n").filter((line) => line.trim() !== "").map((line, index) => {
      const [email, timestamp2] = line.split(",");
      return {
        id: index + 1,
        email,
        createdAt: timestamp2 ? new Date(timestamp2) : /* @__PURE__ */ new Date()
      };
    });
  } catch (error) {
    console.error("Error reading subscribers file:", error);
    return [];
  }
}
function saveSubscriber(subscriber) {
  ensureDataDirExists();
  try {
    const subscribers2 = getSubscribers();
    const existingSubscriber = subscribers2.find((s) => s.email === subscriber.email);
    if (existingSubscriber) {
      return existingSubscriber;
    }
    const newSubscriber = {
      id: subscribers2.length + 1,
      email: subscriber.email,
      createdAt: /* @__PURE__ */ new Date()
    };
    fs.appendFileSync(
      subscribersFilePath,
      `${newSubscriber.email},${newSubscriber.createdAt.toISOString()}
`,
      "utf8"
    );
    return newSubscriber;
  } catch (error) {
    console.error("Error saving subscriber:", error);
    throw error;
  }
}
function getSubscriberByEmail(email) {
  const subscribers2 = getSubscribers();
  return subscribers2.find((s) => s.email === email);
}
function getSubscriberById(id) {
  const subscribers2 = getSubscribers();
  return subscribers2.find((s) => s.id === id);
}

// server/fileStorage.ts
var FileStorage = class {
  users;
  userCurrentId;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.userCurrentId = 1;
  }
  // User methods - still using in-memory storage
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = this.userCurrentId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  // Subscriber methods - using file storage
  async getSubscriber(id) {
    return getSubscriberById(id);
  }
  async getSubscriberByEmail(email) {
    return getSubscriberByEmail(email);
  }
  async createSubscriber(subscriber) {
    return saveSubscriber(subscriber);
  }
  async getAllSubscribers() {
    return getSubscribers();
  }
};
var storage = new FileStorage();

// shared/schema.ts
import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertSubscriberSchema = createInsertSchema(subscribers).pick({
  email: true
});
var subscriberFormSchema = insertSubscriberSchema.extend({
  email: z.string().email("Please enter a valid email address")
});

// server/routes.ts
import { z as z2 } from "zod";
async function registerRoutes(app2) {
  ensureDataDirExists();
  app2.post("/api/subscribers", async (req, res) => {
    try {
      const validatedData = subscriberFormSchema.parse(req.body);
      const existingSubscriber = await storage.getSubscriberByEmail(validatedData.email);
      if (existingSubscriber) {
        return res.status(409).json({
          message: "This email is already registered."
        });
      }
      const subscriber = await storage.createSubscriber(validatedData);
      return res.status(201).json({
        id: subscriber.id,
        email: subscriber.email,
        message: "Thank you for signing up!"
      });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({
          message: "Invalid data provided",
          errors: error.format()
        });
      }
      console.error("Error creating subscriber:", error);
      return res.status(500).json({
        message: "An error occurred while processing your request."
      });
    }
  });
  app2.get("/api/subscribers", async (_req, res) => {
    try {
      const subscribers2 = await storage.getAllSubscribers();
      return res.json(subscribers2);
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      return res.status(500).json({
        message: "An error occurred while retrieving subscribers."
      });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path3, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path2, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(__dirname, "client", "src"),
      "@shared": path2.resolve(__dirname, "shared")
    }
  },
  root: path2.resolve(__dirname, "client"),
  build: {
    outDir: path2.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(__dirname2, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
