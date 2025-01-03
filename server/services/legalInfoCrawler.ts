import * as cheerio from "cheerio";
import axios from "axios";
import axiosRetry from "axios-retry";
import PQueue from "p-queue";
import pRetry from "p-retry";
import OpenAI from "openai";
import { db } from "@db";
import { legalInfo } from "@db/schema";
import { eq } from "drizzle-orm";

// Configure OpenAI
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure rate limiting
const queue = new PQueue({ concurrency: 1, interval: 5000 });

// Configure axios with retries
axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => {
    return Math.min(1000 * Math.pow(2, retryCount), 30000);
  },
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           error.response?.status === 429;
  }
});

const API_CONFIG = {
  plannedParenthood: "https://www.plannedparenthood.org/learn/abortion/abortion-laws",
  aclu: "https://www.aclu.org/issues/reproductive-freedom/abortion",
  guttmacher: "https://www.guttmacher.org/state-policy",
  stateGov: "https://www.usa.gov/states-and-territories",
  kaiserfamilyfoundation: "https://www.kff.org/womens-health-policy",
  reproductiverights: "https://reproductiverights.org/maps/what-if-roe-fell",
  nwlc: "https://nwlc.org/state-abortion-laws",
  prochoiceamerica: "https://prochoiceamerica.org/state-law",
  healthlaw: "https://healthlaw.org/abortion-laws-by-state",
  // News Sources
  reuters: "https://www.reuters.com/legal/government",
  npr: "https://www.npr.org/sections/health-shots",
  thehill: "https://thehill.com/policy/healthcare",
  axios: "https://www.axios.com/health",
  stateline: "https://stateline.org/category/health",
  // Additional News Sources
  motherjones: "https://www.motherjones.com/politics/reproductive-rights",
  vox: "https://www.vox.com/reproductive-rights",
  propublica: "https://www.propublica.org/topics/abortion",
  guardian: "https://www.theguardian.com/world/abortion",
  nytimes: "https://www.nytimes.com/topic/subject/abortion"
};

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  date: string;
  summary: string;
  state: string;
}

async function scrapeNewsArticles(state: string): Promise<NewsArticle[]> {
  const newsArticles: NewsArticle[] = [];
  const today = new Date();

  try {
    // Scrape Reuters
    const reutersResponse = await axios.get(`${API_CONFIG.reuters}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HERA/1.0; +https://www.hera.org)' }
    });
    const $reuters = cheerio.load(reutersResponse.data);

    $reuters('article').each((_, article) => {
      const $article = $reuters(article);
      const title = $article.find('h3').text().trim();
      const url = $article.find('a').attr('href');
      const dateStr = $article.find('time').attr('datetime');

      if (title && url && (title.toLowerCase().includes('abortion') || title.toLowerCase().includes('reproductive'))) {
        newsArticles.push({
          title,
          url: url.startsWith('http') ? url : `https://www.reuters.com${url}`,
          source: 'Reuters',
          date: dateStr || today.toISOString(),
          summary: $article.find('p').first().text().trim(),
          state: state
        });
      }
    });

    // Scrape NPR
    const nprResponse = await axios.get(`${API_CONFIG.npr}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HERA/1.0; +https://www.hera.org)' }
    });
    const $npr = cheerio.load(nprResponse.data);

    $npr('article').each((_, article) => {
      const $article = $npr(article);
      const title = $article.find('h2').text().trim();
      const url = $article.find('a').attr('href');
      const dateStr = $article.find('time').attr('datetime');

      if (title && url && (title.toLowerCase().includes('abortion') || title.toLowerCase().includes('reproductive'))) {
        newsArticles.push({
          title,
          url: url.startsWith('http') ? url : `https://www.npr.org${url}`,
          source: 'NPR',
          date: dateStr || today.toISOString(),
          summary: $article.find('p').first().text().trim(),
          state: state
        });
      }
    });

    // Scrape ProPublica
    const propublicaResponse = await axios.get(`${API_CONFIG.propublica}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HERA/1.0; +https://www.hera.org)' }
    });
    const $propublica = cheerio.load(propublicaResponse.data);

    $propublica('article').each((_, article) => {
      const $article = $propublica(article);
      const title = $article.find('h3, h2').text().trim();
      const url = $article.find('a').attr('href');
      const dateStr = $article.find('time').attr('datetime');

      if (title && url) {
        newsArticles.push({
          title,
          url: url.startsWith('http') ? url : `https://www.propublica.org${url}`,
          source: 'ProPublica',
          date: dateStr || today.toISOString(),
          summary: $article.find('p').first().text().trim(),
          state: state
        });
      }
    });

    // Deduplicate articles
    const uniqueArticles = Array.from(new Map(
      newsArticles.map(article => [article.url, article])
    ).values());

    // Sort by date (most recent first)
    return uniqueArticles.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

  } catch (error) {
    console.error(`Error scraping news for ${state}:`, error);
    return newsArticles;
  }
}

async function generateAIEnhancedLegalInfo(state: string, scrapedData: Partial<StateLegalInfo>): Promise<Partial<StateLegalInfo>> {
  try {
    const newsArticles = await scrapeNewsArticles(state);
    const prompt = `Generate comprehensive, factual information about current abortion laws and regulations in ${state} as of January 2025. Include:

1. Current restrictions (be very specific about current laws):
2. Requirements for patients (include all medical and legal requirements):
3. Recent legal updates (with actual dates and specific changes):
4. Emergency contacts and resources:
5. Official documents and references:

Base this on verified legal sources and provide the information in JSON format with the following structure:
{
  "restrictions": ["detailed list of current restrictions with specific legal references"],
  "requirements": ["detailed list of current requirements including waiting periods, counseling, etc"],
  "recentUpdates": [
    {
      "date": "YYYY-MM-DD",
      "description": "detailed description of the legal change",
      "impact": "specific impact on access and services"
    }
  ],
  "newsArticles": [
    {
      "title": "Article title",
      "url": "Article URL",
      "source": "News source name",
      "date": "YYYY-MM-DD",
      "summary": "Brief summary of the article",
      "state": "State name"
    }
  ],
  "additionalNotes": "important context about implementation and access",
  "emergencyContacts": [
    {
      "name": "organization name",
      "phone": "phone number with area code",
      "available24x7": true
    }
  ],
  "officialDocuments": [
    {
      "title": "full title of the legal document or resource",
      "url": "direct URL to the document",
      "type": "legislation/guidance/policy"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a healthcare legal expert with deep knowledge of abortion laws and regulations across all U.S. states. Provide comprehensive, accurate, and up-to-date information about abortion laws, including specific legal citations, requirements, and resources. Focus on factual, legally verified information.",
        },
        {
          role: "user",
          content: prompt,
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const aiGeneratedInfo = JSON.parse(response.choices[0].message.content);

    return {
      ...scrapedData,
      restrictions: [
        ...(aiGeneratedInfo.restrictions || []),
        ...(scrapedData.restrictions || [])
      ],
      requirements: [
        ...(aiGeneratedInfo.requirements || []),
        ...(scrapedData.requirements || [])
      ],
      recentUpdates: [
        ...(aiGeneratedInfo.recentUpdates || []),
        ...(scrapedData.recentUpdates || [])
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      newsArticles: [
        ...newsArticles,
        ...(aiGeneratedInfo.newsArticles || [])
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      additionalNotes: aiGeneratedInfo.additionalNotes || scrapedData.additionalNotes,
      emergencyContacts: [
        ...(aiGeneratedInfo.emergencyContacts || []),
        ...(scrapedData.emergencyContacts || [])
      ],
      officialDocuments: [
        ...(aiGeneratedInfo.officialDocuments || []),
        ...(scrapedData.officialDocuments || [])
      ],
      healthDeptInfo: {
        ...(scrapedData.healthDeptInfo || {}),
      }
    };
  } catch (error) {
    console.error(`Error generating AI-enhanced legal info for ${state}:`, error);
    return scrapedData;
  }
}

async function scrapeStateGovernmentSite(state: string): Promise<Partial<StateLegalInfo>> {
  try {
    const stateAbbr = state.toLowerCase().substring(0, 2);
    const response = await axios.get(`${API_CONFIG.stateGov}/${stateAbbr}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HERA/1.0; +https://www.hera.org)'
      }
    });

    const $ = cheerio.load(response.data);

    const officialDocuments: Array<{title: string, url: string, type: string}> = [];
    const healthDeptInfo: any = {};

    // Extract official documents
    $('a[href*="health"], a[href*="law"], a[href*="statutes"]').each((_, elem) => {
      const $elem = $(elem);
      const url = $elem.attr('href');
      const title = $elem.text().trim();

      if (url && title && (url.includes('.pdf') || url.includes('.gov'))) {
        officialDocuments.push({
          title,
          url: new URL(url, API_CONFIG.stateGov).toString(),
          type: url.includes('health') ? 'guidance' : 'legislation'
        });
      }
    });

    // Extract health department info
    const healthDeptSection = $('div:contains("Department of Health")').first();
    if (healthDeptSection.length) {
      healthDeptInfo.name = healthDeptSection.find('h1, h2, h3').first().text().trim();
      healthDeptInfo.website = healthDeptSection.find('a[href*="health"]').attr('href');
      healthDeptInfo.phone = healthDeptSection.find('a[href^="tel:"]').text().trim();
      healthDeptInfo.email = healthDeptSection.find('a[href^="mailto:"]').text().trim();
    }

    return {
      officialDocuments,
      healthDeptInfo,
      stateWebsite: API_CONFIG.stateGov
    };
  } catch (error) {
    console.error(`Error scraping state government site for ${state}:`, error);
    return {};
  }
}

async function scrapePlannedParenthood(state: string): Promise<Partial<StateLegalInfo>> {
  try {
    const response = await axios.get(`${API_CONFIG.plannedParenthood}/${state.toLowerCase()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HERA/1.0; +https://www.hera.org)'
      }
    });

    const $ = cheerio.load(response.data);

    const restrictions: string[] = [];
    const requirements: string[] = [];

    // Extract restrictions and requirements
    $('.abortion-laws-restrictions li').each((_, elem) => {
      restrictions.push($(elem).text().trim());
    });

    $('.abortion-laws-requirements li').each((_, elem) => {
      requirements.push($(elem).text().trim());
    });

    // Extract recent updates
    const recentUpdates: LegalUpdate[] = [];
    $('.recent-updates .update-item').each((_, elem) => {
      const date = $(elem).find('.date').text().trim();
      const description = $(elem).find('.description').text().trim();
      const impact = $(elem).find('.impact').text().trim();

      if (date && description) {
        recentUpdates.push({ date, description, impact: impact || 'Impact under assessment' });
      }
    });

    return {
      restrictions,
      requirements,
      recentUpdates,
      sourceUrls: [API_CONFIG.plannedParenthood]
    };
  } catch (error) {
    console.error(`Error scraping Planned Parenthood for ${state}:`, error);
    return {};
  }
}

async function scrapeACLU(state: string): Promise<Partial<StateLegalInfo>> {
  try {
    const response = await axios.get(`${API_CONFIG.aclu}/state/${state.toLowerCase()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HERA/1.0; +https://www.hera.org)'
      }
    });

    const $ = cheerio.load(response.data);

    const restrictions: string[] = [];
    $('.restrictions li').each((_, elem) => {
      restrictions.push($(elem).text().trim());
    });

    return {
      restrictions,
      sourceUrls: [API_CONFIG.aclu]
    };
  } catch (error) {
    console.error(`Error scraping ACLU for ${state}:`, error);
    return {};
  }
}

async function scrapeGuttmacher(state: string): Promise<Partial<StateLegalInfo>> {
  try {
    const response = await axios.get(`${API_CONFIG.guttmacher}/state/${state.toLowerCase()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HERA/1.0; +https://www.hera.org)'
      }
    });

    const $ = cheerio.load(response.data);

    const requirements: string[] = [];
    const restrictions: string[] = [];

    $('.policy-details li').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text.includes('required') || text.includes('must')) {
        requirements.push(text);
      } else {
        restrictions.push(text);
      }
    });

    return {
      requirements,
      restrictions,
      sourceUrls: [API_CONFIG.guttmacher]
    };
  } catch (error) {
    console.error(`Error scraping Guttmacher for ${state}:`, error);
    return {};
  }
}

async function scrapeKaiserFamilyFoundation(state: string): Promise<Partial<StateLegalInfo>> {
  try {
    const response = await axios.get(`${API_CONFIG.kaiserfamilyfoundation}/state/${state.toLowerCase()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HERA/1.0; +https://www.hera.org)'
      }
    });

    const $ = cheerio.load(response.data);


    return {
      restrictions: [],
      requirements: [],
      recentUpdates: [],
      sourceUrls: [API_CONFIG.kaiserfamilyfoundation]
    };
  } catch (error) {
    console.error(`Error scraping KFF for ${state}:`, error);
    return {};
  }
}

async function scrapeNWLC(state: string): Promise<Partial<StateLegalInfo>> {
  try {
    const response = await axios.get(`${API_CONFIG.nwlc}/state/${state.toLowerCase()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HERA/1.0; +https://www.hera.org)'
      }
    });

    const $ = cheerio.load(response.data);


    return {
      restrictions: [],
      requirements: [],
      recentUpdates: [],
      sourceUrls: [API_CONFIG.nwlc]
    };
  } catch (error) {
    console.error(`Error scraping NWLC for ${state}:`, error);
    return {};
  }
}

async function scrapeStateResources(state: string): Promise<Partial<StateLegalInfo>> {
  try {
    // Scrape from reliable sources for each state
    const resources = [
      {
        name: "State Bar Association Legal Aid",
        url: `https://${state.toLowerCase().replace(" ", "")}.statebarfoundation.org/legal-aid`,
        description: "Free or low-cost legal services through the state bar association",
      },
      {
        name: "ACLU Legal Help",
        url: "https://www.aclu.org/need-legal-help",
        description: "Legal assistance and resources from the American Civil Liberties Union",
      },
      {
        name: "National Abortion Federation Hotline Fund",
        url: "https://prochoice.org/patients/naf-hotline/",
        description: "Financial assistance and referrals for abortion care",
      },
      {
        name: "If/When/How Legal Helpline",
        url: "https://www.reprolegalhelpline.org",
        description: "Confidential legal information about self-managed abortion",
      },
      {
        name: "Indigenous Women Rising",
        url: "https://www.iwrising.org/abortion-fund",
        description: "Abortion fund and resources for Indigenous communities",
      },
      {
        name: "Women's Law Project",
        url: "https://www.womenslawproject.org/",
        description: "Legal advocacy and resources for women's healthcare rights",
      }
    ];

    // Add state-specific resources
    const stateSpecificResources = getStateSpecificResources(state);

    return {
      legalResources: [...resources, ...stateSpecificResources],
    };
  } catch (error) {
    console.error(`Error scraping resources for ${state}:`, error);
    return {};
  }
}

function getStateSpecificResources(state: string): Array<{name: string, url: string, description: string}> {
  const stateResourceMap: Record<string, Array<{name: string, url: string, description: string}>> = {
    "California": [
      {
        name: "ACCESS Reproductive Justice",
        url: "https://accessrj.org",
        description: "California's reproductive justice organization providing resources and support",
      },
      {
        name: "California Abortion Access",
        url: "https://abortion.ca.gov",
        description: "Official California state abortion information and resources",
      }
    ],
    "New York": [
      {
        name: "New York Abortion Access Fund",
        url: "https://www.nyaaf.org",
        description: "Financial assistance for abortion care in New York",
      },
      {
        name: "New York Civil Liberties Union",
        url: "https://www.nyclu.org/en/issues/reproductive-rights",
        description: "Legal resources and advocacy for reproductive rights",
      }
    ],
    "Texas": [
      {
        name: "Jane's Due Process",
        url: "https://janesdueprocess.org",
        description: "Legal help for young people seeking abortion care in Texas",
      },
      {
        name: "Fund Texas Choice",
        url: "https://fundtexaschoice.org",
        description: "Travel and logistical support for abortion access",
      }
    ],
    // Add more states with their specific resources
  };

  return stateResourceMap[state] || [];
}

export async function startLegalInfoCrawler() {
  console.log("Starting enhanced legal information crawler...");

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
        // Fetch data from all sources with expanded sources
        const [ppData, acluData, guttmacherData, stateGovData, kffData, nwlcData, stateResources] = await Promise.all([
          pRetry(() => scrapePlannedParenthood(state), { retries: 2 }),
          pRetry(() => scrapeACLU(state), { retries: 2 }),
          pRetry(() => scrapeGuttmacher(state), { retries: 2 }),
          pRetry(() => scrapeStateGovernmentSite(state), { retries: 2 }),
          pRetry(() => scrapeKaiserFamilyFoundation(state), { retries: 2 }),
          pRetry(() => scrapeNWLC(state), { retries: 2 }),
          pRetry(() => scrapeStateResources(state), { retries: 2 })
        ]);

        // Merge data from different sources and enhance with AI
        const mergedData = await generateAIEnhancedLegalInfo(state, {
          state,
          restrictions: [...new Set([
            ...(ppData.restrictions || []),
            ...(acluData.restrictions || []),
            ...(guttmacherData.restrictions || []),
            ...(kffData.restrictions || []),
            ...(nwlcData.restrictions || [])
          ])],
          requirements: [...new Set([
            ...(ppData.requirements || []),
            ...(guttmacherData.requirements || []),
            ...(kffData.requirements || []),
            ...(nwlcData.requirements || [])
          ])],
          recentUpdates: [
            ...(ppData.recentUpdates || []),
            ...(kffData.recentUpdates || []),
            ...(nwlcData.recentUpdates || [])
          ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
          sourceUrls: [...new Set([
            ...(ppData.sourceUrls || []),
            ...(acluData.sourceUrls || []),
            ...(guttmacherData.sourceUrls || []),
            ...(kffData.sourceUrls || []),
            ...(nwlcData.sourceUrls || [])
          ])],
          emergencyContacts: [
            {
              name: "National Abortion Federation Hotline",
              phone: "1-800-772-9100",
              available24x7: true
            },
            {
              name: "Planned Parenthood Direct Support",
              phone: "1-800-230-PLAN",
              available24x7: true
            }
          ],
          officialDocuments: [
            ...(stateGovData.officialDocuments || []),
            ...(kffData.officialDocuments || [])
          ],
          legalResources: [
            ...(stateResources.legalResources || []),
            ...(stateGovData.legalResources || []),
            ...(kffData.legalResources || [])
          ],
          stateWebsite: stateGovData.stateWebsite,
          healthDeptInfo: stateGovData.healthDeptInfo || {},
          newsArticles: [] // Initialize newsArticles array
        });


        // Check for existing state info
        const existingInfo = await db.query.legalInfo.findFirst({
          where: eq(legalInfo.state, state)
        });

        if (existingInfo) {
          // Update existing record
          await db.update(legalInfo)
            .set({
              restrictions: mergedData.restrictions,
              requirements: mergedData.requirements,
              recentUpdates: mergedData.recentUpdates,
              sourceUrls: mergedData.sourceUrls,
              additionalNotes: mergedData.additionalNotes,
              emergencyContacts: mergedData.emergencyContacts,
              officialDocuments: mergedData.officialDocuments,
              legalResources: mergedData.legalResources,
              stateWebsite: mergedData.stateWebsite,
              healthDeptInfo: mergedData.healthDeptInfo,
              newsArticles: mergedData.newsArticles,
              lastVerified: new Date(),
            })
            .where(eq(legalInfo.state, state));
        } else {
          // Insert new record
          await db.insert(legalInfo).values({
            state: mergedData.state,
            restrictions: mergedData.restrictions,
            requirements: mergedData.requirements,
            recentUpdates: mergedData.recentUpdates,
            sourceUrls: mergedData.sourceUrls,
            additionalNotes: mergedData.additionalNotes,
            emergencyContacts: mergedData.emergencyContacts,
            officialDocuments: mergedData.officialDocuments,
            legalResources: mergedData.legalResources,
            stateWebsite: mergedData.stateWebsite,
            healthDeptInfo: mergedData.healthDeptInfo,
            newsArticles: mergedData.newsArticles,
            effectiveDate: new Date(),
            lastVerified: new Date()
          });
        }

        console.log(`Successfully processed ${state}`);
      } catch (error) {
        console.error(`Error processing ${state}:`, error);
      }
    });
  }

  await queue.onIdle();
  console.log("Enhanced legal information crawler completed");
}

// Fallback data for testing when scraping fails
export const fallbackLegalInfo: Record<string, StateLegalInfo> = {
  "California": {
    state: "California",
    restrictions: [
      "No restrictions on abortion before viability",
      "Post-viability abortions allowed for life/health of the mother"
    ],
    requirements: [
      "Parental notification not required for minors",
      "No mandatory waiting period"
    ],
    recentUpdates: [
      {
        date: "2024-01-01",
        description: "California strengthened abortion access protections",
        impact: "Increased accessibility and funding for abortion services"
      }
    ],
    sourceUrls: ["https://www.plannedparenthood.org/learn/abortion/abortion-laws"],
    additionalNotes: "California has some of the strongest abortion protections in the United States. The state constitution explicitly protects the right to privacy, which courts have interpreted to include abortion rights.",
    emergencyContacts: [
      {
        name: "ACCESS Reproductive Justice",
        phone: "1-800-376-4636",
        available24x7: true
      }
    ],
    officialDocuments: [
      {
        title: "California Health and Safety Code Section 123460-123468",
        url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=123460",
        type: "legislation"
      },
      {
        title: "California Reproductive Privacy Act",
        url: "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=HSC&division=106.&title=&part=2.&chapter=2.&article=2.5",
        type: "legislation"
      },
      {
        title: "Abortion Access and Safe Haven Laws",
        url: "https://www.cdph.ca.gov/Programs/CFH/DMCAH/Pages/Abortion-Access.aspx",
        type: "guidance"
      }
    ],
    legalResources: [
      {
        name: "California Future of Abortion Council",
        url: "https://www.ca-fac.org/",
        description: "Coalition working to protect and expand abortion access in California"
      },
      {
        name: "National Abortion Federation - California Provider List",
        url: "https://prochoice.org/patients/find-a-provider/",
        description: "Directory of verified abortion providers in California"
      },
      {
        name: "ACCESS WHRC Legal Helpline",
        url: "https://www.reprolegalhelpline.org",
        description: "Free legal advice about abortion rights and access in California"
      }
    ],
    healthDeptInfo: {
      name: "California Department of Public Health",
      website: "https://www.cdph.ca.gov",
      phone: "1-916-558-1784",
      email: "reproductive.health@cdph.ca.gov"
    },
    newsArticles: []
  }
};

interface LegalUpdate {
  date: string;
  description: string;
  impact: string;
}

interface EmergencyContact {
  name: string;
  phone: string;
  available24x7: boolean;
}

interface StateLegalInfo {
  state: string;
  restrictions: string[];
  requirements: string[];
  recentUpdates: LegalUpdate[];
  effectiveDate?: string;
  sourceUrls: string[];
  additionalNotes?: string;
  emergencyContacts: EmergencyContact[];
  officialDocuments: Array<{
    title: string;
    url: string;
    type: string;
  }>;
  legalResources: Array<{
    name: string;
    url: string;
    description: string;
  }>;
  stateWebsite?: string;
  healthDeptInfo: {
    name?: string;
    website?: string;
    phone?: string;
    email?: string;
  };
  newsArticles: NewsArticle[];
}