import * as cheerio from "cheerio";
import axios from "axios";
import axiosRetry from "axios-retry";
import PQueue from "p-queue";
import pRetry from "p-retry";
import pTimeout from "p-timeout";
import { db } from "@db";
import { clinics } from "@db/schema";
import { eq } from 'drizzle-orm';

// Configure rate limiting
const queue = new PQueue({ concurrency: 1, interval: 8000 });

// Configure axios with retries
axiosRetry(axios, { 
  retries: 5,
  retryDelay: (retryCount) => {
    const delay = Math.min(1000 * Math.pow(3, retryCount), 60000);
    return delay + Math.random() * 2000; // Add jitter
  },
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           error.response?.status === 404 || 
           error.response?.status === 429 ||
           error.response?.status === 403;
  }
});

interface ClinicData {
  name: string;
  address: string;
  state: string;
  phone: string;
  services: string[];
  acceptedInsurance: string[];
  latitude?: number;
  longitude?: number;
}

// API Configuration
const API_CONFIG = {
  plannedParenthood: {
    baseUrl: "https://www.plannedparenthood.org",
    endpoints: {
      search: "/api/v1/health-center/search",
      details: "/api/v1/health-center",
    },
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; HERA/1.0; +https://www.hera.org)',
    }
  },
  abortionfinder: "https://www.abortionfinder.org/results",
  ineedana: "https://www.ineedana.com/api/clinics",
  abortionclinics: "https://www.abortionclinics.com/states",
  napawf: "https://www.napawf.org/abortion-access",
  prochoice: "https://prochoice.org/patients/find-a-provider"
};

// Keep the existing fallback data
const fallbackClinics = {
  "California": [
    {
      name: "Planned Parenthood - San Francisco Health Center",
      address: "1522 Bush Street, San Francisco, CA 94109",
      state: "California",
      phone: "(415) 922-6789",
      services: ["Abortion Services", "Birth Control", "HIV Testing", "STI Testing", "Emergency Contraception"],
      acceptedInsurance: ["Medi-Cal", "Family PACT", "Most Private Insurance"]
    },
    {
      name: "Planned Parenthood - Oakland Health Center",
      address: "1682 7th Street, Oakland, CA 94607",
      state: "California",
      phone: "(510) 300-3800",
      services: ["Abortion Services", "Birth Control", "HIV Testing", "STI Testing", "Emergency Contraception"],
      acceptedInsurance: ["Medi-Cal", "Family PACT", "Most Private Insurance"]
    },
    {
      name: "Planned Parenthood - Sacramento Health Center",
      address: "201 29th Street, Sacramento, CA 95816",
      state: "California",
      phone: "(916) 446-6921",
      services: ["Abortion Services", "Birth Control", "STD Testing", "Pregnancy Testing", "Emergency Contraception"],
      acceptedInsurance: ["Medi-Cal", "Family PACT", "Most Private Insurance"]
    }
  ],
  "New York": [
    {
      name: "Planned Parenthood - Manhattan Health Center",
      address: "26 Bleecker Street, New York, NY 10012",
      state: "New York",
      phone: "(212) 965-7000",
      services: ["Abortion Services", "Birth Control", "HIV Testing", "STI Testing", "Emergency Contraception"],
      acceptedInsurance: ["Medicaid", "Most Private Insurance"]
    },
    {
      name: "Planned Parenthood - Brooklyn Health Center",
      address: "44 Court Street, Brooklyn, NY 11201",
      state: "New York",
      phone: "(718) 923-4000",
      services: ["Abortion Services", "Birth Control", "HIV Testing", "STI Testing", "Emergency Contraception"],
      acceptedInsurance: ["Medicaid", "Most Private Insurance"]
    },
    {
      name: "Planned Parenthood - Bronx Center",
      address: "349 East 149th Street, Bronx, NY 10451",
      state: "New York",
      phone: "(718) 585-1220",
      services: ["Abortion Services", "Birth Control", "STD Testing", "Pregnancy Testing", "Emergency Contraception"],
      acceptedInsurance: ["Medicaid", "Most Private Insurance"]
    }
  ],
  "Texas": [
    {
      name: "Planned Parenthood - North Austin Health Center",
      address: "8916 Research Blvd., Austin, TX 78758",
      state: "Texas",
      phone: "(512) 331-1288",
      services: ["Birth Control", "STD Testing", "Pregnancy Testing", "Emergency Contraception", "Cancer Screenings"],
      acceptedInsurance: ["Private Insurance", "Medicaid"]
    },
    {
      name: "Planned Parenthood - Southwest Houston",
      address: "5800 Bellaire Blvd., Houston, TX 77081",
      state: "Texas",
      phone: "(713) 522-3976",
      services: ["Birth Control", "STD Testing", "Pregnancy Testing", "Emergency Contraception", "Cancer Screenings"],
      acceptedInsurance: ["Private Insurance", "Medicaid"]
    },
    {
      name: "Planned Parenthood - Dallas South Health Center",
      address: "7989 West Virginia Drive, Dallas, TX 75237",
      state: "Texas",
      phone: "(214) 941-1233",
      services: ["Birth Control", "STD Testing", "Pregnancy Testing", "Emergency Contraception", "Cancer Screenings"],
      acceptedInsurance: ["Private Insurance", "Medicaid"]
    }
  ],
  "Florida": [
    {
      name: "Planned Parenthood - Orlando Health Center",
      address: "726 S Tampa Ave, Orlando, FL 32805",
      state: "Florida",
      phone: "(407) 246-1788",
      services: ["Birth Control", "STD Testing", "Pregnancy Testing", "Emergency Contraception", "Cancer Screenings"],
      acceptedInsurance: ["Private Insurance", "Medicaid", "Florida Medicaid"]
    },
    {
      name: "Planned Parenthood - Miami Health Center",
      address: "3119 N Miami Ave, Miami, FL 33127",
      state: "Florida",
      phone: "(305) 441-2022",
      services: ["Birth Control", "STD Testing", "Pregnancy Testing", "Emergency Contraception", "Cancer Screenings"],
      acceptedInsurance: ["Private Insurance", "Medicaid", "Florida Medicaid"]
    },
    {
      name: "Planned Parenthood - Tampa Health Center",
      address: "8068 N 56th St, Tampa, FL 33617",
      state: "Florida",
      phone: "(813) 980-3555",
      services: ["Birth Control", "STD Testing", "Pregnancy Testing", "Emergency Contraception", "Cancer Screenings"],
      acceptedInsurance: ["Private Insurance", "Medicaid", "Florida Medicaid"]
    }
  ],
  "Illinois": [
    {
      name: "Planned Parenthood - Near North Health Center",
      address: "1200 N LaSalle Dr, Chicago, IL 60610",
      state: "Illinois",
      phone: "(312) 266-1033",
      services: ["Abortion Services", "Birth Control", "STD Testing", "Pregnancy Testing", "Emergency Contraception"],
      acceptedInsurance: ["Private Insurance", "Medicaid", "Illinois Medicaid"]
    },
    {
      name: "Planned Parenthood - Aurora Health Center",
      address: "3051 E New York St, Aurora, IL 60504",
      state: "Illinois",
      phone: "(630) 585-0500",
      services: ["Abortion Services", "Birth Control", "STD Testing", "Pregnancy Testing", "Emergency Contraception"],
      acceptedInsurance: ["Private Insurance", "Medicaid", "Illinois Medicaid"]
    },
    {
      name: "Planned Parenthood - Springfield Health Center",
      address: "601 Bruns Lane, Springfield, IL 62702",
      state: "Illinois",
      phone: "(217) 544-2744",
      services: ["Abortion Services", "Birth Control", "STD Testing", "Pregnancy Testing", "Emergency Contraception"],
      acceptedInsurance: ["Private Insurance", "Medicaid", "Illinois Medicaid"]
    }
  ]
};

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const response = await axios.get(
      `https://api.geocod.io/v1.7/geocode?q=${encodeURIComponent(address)}&api_key=${process.env.VITE_GEOCODIO_API_KEY}`
    );

    if (response.data.results && response.data.results[0]) {
      const { lat, lng: lon } = response.data.results[0].location;
      return { lat, lon };
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
  }
  return null;
}

async function fetchPlannedParenthoodClinics(state: string): Promise<ClinicData[]> {
  const clinics: ClinicData[] = [];
  let page = 1;
  const perPage = 100;

  try {
    while (true) {
      const response = await pRetry(
        async () => {
          console.log(`Fetching PP clinics for ${state}, page ${page}...`);
          return axios.get(`${API_CONFIG.plannedParenthood.baseUrl}${API_CONFIG.plannedParenthood.endpoints.search}`, {
            params: {
              state: state,
              page: page,
              per_page: perPage,
            },
            headers: API_CONFIG.plannedParenthood.headers,
            timeout: 10000
          });
        },
        {
          retries: 3,
          onFailedAttempt: error => {
            console.log(`PP API attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
          }
        }
      );

      if (!response.data || !response.data.results) {
        break;
      }

      const results = response.data.results;

      for (const result of results) {
        try {
          // Fetch detailed information for each clinic
          const detailResponse = await pRetry(
            async () => {
              return axios.get(
                `${API_CONFIG.plannedParenthood.baseUrl}${API_CONFIG.plannedParenthood.endpoints.details}/${result.id}`,
                {
                  headers: API_CONFIG.plannedParenthood.headers,
                  timeout: 10000
                }
              );
            },
            { retries: 2 }
          );

          const detail = detailResponse.data;
          const fullAddress = `${detail.street_address || result.street_address}, ${detail.city || result.city}, ${detail.state || result.state} ${detail.zip || result.zip}`.trim();

          // Geocode the address
          const coordinates = await geocodeAddress(fullAddress);

          clinics.push({
            name: detail.name || result.name || 'Planned Parenthood Health Center',
            address: fullAddress,
            state: detail.state || result.state,
            phone: detail.phone || result.phone || 'Contact clinic for phone number',
            services: detail.services?.map((s: any) => s.name) || result.services || ['Contact clinic for services'],
            acceptedInsurance: detail.insurance_plans?.map((i: any) => i.name) || ['Contact clinic for insurance information'],
            latitude: coordinates?.lat,
            longitude: coordinates?.lon
          });
        } catch (error) {
          console.error(`Error fetching PP clinic details:`, error);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (results.length < perPage) {
        break;
      }

      page++;
    }
  } catch (error) {
    console.error(`Error fetching PP clinics for ${state}:`, error);
  }

  return clinics;
}

async function scrapeClinicWebsite(url: string, state: string): Promise<ClinicData[]> {
  const clinics: ClinicData[] = [];
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HERA/1.0; +https://www.hera.org)',
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // Extract clinic data using CSS selectors
    $('.clinic-location, .health-center, .provider-listing, .location-item').each(async (_, elem) => {
      try {
        const name = $(elem).find('.name, .title, h3, .location-name').first().text().trim();
        const addressElem = $(elem).find('.address, .location, .clinic-address');
        const address = addressElem.text().trim();
        const phone = $(elem).find('.phone, .telephone, .clinic-phone').text().trim();
        const services = $(elem).find('.services li, .procedures li, .service-list li').map((_, el) => $(el).text().trim()).get();
        const insurance = $(elem).find('.insurance li, .payment li, .insurance-list li').map((_, el) => $(el).text().trim()).get();

        if (name && address) {
          // Geocode the address
          const coordinates = await geocodeAddress(address);

          clinics.push({
            name,
            address,
            state,
            phone: phone || 'Contact clinic for phone number',
            services: services.length ? services : ['Contact clinic for services'],
            acceptedInsurance: insurance.length ? insurance : ['Contact clinic for insurance information'],
            latitude: coordinates?.lat,
            longitude: coordinates?.lon
          });
        }
      } catch (error) {
        console.error('Error parsing clinic element:', error);
      }
    });
  } catch (error) {
    console.error('Error scraping clinic website:', error);
  }
  return clinics;
}

async function fetchClinicsFromAPI(state: string): Promise<ClinicData[]> {
  console.log(`Fetching clinics for ${state}...`);
  const clinics: ClinicData[] = [];

  try {
    // First try Planned Parenthood API
    const ppClinics = await fetchPlannedParenthoodClinics(state);
    clinics.push(...ppClinics);
    console.log(`Found ${ppClinics.length} PP clinics for ${state}`);

    // Then try scraping other sources
    const scrapedClinics = await Promise.all([
      scrapeClinicWebsite(`${API_CONFIG.abortionfinder}?state=${state}`, state),
      scrapeClinicWebsite(`${API_CONFIG.abortionclinics}/${state.toLowerCase()}`, state),
      scrapeClinicWebsite(`${API_CONFIG.napawf}/states/${state.toLowerCase()}`, state),
      scrapeClinicWebsite(`${API_CONFIG.prochoice}/states/${state.toLowerCase()}`, state),
    ]);

    scrapedClinics.forEach(results => clinics.push(...results));

    // Filter and deduplicate
    const validClinics = clinics.filter(clinic => 
      clinic.name && 
      clinic.address && 
      clinic.state.toLowerCase() === state.toLowerCase()
    );

    const uniqueClinics = Array.from(new Map(
      validClinics.map(clinic => [clinic.name + clinic.address, clinic])
    ).values());

    return uniqueClinics;
  } catch (error) {
    console.error(`Error fetching clinics for ${state}:`, error);
    return [];
  }
}

export async function startClinicCrawler() {
  console.log("Starting enhanced clinic crawler with PP API integration...");

  const states = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", 
    "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", 
    "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", 
    "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", 
    "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", 
    "New Hampshire", "New Jersey", "New Mexico", "New York", 
    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", 
    "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", 
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", 
    "West Virginia", "Wisconsin", "Wyoming"
  ];

  for (const state of states) {
    await queue.add(async () => {
      console.log(`Processing ${state}...`);

      try {
        // Try API/scraping first
        let clinicData = await fetchClinicsFromAPI(state);

        // If no clinics found, try fallback data
        if (clinicData.length === 0 && fallbackClinics[state]) {
          console.log(`Using fallback data for ${state}`);
          clinicData = fallbackClinics[state];
        }

        if (clinicData.length === 0) {
          console.log(`No clinic data found for ${state}`);
          return;
        }

        console.log(`Found ${clinicData.length} clinics for ${state}`);

        // Store in database
        for (const clinic of clinicData) {
          try {
            const existingClinic = await db.query.clinics.findMany({
              where: eq(clinics.name, clinic.name)
            });

            if (existingClinic.length === 0) {
              await db.insert(clinics).values(clinic);
              console.log(`Added clinic: ${clinic.name}`);
            } else {
              console.log(`Clinic already exists: ${clinic.name}`);
            }
          } catch (error) {
            console.error(`Error storing clinic ${clinic.name}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error processing state ${state}:`, error);
      }
    });
  }

  await queue.onIdle();
  console.log('Clinic crawler completed');
}