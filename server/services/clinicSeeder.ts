import { db } from "@db";
import { clinics } from "@db/schema";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function retryOperation<T>(operation: () => Promise<T>, maxAttempts = 3, delayMs = 2000): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      console.log(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('All retry attempts failed');
}

async function generateStateClinicData(state: string): Promise<any[]> {
  const prompt = `Create a detailed list of exactly 10 clinics in ${state}. For each clinic, include:
1. A name (e.g., "Women's Health Center of ${state}")
2. A complete address in ${state}
3. A phone number with valid area code for ${state}
4. Latitude and longitude within ${state}'s boundaries

Format each clinic exactly like this example:
{
  "name": "Women's Health Center",
  "address": "123 Main Street, City, ${state} ZIP",
  "phone": "(XXX) XXX-XXXX",
  "latitude": XX.XXXX,
  "longitude": -XX.XXXX
}

Return ONLY a JSON array containing these 10 clinics with no additional text.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a healthcare database expert. Generate realistic clinic data with accurate geographic coordinates and area codes. Return only a properly formatted JSON array."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.5,
  });

  const content = response.choices[0].message?.content?.trim() || '';
  const match = content.match(/\[\s*{[\s\S]*}\s*\]/);

  if (!match) {
    throw new Error(`No valid JSON array found in response for ${state}`);
  }

  let clinicsData;
  try {
    clinicsData = JSON.parse(match[0]);
  } catch (error) {
    console.error(`Failed to parse clinic data for ${state}:`, error);
    throw error;
  }

  if (!Array.isArray(clinicsData) || clinicsData.length !== 10) {
    throw new Error(`Expected exactly 10 clinics for ${state}, got ${clinicsData?.length || 0}`);
  }

  return clinicsData;
}

export async function generateClinicData() {
  console.log("Starting clinic data generation...");

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

  const standardServices = [
    "Medical Abortion",
    "Surgical Abortion",
    "Family Planning",
    "Counseling Services",
    "Birth Control"
  ];

  const standardInsurance = [
    "Medicaid",
    "Blue Cross Blue Shield",
    "UnitedHealthcare",
    "Aetna",
    "Cigna"
  ];

  for (const state of states) {
    console.log(`Generating clinics for ${state}...`);

    try {
      const clinicsData = await retryOperation(async () => {
        const stateData = await generateStateClinicData(state);
        let successCount = 0;

        for (const clinic of stateData) {
          try {
            // Validate required fields and data types
            if (!clinic.name || typeof clinic.name !== 'string' ||
                !clinic.address || typeof clinic.address !== 'string' ||
                !clinic.phone || typeof clinic.phone !== 'string' ||
                typeof clinic.latitude !== 'number' || isNaN(clinic.latitude) ||
                typeof clinic.longitude !== 'number' || isNaN(clinic.longitude)) {
              console.error(`Invalid clinic data structure for ${state}:`, clinic);
              continue;
            }

            // Validate phone format
            if (!/^\(\d{3}\) \d{3}-\d{4}$/.test(clinic.phone)) {
              clinic.phone = clinic.phone.replace(/[^\d]/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
            }

            // Insert into database with standardized data
            await db.insert(clinics).values({
              name: clinic.name,
              address: clinic.address,
              state: state,
              phone: clinic.phone,
              services: standardServices,
              acceptedInsurance: standardInsurance,
              latitude: clinic.latitude,
              longitude: clinic.longitude,
            });

            successCount++;
            console.log(`Added clinic: ${clinic.name} in ${state}`);
          } catch (error) {
            console.error(`Error inserting clinic ${clinic.name} in ${state}:`, error);
          }
        }

        if (successCount < 10) {
          throw new Error(`Only generated ${successCount}/10 valid clinics for ${state}, retrying...`);
        }

        return stateData;
      });

      console.log(`Successfully added ${clinicsData.length} clinics for ${state}`);

      // Add delay between states to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error) {
      console.error(`Error generating clinics for ${state}:`, error);
      continue;
    }
  }
}