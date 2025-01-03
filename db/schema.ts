import { pgTable, text, serial, timestamp, jsonb, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  state: text("state").notNull(),
  phone: text("phone").notNull(),
  services: jsonb("services").notNull(),
  acceptedInsurance: jsonb("accepted_insurance").notNull(),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const legalInfo = pgTable("legal_info", {
  id: serial("id").primaryKey(),
  state: text("state").unique().notNull(),
  restrictions: jsonb("restrictions").notNull(),
  requirements: jsonb("requirements").notNull(),
  recentUpdates: jsonb("recent_updates").notNull().default([]),
  effectiveDate: timestamp("effective_date"),
  sourceUrls: jsonb("source_urls").notNull().default([]),
  lastVerified: timestamp("last_verified").notNull().defaultNow(),
  additionalNotes: text("additional_notes"),
  emergencyContacts: jsonb("emergency_contacts").notNull().default([]),
  lastUpdated: timestamp("last_updated").defaultNow(),
  // New fields for document links and resources
  officialDocuments: jsonb("official_documents").notNull().default([]), // Array of {title: string, url: string, type: string}
  legalResources: jsonb("legal_resources").notNull().default([]), // Array of {name: string, url: string, description: string}
  stateWebsite: text("state_website"),
  healthDeptInfo: jsonb("health_dept_info").notNull().default({}), // Object with health department contact details
  newsArticles: jsonb("news_articles").notNull().default([]), // Array of {title: string, url: string, source: string, date: string, summary: string, state: string}
});

export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  contactInfo: jsonb("contact_info").notNull(),
  url: text("url"),
});

// New table for push notification subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  states: jsonb("states").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  active: boolean("active").notNull().default(true),
});

// New table for legal update notifications
export const legalUpdateNotifications = pgTable("legal_update_notifications", {
  id: serial("id").primaryKey(),
  state: text("state").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  urgency: text("urgency").notNull().default('normal'),
  effectiveDate: timestamp("effective_date"),
  createdAt: timestamp("created_at").defaultNow(),
  notifiedAt: timestamp("notified_at"),
});

export const insertClinicSchema = createInsertSchema(clinics);
export const selectClinicSchema = createSelectSchema(clinics);
export const insertLegalInfoSchema = createInsertSchema(legalInfo);
export const selectLegalInfoSchema = createSelectSchema(legalInfo);
export const insertResourceSchema = createInsertSchema(resources);
export const selectResourceSchema = createSelectSchema(resources);
export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions);
export const selectPushSubscriptionSchema = createSelectSchema(pushSubscriptions);
export const insertLegalUpdateNotificationSchema = createInsertSchema(legalUpdateNotifications);
export const selectLegalUpdateNotificationSchema = createSelectSchema(legalUpdateNotifications);