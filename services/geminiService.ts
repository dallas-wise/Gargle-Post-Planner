import { GoogleGenAI, Type } from '@google/genai';
import type { WeekPlan, Post } from '../types';

// Read at build-time via Vite:
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

if (!API_KEY) {
  throw new Error(
    "Missing VITE_GEMINI_API_KEY. Add it to your local .env/.env.local and set it as a Build-time env var in DigitalOcean."
  );
}

const ai = new GoogleGenAI({ apiKey: API_KEY });


export const generateContentPlan = async (
  practiceName: string,
  practiceUrl: string,
  startDate: string,
  postSchedule: 'MW' | 'TTH',
  pastPostsContent?: string,
  onboardingContent?: string
): Promise<WeekPlan[]> => {
  const scheduleText = postSchedule === 'MW' ? 'Mondays and Wednesdays' : 'Tuesdays and Thursdays';

  const systemInstruction = `
    Act as a social media marketing expert specializing in content for dental practices. Your task is to generate a 12-week social media content calendar.

    You will be given the practice name, website, content start date, posting schedule, and potentially an onboarding document and a list of past posts.

    **Primary Research Source:**
    ${onboardingContent ? `
    An onboarding document has been provided. This is your PRIMARY source of truth for the practice's details. Use it to understand the practice's brand voice, tone, specific services, team members, and unique selling propositions. The website should be used as a secondary, supplementary resource.
    ` : `
    First, thoroughly research the dental practice using their website to identify:
    - The practice's specific location (city, state).
    - Key services, treatments, and specialties offered (e.g., cosmetic dentistry, orthodontics, pediatric care, Invisalign, implants).
    - The overall tone and brand voice of the practice (e.g., family-friendly, high-tech, luxurious).
    - Any unique selling propositions (e.g., "meet the team" pages, specific technology used, patient testimonials).
    `}

    Based on your research, create a content plan with 2 unique posts per week for 12 weeks.

    ${pastPostsContent ? `
    **Avoid Duplication:**
    The user has provided a document of their previous posts. Carefully review this content. DO NOT generate posts that are identical or highly similar to the provided past posts. Use them as inspiration for what has been done, but ensure your output is fresh and original.
    ` : ''}

    **Holiday Content:**
    Using the start date provided by the user, determine if any of the 12 weeks fall on or near a major US holiday (e.g., New Year's Day, Valentine's Day, Fourth of July, Halloween, Thanksgiving, Christmas). If a week includes a holiday, one or both posts for that week should be themed around that holiday, relating it back to dental health or the practice.

    **Regular Content:**
    For all other weeks, ensure the content is varied and tailored to the information you discovered, covering topics like:
    - Dental tips and oral hygiene education.
    - Posts highlighting specific services you found on their website.
    - "Meet the team" or "behind-the-scenes" posts inspired by their site.
    - Promotions or special offers.
    - Posts that highlight the practice's connection to its local community.
    - Patient testimonials (you can create plausible hypothetical ones if none are on the site).
    - Fun facts about dentistry.

    For each post, provide a 'title' (a short headline) and a 'caption' (the full post text). The caption should match the practice's tone, be professional, and include relevant hashtags (all in lowercase) and a call-to-action (e.g., "Call us at [Phone Number from Website] to book an appointment!", "Visit our website to learn more.").
  `;

  const userPrompt = `
    Generate the 12-week content plan for the following practice:
    - Practice Name: "${practiceName}"
    - Practice Website: "${practiceUrl}"
    - Content Plan Start Date: ${startDate}
    - Posting Schedule: The two posts for each week should be scheduled for ${scheduleText}.
    ${onboardingContent ? `
---
REFERENCE: CLIENT ONBOARDING DOCUMENT (PRIMARY SOURCE)
---
${onboardingContent}
    ` : ''}
    ${pastPostsContent ? `
---
REFERENCE: PREVIOUS USER POSTS (AVOID DUPLICATING THESE)
---
${pastPostsContent}
    ` : ''}
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      weeks: {
        type: Type.ARRAY,
        description: "An array of 12 weekly content plans.",
        items: {
          type: Type.OBJECT,
          properties: {
            week: {
              type: Type.INTEGER,
              description: "The week number (1-12)."
            },
            posts: {
              type: Type.ARRAY,
              description: "An array containing the two posts for the week.",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: "A short, engaging headline for the social media post."
                  },
                  caption: {
                    type: Type.STRING,
                    description: "The full text content for the social media post, including hashtags and a call-to-action."
                  }
                },
                required: ["title", "caption"]
              }
            }
          },
          required: ["week", "posts"]
        }
      }
    },
    required: ["weeks"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.7,
        tools: [{ googleSearch: {} }],
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Received an empty response from the AI.");
    }
    
    const parsedData = JSON.parse(jsonText);
    
    if (parsedData && parsedData.weeks) {
      // Post-process to ensure all hashtags are lowercase for consistency.
      const processedWeeks = parsedData.weeks.map((week: WeekPlan) => ({
        ...week,
        posts: week.posts.map(post => ({
          ...post,
          caption: post.caption.replace(/#(\w+)/g, (_match, tag) => `#${tag.toLowerCase()}`)
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


export const generateSinglePost = async (
  practiceName: string,
  practiceUrl: string,
  currentPlan: WeekPlan[],
  postToReplace: { weekIndex: number; postIndex: number },
  postDate: string,
  instructions: string,
  onboardingContent?: string,
  pastPostsContent?: string
): Promise<Post> => {
  // Create a list of all other post titles and captions to avoid duplication.
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

  const systemInstruction = `
    You are a social media marketing expert for dental practices. Your task is to generate a SINGLE, new, unique social media post.

    You will be given the practice name, website, and potentially an onboarding document and a list of past posts. Use these to understand the practice's brand, services, and tone.
    ${onboardingContent ? `
    The provided onboarding document is your PRIMARY source of truth.
    ` : `
    Thoroughly research the dental practice website for inspiration.
    `}

    **Date-Specific Content:**
    The post you are generating is for a specific date. You MUST check if this date is on or near a major US holiday (e.g., Halloween, Thanksgiving, Christmas, New Year's, Valentine's Day, etc.). If it is, the new post's theme MUST be appropriate for that holiday, relating it back to dental health.

    **Crucial Instruction: Avoid Duplication**
    A list of already generated posts for the content plan is provided below. You MUST NOT create a post that is highly similar in topic or content to any of the posts in that list. Also, avoid topics from the user's provided past posts, if any. Your goal is to provide a fresh, alternative idea.

    **User Instructions:**
    If the user provides special instructions, you must follow them to tailor the post's content, tone, or focus.

    Generate a post covering topics like dental tips, specific services, team highlights, community engagement, or holiday themes if relevant.

    Provide a 'title' (a short headline) and a 'caption' (the full post text with lowercase hashtags and a call-to-action).
  `;

  const userPrompt = `
    Generate a single, new social media post for:
    - Practice Name: "${practiceName}"
    - Practice Website: "${practiceUrl}"
    - Post Date: ${postDate}

    ${instructions ? `
    ---
    SPECIAL INSTRUCTIONS FROM USER:
    ---
    ${instructions}
    ` : ''}

    ---
    EXISTING POSTS IN THE CURRENT PLAN (DO NOT REPEAT THESE TOPICS):
    ---
    ${existingPostsText}

    ${onboardingContent ? `
    ---
    REFERENCE: CLIENT ONBOARDING DOCUMENT (PRIMARY SOURCE)
    ---
    ${onboardingContent}
    ` : ''}
    ${pastPostsContent ? `
    ---
    REFERENCE: PREVIOUS USER POSTS (AVOID DUPLICATING THESE)
    ---
    ${pastPostsContent}
    ` : ''}
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "A short, engaging headline for the social media post."
      },
      caption: {
        type: Type.STRING,
        description: "The full text content for the social media post, including hashtags and a call-to-action."
      }
    },
    required: ["title", "caption"]
  };
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.8,
        tools: [{ googleSearch: {} }],
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Received an empty response from the AI when regenerating post.");
    }
    
    const parsedData = JSON.parse(jsonText);
    
    if (parsedData && parsedData.title && parsedData.caption) {
      // Post-process the single post to ensure hashtags are lowercase.
      parsedData.caption = parsedData.caption.replace(/#(\w+)/g, (_match, tag) => `#${tag.toLowerCase()}`);
      return parsedData as Post;
    } else {
       throw new Error("Invalid data structure received from AI for single post.");
    }

  } catch (error) {
    console.error("Gemini API call failed during single post regeneration:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    throw new Error(`Failed to regenerate post. Details: ${errorMessage}`);
  }
};