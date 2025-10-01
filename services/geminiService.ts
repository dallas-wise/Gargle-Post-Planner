import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import type { WeekPlan, Post } from '../types';

type AIProvider = 'gemini' | 'openai';

// Read API keys at build-time via Vite
const GEMINI_API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY as string;
const OPENAI_API_KEY = (import.meta as any).env?.VITE_OPENAI_API_KEY as string;

if (!GEMINI_API_KEY) {
  throw new Error(
    "Missing VITE_GEMINI_API_KEY. Add it to your local .env/.env.local and set it as a Build-time env var in DigitalOcean."
  );
}

if (!OPENAI_API_KEY) {
  throw new Error(
    "Missing VITE_OPENAI_API_KEY. Add it to your local .env/.env.local and set it as a Build-time env var in DigitalOcean."
  );
}

const geminiAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY, dangerouslyAllowBrowser: true });

// Lightweight research focused on essentials: specials, contact info, and content ideas
const researchPracticeWithSearch = async (
  practiceUrl: string,
  practiceName: string,
  cachedResearch: { url: string; data: string } | null,
  setCachedResearch: (cache: { url: string; data: string }) => void
): Promise<string> => {
  // Return cached research if available for this URL
  if (cachedResearch && cachedResearch.url === practiceUrl) {
    console.log('Using cached research data');
    return cachedResearch.data;
  }

  try {
    // Configure the grounding tool for Google Search
    const groundingTool = {
      googleSearch: {}
    };

    console.log('Fetching focused research data...');
    const response = await geminiAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Research ${practiceName} at ${practiceUrl} and extract ONLY the following essential information:

1. **Contact Info**: Phone number, full address/location
2. **Current Specials/Promotions**: Any active deals, discounts, or special offers
3. **Unique Differentiators**: 2-3 key things that make them stand out (e.g., specific technology, community involvement, unique philosophy)
4. **Content Ideas**: 3-5 interesting topics we could post about based on their website

Keep it concise and focused. Skip lengthy service lists or detailed bios.`,
      config: {
        tools: [groundingTool],
        temperature: 0.3,
      },
    });

    const researchData = response.text || 'No research results available';

    // Cache the research result
    setCachedResearch({ url: practiceUrl, data: researchData });

    return researchData;
  } catch (error) {
    console.warn('Failed to research practice:', error);
    return `Research unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};


// Helper function to calculate posting dates for the schedule
const calculatePostingDates = (startDate: string, postSchedule: 'MW' | 'TTH', numWeeks: number) => {
  const start = new Date(startDate);
  const dates: { week: number; dates: string[] }[] = [];

  const daysOfWeek = postSchedule === 'MW' ? [1, 3] : [2, 4]; // Monday=1, Tuesday=2, Wednesday=3, Thursday=4

  for (let week = 0; week < numWeeks; week++) {
    const weekDates: string[] = [];
    for (const dayOfWeek of daysOfWeek) {
      const date = new Date(start);
      date.setDate(start.getDate() + (week * 7) + (dayOfWeek - start.getDay() + (dayOfWeek >= start.getDay() ? 0 : 7)));
      weekDates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    }
    dates.push({ week: week + 1, dates: weekDates });
  }

  return dates;
};

// Helper function to generate content for a subset of weeks
const generateWeeksBatch = async (
  practiceName: string,
  practiceUrl: string,
  startDate: string,
  postSchedule: 'MW' | 'TTH',
  weekStart: number,
  weekEnd: number,
  practiceResearch: string,
  aiProvider: AIProvider,
  pastPostsContent?: string,
  onboardingContent?: string,
  specialInstructions?: string,
  practicePhone?: string,
  practiceLocation?: string,
  milestones?: string
): Promise<WeekPlan[]> => {
  const scheduleText = postSchedule === 'MW' ? 'Mondays and Wednesdays' : 'Tuesdays and Thursdays';
  const numWeeks = weekEnd - weekStart + 1;
  const totalPosts = numWeeks * 2;

  // Calculate exact posting dates
  const postingDates = calculatePostingDates(startDate, postSchedule, 12);
  const relevantDates = postingDates.slice(weekStart - 1, weekEnd);

  // Format dates for the prompt
  const dateSchedule = relevantDates.map(({ week, dates }) =>
    `Week ${week}: ${dates[0]} and ${dates[1]}`
  ).join('\n');

  // ============================================================================
  // REFERENCE DATA
  // ============================================================================

  const referenceData = {
    onboardingDocument: onboardingContent || null,
    pastPosts: pastPostsContent || null,
    contactInfo: {
      phone: practicePhone || null,
      location: practiceLocation || null
    },
    teamMilestones: milestones || null,
    userInstructions: specialInstructions || null,
    practiceInfo: practiceResearch
  };

  // ============================================================================
  // NEW IMPROVED PROMPT - Focus on unique engaging content
  // ============================================================================

  const systemInstruction = `You are a creative social media strategist for dental practices. Your goal is to create ENGAGING, UNIQUE, and AUTHENTIC content that connects with real people - not just list services.

${referenceData.onboardingDocument ? `=== CLIENT ONBOARDING INFO ===
${referenceData.onboardingDocument}

` : ''}${referenceData.pastPosts ? `=== PAST POSTS (DO NOT DUPLICATE) ===
${referenceData.pastPosts}

` : ''}${referenceData.contactInfo.phone ? `Phone: ${referenceData.contactInfo.phone}
` : ''}${referenceData.contactInfo.location ? `Location: ${referenceData.contactInfo.location}
` : ''}${referenceData.userInstructions ? `=== SPECIAL INSTRUCTIONS ===
${referenceData.userInstructions}

` : ''}=== PRACTICE RESEARCH ===
${referenceData.practiceInfo}

${referenceData.teamMilestones ? `=== TEAM MILESTONES (USE EXACT DATES) ===
${referenceData.teamMilestones}

CRITICAL MILESTONE RULES:
- Post milestones ON THE EXACT DATE or the closest posting day if exact date isn't a posting day
- Each milestone gets EXACTLY ONE post - never duplicate
- If milestone falls between posting days, use the NEAREST posting day
- Track which milestones you've used to avoid duplicates

` : ''}=== POSTING SCHEDULE WITH EXACT DATES ===
${dateSchedule}

=== CONTENT STRATEGY ===

**PRIMARY GOAL**: Create diverse, engaging posts that people WANT to read - not just service advertisements.

**Content Mix** (vary throughout 12 weeks):
1. **Patient Education** (30%): Helpful tips, myth-busting, dental health facts
2. **Behind-the-Scenes** (25%): Team culture, day-in-the-life, practice personality
3. **Community Connection** (20%): Local events, community involvement, relatable stories
4. **Service Highlights** (15%): Procedures/technology (but make them interesting/story-driven)
5. **Engagement Posts** (10%): Questions, polls, fun facts, interactive content

**WHAT MAKES GREAT CONTENT**:
- Tell stories, don't just list facts
- Show personality and humanity
- Make people smile, think, or learn something new
- Feel authentic and conversational
- Connect emotionally before promoting services

**WHAT TO AVOID**:
- Don't make every post about services
- Don't sound like a corporate brochure
- Don't overuse practice name (use naturally, maybe 30% of posts)
- Don't force location into every caption
- Don't be repetitive (track themes you've used)

**HOLIDAY POSTING RULES**:
- Post holiday content ON THE HOLIDAY DATE or 1 day before
- Use the EXACT dates from the posting schedule above
- Example: If Christmas (Dec 25) falls between Dec 22 and Dec 29 posts, use the Dec 24 or Dec 26 post (whichever is closest)
- Never post holiday content more than 1 day before the actual holiday

**TONE & STYLE**:
- Friendly, warm, approachable
- Educational but not preachy
- Professional but personable
- Use 0-2 emojis maximum per post (sparingly!)

**OUTPUT FORMAT**:
- title: Max 60 characters, compelling and specific
- caption: 120-180 words, one natural CTA, 4-6 relevant hashtags (local + topic)
- Hashtags will be auto-lowercased

Generate exactly ${totalPosts} posts across weeks ${weekStart}-${weekEnd}.

Return ONLY valid JSON:
{
  "weeks": [
    {
      "week": 1,
      "posts": [
        {"title": "Post Title", "caption": "Caption with #hashtags"},
        {"title": "Post Title", "caption": "Caption with #hashtags"}
      ]
    }
  ]
}`;

  const userPrompt = `Generate a ${numWeeks}-week content calendar for ${practiceName}.

Start Date: ${startDate}
Posting Days: ${scheduleText}
Weeks: ${weekStart} through ${weekEnd}

Focus on unique, engaging content that connects with real people. Make it diverse and interesting!`;


  try {
    let jsonText: string;

    if (aiProvider === 'openai') {
      // Use OpenAI GPT-5 (temperature must be 1, the default)
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      });

      jsonText = response.choices[0]?.message?.content || '';
    } else {
      // Use Gemini
      const response = await geminiAI.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      jsonText = response.text || '';
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
        week: weekStart + index,
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
    console.error(`${aiProvider.toUpperCase()} API call failed:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    throw new Error(`Failed to generate content plan. Details: ${errorMessage}`);
  }
};

export const generateContentPlan = async (
  practiceName: string,
  practiceUrl: string,
  startDate: string,
  postSchedule: 'MW' | 'TTH',
  aiProvider: AIProvider,
  pastPostsContent?: string,
  onboardingContent?: string,
  specialInstructions?: string,
  practicePhone?: string,
  practiceLocation?: string,
  milestones?: string,
  cachedResearch?: { url: string; data: string } | null,
  setCachedResearch?: (cache: { url: string; data: string }) => void
): Promise<WeekPlan[]> => {
  // Research the practice (with caching)
  const practiceResearch = await researchPracticeWithSearch(
    practiceUrl,
    practiceName,
    cachedResearch || null,
    setCachedResearch || (() => {})
  );

  console.log(`Generating complete 12-week content plan with ${aiProvider.toUpperCase()}...`);

  // Generate all 12 weeks in a single call to ensure consistency
  const allWeeks = await generateWeeksBatch(
    practiceName,
    practiceUrl,
    startDate,
    postSchedule,
    1,
    12,
    practiceResearch,
    aiProvider,
    pastPostsContent,
    onboardingContent,
    specialInstructions,
    practicePhone,
    practiceLocation,
    milestones
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
  aiProvider: AIProvider,
  onboardingContent?: string,
  pastPostsContent?: string,
  cachedResearch?: { url: string; data: string } | null,
  setCachedResearch?: (cache: { url: string; data: string }) => void
): Promise<Post> => {
  // Research the practice (with caching)
  const practiceResearch = await researchPracticeWithSearch(
    practiceUrl,
    practiceName,
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
  // NEW IMPROVED SINGLE POST PROMPT
  // ============================================================================

  const systemInstruction = `You are a creative social media strategist for dental practices. Create ONE unique, engaging post that connects with real people.

${onboardingContent ? `=== CLIENT ONBOARDING INFO ===
${onboardingContent}

` : ''}${pastPostsContent ? `=== PAST POSTS (DO NOT DUPLICATE) ===
${pastPostsContent}

` : ''}=== EXISTING POSTS IN PLAN (DO NOT DUPLICATE) ===
${existingPostsText}

${instructions ? `=== USER INSTRUCTIONS ===
${instructions}

` : ''}=== PRACTICE RESEARCH ===
${practiceResearch}

=== POST DATE ===
${postDate}

=== CONTENT GUIDELINES ===

**Goal**: Create engaging content that connects emotionally - not just promotional service ads.

**Content Variety** (choose one approach):
- Patient Education: Helpful tip, myth-buster, dental health fact
- Behind-the-Scenes: Team culture, day-in-the-life, practice personality
- Community Connection: Local event, community involvement, relatable story
- Service Highlight: Make it story-driven and interesting (not just a list of features)
- Engagement: Question, poll, fun fact, interactive

**Make It Great**:
- Tell a story, don't list facts
- Show personality and humanity
- Make people smile or learn something
- Feel authentic and conversational
- Connect emotionally first

**Avoid**:
- Don't make it all about services
- Don't sound corporate or salesy
- Don't overuse practice name (only if natural)
- Don't force location into caption
- Don't duplicate themes from existing posts

**Date Accuracy**:
- If post date matches a holiday, you MAY include it (but don't force it)
- Use the EXACT date provided - don't post holidays more than 1 day early
- If milestone date is mentioned in user instructions, post ON that date

**Style**:
- Friendly, warm, approachable
- Educational but not preachy
- Professional but personable
- 0-2 emojis maximum (sparingly!)

**Format**:
- title: Max 60 characters, compelling and specific
- caption: 120-180 words, one natural CTA, 4-6 relevant hashtags
- Hashtags will be auto-lowercased

Return ONLY valid JSON:
{"title": "Post Title", "caption": "Caption with #hashtags"}`;

  const userPrompt = `Generate ONE unique post for ${practiceName} on ${postDate}.

Make it engaging and different from existing posts!`;


  try {
    let jsonText: string;

    if (aiProvider === 'openai') {
      // Use OpenAI GPT-5 (temperature must be 1, the default)
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      });

      jsonText = response.choices[0]?.message?.content || '';
    } else {
      // Use Gemini
      const response = await geminiAI.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.8,
        },
      });

      jsonText = response.text || '';
    }

    if (!jsonText) {
      throw new Error("Received an empty response from the AI when regenerating post.");
    }

    // Clean the response by removing markdown code blocks if present
    const cleanedJson = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
    const parsedData = JSON.parse(cleanedJson);

    if (parsedData && parsedData.title && parsedData.caption) {
      // Post-process to ensure hashtags are lowercase
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
