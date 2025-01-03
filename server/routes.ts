import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { clinics, legalInfo, resources, pushSubscriptions } from "@db/schema";
import { eq, desc, and, or } from "drizzle-orm";
import { startClinicCrawler } from "./services/clinicCrawler";
import { broadcastLegalUpdate, getVapidPublicKey } from "./services/pushNotifications";
import { body, validationResult } from "express-validator";
import { startLegalInfoCrawler } from "./services/legalInfoCrawler";
import { generateClinicData } from "./services/clinicSeeder";
import { fetchLatestNews } from "./services/newsService";

export function registerRoutes(app: Express): Server {
  // Get dashboard updates
  app.get("/api/dashboard/updates", async (_req, res) => {
    try {
      const allStates = await db.query.legalInfo.findMany({
        orderBy: desc(legalInfo.lastVerified),
        limit: 50
      });

      const updates = [];

      // Process legal updates
      for (const state of allStates) {
        if (state.recentUpdates && Array.isArray(state.recentUpdates)) {
          for (const update of state.recentUpdates) {
            updates.push({
              id: Math.random(),
              type: "legal",
              state: state.state,
              title: update.description,
              description: update.impact || "Impact under assessment",
              timestamp: update.date,
              urgency: determineUrgency(update)
            });
          }
        }
      }

      // Add clinic updates
      const clinicsList = await db.query.clinics.findMany({
        orderBy: desc(clinics.updatedAt),
        limit: 10
      });

      for (const clinic of clinicsList) {
        updates.push({
          id: Math.random(),
          type: "clinic",
          state: clinic.state,
          title: `Update for ${clinic.name}`,
          description: `Location: ${clinic.address}. Services available.`,
          timestamp: clinic.updatedAt?.toISOString() || new Date().toISOString()
        });
      }

      // Fetch and add latest news
      const newsArticles = await fetchLatestNews();
      for (const article of newsArticles) {
        updates.push({
          id: article.id,
          type: "news",
          title: article.title,
          description: article.description,
          timestamp: article.timestamp,
          url: article.url,
          source: article.source,
          state: article.state || "National"
        });
      }

      // Sort all updates by timestamp
      updates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return res.json(updates);
    } catch (error) {
      console.error("Error fetching dashboard updates:", error);
      return res.status(500).json({ message: "Failed to fetch dashboard updates" });
    }
  });

  // Get all clinics
  app.get("/api/clinics/all", async (_req, res) => {
    try {
      const clinicsList = await db.query.clinics.findMany();
      return res.json(clinicsList);
    } catch (error) {
      console.error("Error fetching all clinics:", error);
      return res.status(500).json({ message: "Failed to fetch clinics" });
    }
  });

  // Get clinics by state
  app.get("/api/clinics/:state", async (req, res) => {
    try {
      const state = req.params.state;
      if (!state) {
        return res.status(400).json({ message: "State parameter is required" });
      }

      const clinicsList = await db.query.clinics.findMany({
        where: eq(clinics.state, state),
      });

      return res.json(clinicsList);
    } catch (error) {
      console.error("Error fetching clinics:", error);
      return res.status(500).json({ message: "Failed to fetch clinics" });
    }
  });

  // Get legal information for a specific state
  app.get("/api/legal-info/:state", async (req, res) => {
    try {
      const state = req.params.state;
      if (!state) {
        return res.status(400).json({ message: "State parameter is required" });
      }

      const stateInfo = await db.query.legalInfo.findFirst({
        where: eq(legalInfo.state, state),
      });

      if (!stateInfo) {
        return res.status(404).json({ message: "Legal information not found for this state" });
      }

      return res.json(stateInfo);
    } catch (error) {
      console.error("Error fetching legal info:", error);
      return res.status(500).json({ message: "Failed to fetch legal information" });
    }
  });

  // Get all resources
  app.get("/api/resources", async (_req, res) => {
    try {
      const resourcesList = [
        {
          id: 1,
          name: "Financial Aid Fund",
          category: "Financial Assistance",
          description: "Provides financial assistance for medical procedures and related expenses.",
          contactInfo: {
            phone: "1-800-555-0001",
            email: "aid@financialaid.org",
            hours: "Monday-Friday 9AM-5PM"
          },
          url: "https://financialaid.org"
        },
        {
          id: 2,
          name: "Healthcare Access Program",
          category: "Financial Assistance",
          description: "Assistance with healthcare costs and insurance navigation.",
          contactInfo: {
            phone: "1-800-555-0002",
            hours: "24/7"
          },
          url: "https://healthcareaccess.org"
        },
        {
          id: 3,
          name: "Counseling Services",
          category: "Support Services",
          description: "Confidential counseling and emotional support services.",
          contactInfo: {
            phone: "1-800-555-0003",
            hours: "24/7 Crisis Support"
          },
          url: "https://counselingservices.org"
        },
        {
          id: 4,
          name: "Patient Support Network",
          category: "Support Services",
          description: "Peer support groups and community resources.",
          contactInfo: {
            phone: "1-800-555-0004",
            hours: "Monday-Sunday 8AM-8PM"
          },
          url: "https://patientsupport.org"
        },
        {
          id: 5,
          name: "Health Education Center",
          category: "Educational Resources",
          description: "Comprehensive health education and information resources.",
          contactInfo: {
            phone: "1-800-555-0005",
            email: "info@healtheducation.org",
            hours: "Monday-Friday 9AM-6PM"
          },
          url: "https://healtheducation.org"
        },
        {
          id: 6,
          name: "Legal Rights Information",
          category: "Educational Resources",
          description: "Information about healthcare rights and legal resources.",
          contactInfo: {
            phone: "1-800-555-0006",
            hours: "Monday-Friday 9AM-5PM"
          },
          url: "https://legalrights.org"
        },
        {
          id: 7,
          name: "24/7 Crisis Hotline",
          category: "Emergency Services",
          description: "Immediate crisis support and emergency assistance.",
          contactInfo: {
            phone: "1-800-555-0007",
            hours: "24/7 Emergency Support"
          },
          url: "https://crisishotline.org"
        },
        {
          id: 8,
          name: "Emergency Care Network",
          category: "Emergency Services",
          description: "Network of emergency healthcare providers and facilities.",
          contactInfo: {
            phone: "1-800-555-0008",
            hours: "24/7"
          },
          url: "https://emergencycare.org"
        }
      ];

      return res.json(resourcesList);
    } catch (error) {
      console.error("Error fetching resources:", error);
      return res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  // Start clinic crawler
  app.post("/api/admin/start-clinic-crawler", async (_req, res) => {
    try {
      console.log("Starting clinic crawler...");
      startClinicCrawler()
        .then(() => console.log("Clinic crawler completed"))
        .catch((error) => console.error("Clinic crawler failed:", error));

      return res.json({ message: "Clinic crawler started" });
    } catch (error) {
      console.error("Error starting clinic crawler:", error);
      return res.status(500).json({ message: "Failed to start clinic crawler" });
    }
  });

  // Manually trigger crawler and await results
  app.post("/api/admin/populate-clinics", async (_req, res) => {
    try {
      console.log("Starting clinic population...");
      await startClinicCrawler();
      console.log("Clinic population completed");

      const totalClinics = await db.query.clinics.findMany();
      return res.json({
        message: "Clinics populated successfully",
        count: totalClinics.length
      });
    } catch (error) {
      console.error("Error populating clinics:", error);
      return res.status(500).json({ message: "Failed to populate clinics" });
    }
  });

  // Start legal info crawler
  app.post("/api/admin/start-legal-crawler", async (_req, res) => {
    try {
      console.log("Starting legal info crawler...");
      startLegalInfoCrawler()
        .then(() => console.log("Legal info crawler completed"))
        .catch((error) => console.error("Legal info crawler failed:", error));

      return res.json({ message: "Legal info crawler started" });
    } catch (error) {
      console.error("Error starting legal info crawler:", error);
      return res.status(500).json({ message: "Failed to start legal info crawler" });
    }
  });

  // Manually trigger crawler and await results
  app.post("/api/admin/populate-legal-info", async (_req, res) => {
    try {
      console.log("Starting legal info population...");
      await startLegalInfoCrawler();
      console.log("Legal info population completed");

      const totalStates = await db.query.legalInfo.findMany();
      return res.json({
        message: "Legal information populated successfully",
        count: totalStates.length
      });
    } catch (error) {
      console.error("Error populating legal info:", error);
      return res.status(500).json({ message: "Failed to populate legal information" });
    }
  });

  // Get VAPID public key for push notifications
  app.get("/api/notifications/vapid-public-key", (_req, res) => {
    const publicKey = getVapidPublicKey();
    if (!publicKey) {
      return res.status(500).json({ message: "VAPID keys not configured" });
    }
    return res.json({ publicKey });
  });

  // Subscribe to push notifications
  app.post("/api/notifications/subscribe",
    [
      body("subscription").notEmpty(),
      body("states").isArray(),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const { subscription, states } = req.body;
        const { endpoint, keys: { p256dh, auth } } = subscription;

        await db.insert(pushSubscriptions).values({
          endpoint,
          p256dh,
          auth,
          states,
        }).onConflictDoUpdate({
          target: pushSubscriptions.endpoint,
          set: {
            states,
            active: true,
          }
        });

        return res.status(201).json({ message: "Subscription successful" });
      } catch (error) {
        console.error("Error subscribing to notifications:", error);
        return res.status(500).json({ message: "Failed to subscribe to notifications" });
      }
    }
  );

  // Unsubscribe from push notifications
  app.post("/api/notifications/unsubscribe", async (req, res) => {
    try {
      const { endpoint } = req.body;

      await db.update(pushSubscriptions)
        .set({ active: false })
        .where(eq(pushSubscriptions.endpoint, endpoint));

      return res.json({ message: "Unsubscribed successfully" });
    } catch (error) {
      console.error("Error unsubscribing:", error);
      return res.status(500).json({ message: "Failed to unsubscribe" });
    }
  });

  // Admin endpoint to broadcast a legal update
  app.post("/api/admin/broadcast-legal-update",
    [
      body("state").notEmpty(),
      body("title").notEmpty(),
      body("description").notEmpty(),
      body("urgency").isIn(["normal", "urgent"]).optional(),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const { state, title, description, urgency } = req.body;
        const notification = await broadcastLegalUpdate(state, title, description, urgency);
        return res.json({ message: "Update broadcasted successfully", notification });
      } catch (error) {
        console.error("Error broadcasting update:", error);
        return res.status(500).json({ message: "Failed to broadcast update" });
      }
    }
  );

  // Add new route for generating clinic data
  app.post("/api/admin/generate-clinics", async (_req, res) => {
    try {
      console.log("Starting clinic data generation...");
      await generateClinicData();

      const totalClinics = await db.query.clinics.findMany();
      return res.json({
        message: "Clinics generated successfully",
        count: totalClinics.length
      });
    } catch (error) {
      console.error("Error generating clinics:", error);
      return res.status(500).json({ message: "Failed to generate clinics" });
    }
  });

  // Generic error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
      message: "An unexpected error occurred",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}

function determineUrgency(update: { description: string; impact?: string }): "low" | "medium" | "high" {
  const text = (update.description + " " + (update.impact || "")).toLowerCase();

  if (text.includes("ban") || text.includes("restriction") || text.includes("immediate") ||
      text.includes("emergency") || text.includes("urgent")) {
    return "high";
  }

  if (text.includes("change") || text.includes("modify") || text.includes("update") ||
      text.includes("review")) {
    return "medium";
  }

  return "low";
}