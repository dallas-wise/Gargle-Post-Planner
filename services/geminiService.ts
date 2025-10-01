import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import type { WeekPlan, Post } from '../types';

// Use OpenAI with web search to research the dental practice
const researchPracticeWithSearch = async (
  practiceUrl: string,
  practiceName: string,
  openai: OpenAI,
  cachedResearch: { url: string; data: string } | null,
  setCachedResearch: (cache: { url: string; data: string }) => void
): Promise<string> => {
  // Return cached research if available for this URL
  if (cachedResearch && cachedResearch.url === practiceUrl) {
    console.log('Using cached research data');
    return cachedResearch.data;
  }

  try {
    const researchQuery = `Research this dental practice comprehensively: ${practiceName} at ${practiceUrl}

Please analyze and provide detailed information about:
1. Practice name and location (city, state, address)
2. All dental services offered (be comprehensive, not just basic cleanings)
3. Practice specializations and areas of expertise (focus on services, not individual doctors)
4. Practice philosophy and brand voice
5. Technology and equipment used
6. Any awards, certifications, or recognition
7. Community involvement or local partnerships
8. Contact information (phone, email)
9. Unique selling points that differentiate this practice
10. Target patient demographics
11. Any special programs or offers

Format the response as detailed, well-organized information that can be used to create authentic social media content.`;

    console.log('Fetching fresh research data from OpenAI with web search...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-search-preview',
      messages: [
        {
          role: 'user',
          content: researchQuery
        }
      ],
      temperature: 0.3,
    });

    const researchData = response.choices[0]?.message?.content || 'No research results available';

    // Cache the research result
    setCachedResearch({ url: practiceUrl, data: researchData });

    return researchData;
  } catch (error) {
    console.warn('Failed to research practice with OpenAI:', error);
    return `Research unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

// Read at build-time via Vite:
const OPENAI_API_KEY = (import.meta as any).env?.VITE_OPENAI_API_KEY as string;
const GEMINI_API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY as string;

// Initialize OpenAI if key is available
const openai = OPENAI_API_KEY ? new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Required for client-side usage
}) : null;

// Initialize Gemini if key is available
const geminiAI = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;


// Helper function to generate content for a subset of weeks
const generateWeeksBatch = async (
  practiceName: string,
  practiceUrl: string,
  startDate: string,
  postSchedule: 'MW' | 'TTH',
  weekStart: number,
  weekEnd: number,
  practiceResearch: string,
  pastPostsContent?: string,
  onboardingContent?: string,
  specialInstructions?: string,
  practicePhone?: string,
  practiceLocation?: string,
  milestones?: string,
  aiProvider: 'openai' | 'gemini' = 'openai'
): Promise<WeekPlan[]> => {
  const scheduleText = postSchedule === 'MW' ? 'Mondays and Wednesdays' : 'Tuesdays and Thursdays';
  const numWeeks = weekEnd - weekStart + 1;
  const totalPosts = numWeeks * 2;

  // ============================================================================
  // REFERENCE DATA - Available for use in your prompt below
  // ============================================================================

  const referenceData = {
    // Client's onboarding document (if provided)
    onboardingDocument: onboardingContent || null,

    // Past posts to avoid duplicating (if provided)
    pastPosts: pastPostsContent || null,

    // Verified contact information
    contactInfo: {
      phone: practicePhone || null,
      location: practiceLocation || null
    },

    // Team birthdays and work anniversaries
    teamMilestones: milestones || null,

    // Special instructions from user
    userInstructions: specialInstructions || null,

    // Practice research from web search
    practiceInfo: practiceResearch
  };

  // ============================================================================
  // YOUR CUSTOM PROMPT GOES HERE
  // ============================================================================

  const systemInstruction = `
${referenceData.onboardingDocument ? `CLIENT ONBOARDING DOCUMENT:
${referenceData.onboardingDocument}

` : ''}${referenceData.pastPosts ? `PAST POSTS (DO NOT DUPLICATE THESE):
${referenceData.pastPosts}

` : ''}${referenceData.contactInfo.phone ? `PRACTICE PHONE: ${referenceData.contactInfo.phone}
` : ''}${referenceData.contactInfo.location ? `PRACTICE LOCATION: ${referenceData.contactInfo.location}
` : ''}${referenceData.teamMilestones ? `TEAM BIRTHDAYS & WORK ANNIVERSARIES:
${referenceData.teamMilestones}

` : ''}${referenceData.userInstructions ? `SPECIAL INSTRUCTIONS:
${referenceData.userInstructions}

` : ''}PRACTICE RESEARCH:
${referenceData.practiceInfo}

---

You are a senior social-media strategist for dental practices. Using ONLY the information above (onboarding doc, past posts to avoid, verified contact info, milestones, special instructions, and practice research), create a 12-week content calendar for this practice.

Goals:

Drive appointment requests and recall visits.

Educate local patients and highlight differentiators (technology, specialties, philosophy).

Stay compliant (no medical diagnosis, no guarantees, no PHI/identifiable patient details).

Constraints & style:

Brand voice: mirror the voice implied by the onboarding document and research (friendly, trustworthy, community-focused; avoid hype).

Variety mix across the plan (rough guideline each week or across adjacent weeks):

Education/Prevention tips,

Service spotlight (specific procedures, benefits, candid FAQs),

Social proof/community (team culture, community involvement, non-identifying testimonials or reviews),

Engagement prompts (polls/questions/fun facts),

Promotions/special programs ONLY if present in research/onboarding.

Integrate team milestones (birthdays/anniversaries) during the appropriate week; if the exact date isn't a posting day, schedule the milestone post on the nearest scheduled day that week.

Localize where appropriate (reference city/area from research), but never invent details that aren't supported by the inputs.

Compliance: avoid clinical claims or before/after promises; use general benefits and encouragement to book a consult. Do not mention prices unless provided. No PHI.

Each post must be unique, non-repetitive, and must NOT duplicate anything in "PAST POSTS" (and should minimize overlap in themes and wording across the 12 weeks).

Output requirements per post:

title: ≤ 60 characters; concise, specific, scroll-stopping.

caption: 80–180 words, clear and helpful, with ONE natural call-to-action (e.g., "Call us" or "Book online") using the verified phone/location if provided. Include 3–7 relevant hashtags mixing service + local terms (they'll be lowercased later). Emojis optional and tasteful (0–3).

Do not include links unless the practice website was provided; prefer "Call us" or "Book a visit" CTAs.

No image prompts/notes outside the caption (schema only allows title/caption).

Scheduling rules:

Generate exactly ${totalPosts} posts across ${numWeeks} weeks for weeks ${weekStart}-${weekEnd}, assuming two posts on the specified posting days.

If a major seasonal/holiday date falls in range and is clearly relevant to the location, you may theme one post that week (still follow the variety mix).

Return ONLY the JSON in the required format and nothing else (no prose, no markdown, no comments).

---

REQUIRED JSON OUTPUT FORMAT:
{
  "weeks": [
    {
      "week": 1,
      "posts": [
        {"title": "Post Title", "caption": "Caption text with #hashtags"},
        {"title": "Post Title", "caption": "Caption text with #hashtags"}
      ]
    }
  ]
}`;

  // ============================================================================
  // USER PROMPT - Keep this simple
  // ============================================================================

  const userPrompt = `
Practice Name: ${practiceName}
Website: ${practiceUrl}
Start Date: ${startDate}
Posting Days: ${scheduleText}
Weeks to Generate: ${weekStart} through ${weekEnd} (${totalPosts} total posts)

Generate the content calendar now.
`;


  try {
    let jsonText: string | null = null;

    if (aiProvider === 'openai') {
      if (!openai) {
        throw new Error("OpenAI API key is not configured. Please add VITE_OPENAI_API_KEY to your environment variables.");
      }
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemInstruction
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });
      jsonText = response.choices[0]?.message?.content;
    } else {
      // Use Gemini
      if (!geminiAI) {
        throw new Error("Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your environment variables.");
      }
      const response = await geminiAI.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });
      jsonText = response.text;
    }

    if (!jsonText) {
      throw new Error("Received an empty response from the AI.");
    }

    // Clean the response by removing markdown code blocks if present
    const cleanedJson = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
    const parsedData = JSON.parse(cleanedJson);
    
    if (parsedData && parsedData.weeks) {
      // Post-process to ensure all hashtags are lowercase and week numbers are correct
      const processedWeeks = parsedData.weeks.map((week: WeekPlan, index: number) => ({
        ...week,
        week: weekStart + index, // Ensure correct week numbering
        posts: week.posts.map(post => ({
          ...post,
          caption: post.caption.replace(/#(\w+)/g, (_match: string, tag: string) => `#${tag.toLowerCase()}`)
        }))
      }));
      return processedWeeks as WeekPlan[];
    } else {
      throw new Error("Invalid data structure received from AI. The 'weeks' array is missing.");
    }

  } catch (error) {
    console.error("Gemini API call failed:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    // Check for specific Gemini API related error messages if available
    if (errorMessage.includes("API key not valid")) {
        throw new Error("The provided API Key is not valid. Please check your environment variable.");
    }
    throw new Error(`Failed to generate content plan. Please check the website URL and try again. Details: ${errorMessage}`);
  }
};

export const generateContentPlan = async (
  practiceName: string,
  practiceUrl: string,
  startDate: string,
  postSchedule: 'MW' | 'TTH',
  pastPostsContent?: string,
  onboardingContent?: string,
  specialInstructions?: string,
  practicePhone?: string,
  practiceLocation?: string,
  milestones?: string,
  cachedResearch?: { url: string; data: string } | null,
  setCachedResearch?: (cache: { url: string; data: string }) => void,
  aiProvider: 'openai' | 'gemini' = 'openai'
): Promise<WeekPlan[]> => {
  // Research the practice using OpenAI with web search (with caching)
  const practiceResearch = await researchPracticeWithSearch(
    practiceUrl,
    practiceName,
    openai,
    cachedResearch || null,
    setCachedResearch || (() => {})
  );

  console.log('Generating complete 12-week content plan...');

  // Generate all 12 weeks in a single call to ensure consistency, variety, and proper milestone handling
  const allWeeks = await generateWeeksBatch(
    practiceName,
    practiceUrl,
    startDate,
    postSchedule,
    1,
    12,
    practiceResearch,
    pastPostsContent,
    onboardingContent,
    specialInstructions,
    practicePhone,
    practiceLocation,
    milestones,
    aiProvider
  );

  return allWeeks;
};


export const generateSinglePost = async (
  practiceName: string,
  practiceUrl: string,
  currentPlan: WeekPlan[],
  postToReplace: { weekIndex: number; postIndex: number },
  postDate: string,
  instructions: string,
  onboardingContent?: string,
  pastPostsContent?: string,
  cachedResearch?: { url: string; data: string } | null,
  setCachedResearch?: (cache: { url: string; data: string }) => void,
  aiProvider: 'openai' | 'gemini' = 'openai'
): Promise<Post> => {
  // Research the practice using OpenAI with web search (with caching)
  const practiceResearch = await researchPracticeWithSearch(
    practiceUrl,
    practiceName,
    openai,
    cachedResearch || null,
    setCachedResearch || (() => {})
  );

  // Create a list of all other post titles and captions to avoid duplication
  const existingPostsText = currentPlan
    .flatMap((week, wIndex) =>
      week.posts.map((post, pIndex) => {
        if (wIndex === postToReplace.weekIndex && pIndex === postToReplace.postIndex) {
          return null; // Don't include the post we're replacing
        }
        return `- ${post.title}: ${post.caption}`;
      })
    )
    .filter(Boolean)
    .join('\n');

  // ============================================================================
  // REFERENCE DATA - Available for use in your prompt below
  // ============================================================================

  const referenceData = {
    // Client's onboarding document (if provided)
    onboardingDocument: onboardingContent || null,

    // Past posts to avoid duplicating (if provided)
    pastPosts: pastPostsContent || null,

    // Existing posts in current plan (to avoid duplication)
    existingPosts: existingPostsText,

    // User's regeneration instructions
    userInstructions: instructions || null,

    // Practice research from web search
    practiceInfo: practiceResearch,

    // Date for this post
    postDate: postDate
  };

  // ============================================================================
  // YOUR CUSTOM PROMPT FOR SINGLE POST REGENERATION GOES HERE
  // ============================================================================

  const systemInstruction = `
${referenceData.onboardingDocument ? `CLIENT ONBOARDING DOCUMENT:
${referenceData.onboardingDocument}

` : ''}${referenceData.pastPosts ? `PAST POSTS (DO NOT DUPLICATE):
${referenceData.pastPosts}

` : ''}EXISTING POSTS IN CURRENT PLAN (DO NOT DUPLICATE):
${referenceData.existingPosts}

${referenceData.userInstructions ? `USER INSTRUCTIONS FOR THIS POST:
${referenceData.userInstructions}

` : ''}PRACTICE RESEARCH:
${referenceData.practiceInfo}

POST DATE: ${referenceData.postDate}

---

You are a senior social-media strategist for dental practices. Using ONLY the information above (onboarding doc, past posts to avoid, existing posts in the current plan, user instructions, practice research, and the provided post date), write ONE replacement post for the specified date.

Goals:

Fit naturally within the existing 12-week plan while avoiding duplication with "PAST POSTS" and "EXISTING POSTS."

Drive appointment interest and educate locals about this practice's differentiators.

Tailoring & style:

Match brand voice from the onboarding/research.

If the POST DATE aligns with a reasonable seasonal/holiday or with a listed milestone, tastefully incorporate it; otherwise ignore.

Compliance: no diagnosis, no guarantees, no PHI; no prices unless provided.

Output requirements:

title: ≤ 60 characters; specific and compelling.

caption: 80–180 words with ONE natural CTA (call or book). Use verified phone/location if provided. Include 3–7 relevant hashtags (service + local; they'll be lowercased later). Emojis optional (0–3).

Must be unique and not overlap wording/themes already present in "EXISTING POSTS."

Return ONLY the JSON object in the required format and nothing else (no prose, no markdown, no comments).

---

REQUIRED JSON OUTPUT FORMAT:
{"title": "Post Title", "caption": "Caption text with #hashtags"}
`;

  // ============================================================================
  // USER PROMPT - Keep this simple
  // ============================================================================

  const userPrompt = `
Practice Name: ${practiceName}
Website: ${practiceUrl}
Post Date: ${postDate}

Generate one unique post now.
`;

  
  try {
    let jsonText: string | null = null;

    if (aiProvider === 'openai') {
      if (!openai) {
        throw new Error("OpenAI API key is not configured. Please add VITE_OPENAI_API_KEY to your environment variables.");
      }
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemInstruction
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      });
      jsonText = response.choices[0]?.message?.content;
    } else {
      // Use Gemini
      if (!geminiAI) {
        throw new Error("Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your environment variables.");
      }
      const response = await geminiAI.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.8,
        },
      });
      jsonText = response.text;
    }

    if (!jsonText) {
      throw new Error("Received an empty response from the AI when regenerating post.");
    }

    // Clean the response by removing markdown code blocks if present
    const cleanedJson = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
    const parsedData = JSON.parse(cleanedJson);

    if (parsedData && parsedData.title && parsedData.caption) {
      // Post-process the single post to ensure hashtags are lowercase.
      parsedData.caption = parsedData.caption.replace(/#(\w+)/g, (_match: string, tag: string) => `#${tag.toLowerCase()}`);
      return parsedData as Post;
    } else {
       throw new Error("Invalid data structure received from AI for single post.");
    }

  } catch (error) {
    console.error(`${aiProvider.toUpperCase()} API call failed during single post regeneration:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    throw new Error(`Failed to regenerate post. Details: ${errorMessage}`);
  }
};