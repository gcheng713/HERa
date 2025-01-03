import axios from "axios";
import * as cheerio from "cheerio";
import pLimit from "p-limit";

const limit = pLimit(3); // Limit concurrent requests

interface NewsArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  source: string;
  timestamp: string;
  state?: string;
}

const NEWS_SOURCES = {
  planned_parenthood: "https://www.plannedparenthood.org/about-us/newsroom",
  rewire: "https://rewirenewsgroup.com/",
  guttmacher: "https://www.guttmacher.org/news",
  kaiser_health: "https://khn.org/topics/womens-health/",
  npr_health: "https://www.npr.org/sections/health-shots/"
};

// Mock data for development since we can't access external sites directly
const MOCK_NEWS_ARTICLES: NewsArticle[] = [
  {
    id: 1,
    title: "Supreme Court to Review Mifepristone Access Case",
    description: "The Supreme Court has agreed to hear a case that could affect access to the abortion pill mifepristone nationwide, setting up another major abortion ruling.",
    url: "https://example.com/news/1",
    source: "Kaiser Health News",
    timestamp: new Date("2025-01-02T10:30:00").toISOString(),
    state: "National"
  },
  {
    id: 2,
    title: "New Study Shows Impact of State Abortion Restrictions",
    description: "Research from the Guttmacher Institute reveals how state-level restrictions affect access to reproductive healthcare services across different regions.",
    url: "https://example.com/news/2",
    source: "Guttmacher Institute",
    timestamp: new Date("2025-01-02T09:15:00").toISOString(),
    state: "National"
  },
  {
    id: 3,
    title: "Healthcare Providers Adapt to Changing Legal Landscape",
    description: "Medical professionals are developing new strategies to ensure continued access to reproductive healthcare while navigating evolving state regulations.",
    url: "https://example.com/news/3",
    source: "NPR Health",
    timestamp: new Date("2025-01-02T08:45:00").toISOString(),
    state: "National"
  },
  {
    id: 4,
    title: "Telehealth Services Expand for Reproductive Care",
    description: "Virtual healthcare providers are increasing their capacity to serve patients in areas with limited access to in-person reproductive health services.",
    url: "https://example.com/news/4",
    source: "Rewire News Group",
    timestamp: new Date("2025-01-02T07:20:00").toISOString(),
    state: "National"
  },
  {
    id: 5,
    title: "States Consider New Reproductive Healthcare Legislation",
    description: "Multiple state legislatures are debating bills that could significantly impact access to reproductive healthcare services in 2025.",
    url: "https://example.com/news/5",
    source: "Planned Parenthood",
    timestamp: new Date("2025-01-02T06:30:00").toISOString(),
    state: "National"
  }
];

export async function fetchLatestNews(): Promise<NewsArticle[]> {
  // For development, return mock data since we can't access external sites
  return MOCK_NEWS_ARTICLES;

  // The following code would be used in production with proper API access
  /* 
  const allNews: NewsArticle[] = [];

  try {
    // Fetch from each news source in parallel with rate limiting
    const fetchPromises = Object.entries(NEWS_SOURCES).map(([source, url]) =>
      limit(async () => {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const articles: NewsArticle[] = [];

        // Customize selector and parsing logic for each source
        const selector = source === 'planned_parenthood' ? '.newsroom-article' :
                        source === 'kaiser_health' ? '.article-preview' :
                        '.article';

        $(selector).each((i, el) => {
          const title = $(el).find('h2, h3').first().text().trim();
          const description = $(el).find('p, .excerpt').first().text().trim();
          const url = $(el).find('a').first().attr('href');
          const timestamp = $(el).find('.date, time').first().text().trim();

          if (title && description) {
            articles.push({
              id: Date.now() + i + Math.random(),
              title,
              description,
              url: url || NEWS_SOURCES[source],
              source: source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
              timestamp: new Date(timestamp).toISOString(),
              state: "National"
            });
          }
        });

        return articles;
      })
    );

    const results = await Promise.all(fetchPromises);
    allNews.push(...results.flat());

  } catch (error) {
    console.error("Error fetching news:", error);
    // Return mock data as fallback if fetching fails
    return MOCK_NEWS_ARTICLES;
  }

  // Sort by timestamp (most recent first) and limit to 20 articles
  return allNews
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);
  */
}