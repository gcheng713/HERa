import { z } from "zod";

export interface Clinic {
  id: number;
  name: string;
  address: string;
  state: string;
  phone: string;
  services: string[];
  acceptedInsurance: string[];
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LegalInfo {
  id: number;
  state: string;
  restrictions: string[];
  requirements: string[];
  recentUpdates: {
    date: string;
    description: string;
    impact: string;
  }[];
  effectiveDate: string;
  sourceUrls: string[];
  lastVerified: string;
  additionalNotes?: string;
  emergencyContacts: {
    name: string;
    phone: string;
    available24x7: boolean;
  }[];
  lastUpdated: string;
}

export interface Resource {
  id: number;
  name: string;
  category: string;
  description: string;
  contactInfo: {
    phone?: string;
    email?: string;
    hours?: string;
  };
  url?: string;
}

// Push notification types
export interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Zod schemas for API responses
export const clinicSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string(),
  state: z.string(),
  phone: z.string(),
  services: z.array(z.string()),
  acceptedInsurance: z.array(z.string()),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const legalInfoSchema = z.object({
  id: z.number(),
  state: z.string(),
  restrictions: z.array(z.string()),
  requirements: z.array(z.string()),
  recentUpdates: z.array(z.object({
    date: z.string(),
    description: z.string(),
    impact: z.string(),
  })),
  effectiveDate: z.string(),
  sourceUrls: z.array(z.string()),
  lastVerified: z.string(),
  additionalNotes: z.string().optional(),
  emergencyContacts: z.array(z.object({
    name: z.string(),
    phone: z.string(),
    available24x7: z.boolean(),
  })),
  lastUpdated: z.string(),
});

export const resourceSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: z.string(),
  description: z.string(),
  contactInfo: z.object({
    phone: z.string().optional(),
    email: z.string().optional(),
    hours: z.string().optional(),
  }),
  url: z.string().optional(),
});

export const clinicsResponseSchema = z.array(clinicSchema);
export const resourcesResponseSchema = z.array(resourceSchema);