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

  const systemInstruction = `You are a social media content creator for dental practices. Generate a ${numWeeks}-week content calendar (weeks ${weekStart}-${weekEnd}) with 2 posts per week.

**PRACTICE INFORMATION:**
${practiceResearch}

${onboardingContent ? `**PRIMARY SOURCE - ONBOARDING DOCUMENT:**
${onboardingContent}
` : ''}

${(practicePhone || practiceLocation) ? `**VERIFIED CONTACT INFO (use ONLY these):**
${practicePhone ? `Phone: ${practicePhone}` : ''}
${practiceLocation ? `Location: ${practiceLocation}` : ''}
` : ''}

${specialInstructions ? `**SPECIAL INSTRUCTIONS (MANDATORY FOR ALL POSTS):**
${specialInstructions}
` : ''}

---
**CRITICAL RULES:**

1. **HOLIDAYS** - Calculate exact dates based on start date provided:
   - Post holiday content ON the holiday or 1 day before
   - Holidays: Christmas (12/25), Thanksgiving (4th Thu Nov), New Year (1/1), July 4th, Halloween (10/31), Valentine's (2/14), Mother's/Father's Day, Easter, Memorial/Labor Day
   - Example: If Christmas 12/25 falls between post dates 12/23 and 12/26, use 12/23 (closest before)
   - ONE post per holiday only

2. ${milestones ? `**MILESTONES (MANDATORY)** - These specific dates MUST get posts:
${milestones}

FOR EACH milestone listed:
- Calculate which post date is NEAREST to that milestone date
- Create exactly ONE post for that milestone on the nearest date
- If nearest date is a major holiday, use next closest date
- Mark each milestone as "used" to avoid duplicates
- Do NOT skip any milestone - every one must get exactly one post

Example: "John Birthday - Nov 30"
- Post dates: Nov 28, Dec 1, Dec 5
- Use Dec 1 (closest to Nov 30)
- Do NOT create another John birthday post anywhere else
` : 'No team milestones provided.'}

3. **CONTENT VARIETY** - NO REPETITION:
   - Track every topic you use
   - Each of the 24 posts must be completely different
   - If you mention "digital impressions" once, NEVER mention it again
   - Rotate: education, services, technology, community, seasonal tips, fun facts
   - Different service each time: cleaning, whitening, implants, orthodontics, cosmetic, emergency, pediatric, etc.

4. **NO EMPLOYEE/PATIENT POSTS** except for the specific milestones listed above

5. **WRITING STYLE:**
   - Conversational and natural
   - Don't force practice name/location into every post
   - Vary structure - not every post should sound the same
   - Hashtags in lowercase

${pastPostsContent ? `**PAST POSTS TO AVOID:**
${pastPostsContent}
` : ''}

**OUTPUT FORMAT (JSON only):**
{
  "weeks": [
    {
      "week": 1,
      "posts": [
        {"title": "Post Title", "caption": "Caption text #hashtag"},
        {"title": "Post Title", "caption": "Caption text #hashtag"}
      ]
    }
  ]
}`;

  const userPrompt = `Practice: ${practiceName}
Website: ${practiceUrl}
Start Date: ${startDate}
Post Days: ${scheduleText}

Generate weeks ${weekStart}-${weekEnd} (${numWeeks} weeks = ${numWeeks * 2} posts total).

IMPORTANT: Calculate the exact posting dates based on the start date and schedule. For example:
- If start date is 2024-12-01 (Sunday) and schedule is "Tuesdays & Thursdays"
- Week 1 posts: Dec 3 (Tue), Dec 5 (Thu)
- Week 2 posts: Dec 10 (Tue), Dec 12 (Thu)
- Use these exact dates to determine which posts should be for holidays or milestones.

Create the JSON response now.`;


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
        return `- Title: ${post.title}\n  Caption: ${post.caption}`;
      })
    )
    .filter(Boolean) // Remove null entries
    .join('\n');

  const systemInstruction = `Generate ONE unique social media post for a dental practice.

**PRACTICE INFO:**
${practiceResearch}

${onboardingContent ? `**ONBOARDING DATA:**
${onboardingContent}
` : ''}

**POST DATE:** ${postDate}
Check if this is a major holiday and create holiday content if appropriate.

${instructions ? `**USER INSTRUCTIONS:** ${instructions}` : ''}

**RULES:**
- Must be completely different from existing posts
- Conversational, natural tone
- Don't force practice name/location
- Vary content: education, services, technology, community, tips
- Hashtags lowercase

**AVOID THESE TOPICS (already used):**
${existingPostsText}

${pastPostsContent ? `**PAST POSTS (don't repeat):**
${pastPostsContent}
` : ''}

**OUTPUT (JSON only):**
{"title": "Title", "caption": "Caption #hashtags"}`;

  const userPrompt = `Practice: ${practiceName}
Date: ${postDate}
Create one unique post now.`;

  
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