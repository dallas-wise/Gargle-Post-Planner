import { GoogleGenAI } from '@google/genai';
import type { WeekPlan, Post } from '../types';

// Use Gemini Search API to research the dental practice
const researchPracticeWithSearch = async (practiceUrl: string, practiceName: string, ai: GoogleGenAI): Promise<string> => {
  try {
    // Configure the grounding tool for Google Search
    const groundingTool = {
      googleSearch: {}
    };

    const researchQuery = `${practiceName} dental practice ${practiceUrl} services team location contact information specialties technology awards community involvement`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Research this dental practice comprehensively and provide detailed information: ${researchQuery}. 

      Please analyze and provide information about:
      1. Practice name and location (city, state, address)
      2. All dental services offered (be comprehensive, not just basic cleanings)
      3. Team members and their specializations
      4. Practice philosophy and brand voice
      5. Technology and equipment used
      6. Any awards, certifications, or recognition
      7. Community involvement or local partnerships
      8. Contact information (phone, email)
      9. Unique selling points that differentiate this practice
      10. Target patient demographics
      11. Any special programs or offers

      Format the response as detailed, well-organized information that can be used to create authentic social media content.`,
      config: {
        tools: [groundingTool],
        temperature: 0.3,
      },
    });

    return response.text || 'No research results available';
  } catch (error) {
    console.warn('Failed to research practice with Gemini Search:', error);
    return `Research unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

// Read at build-time via Vite:
const API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY as string;

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
  onboardingContent?: string,
  specialInstructions?: string,
  practicePhone?: string,
  practiceLocation?: string
): Promise<WeekPlan[]> => {
  // Research the practice using Gemini Search API
  const practiceResearch = await researchPracticeWithSearch(practiceUrl, practiceName, ai);
  const scheduleText = postSchedule === 'MW' ? 'Mondays and Wednesdays' : 'Tuesdays and Thursdays';

  const systemInstruction = `
    Act as a social media marketing expert specializing in content for dental practices. Your task is to generate a 12-week social media content calendar.

    You will be given the practice name, website, content start date, posting schedule, comprehensive research about the practice, and potentially an onboarding document and a list of past posts.

    ${specialInstructions ? `
    !!!! CRITICAL SPECIAL INSTRUCTIONS - MUST FOLLOW FOR ALL POSTS !!!!
    ${specialInstructions}
    
    REMINDER: These special instructions above are MANDATORY and must be applied to EVERY single post you create. Do not ignore these instructions.
    !!!! END CRITICAL INSTRUCTIONS !!!!
    ` : ''}

    ${(practicePhone || practiceLocation) ? `
    **VERIFIED PRACTICE CONTACT INFORMATION:**
    ${practicePhone ? `Phone: ${practicePhone}` : ''}
    ${practiceLocation ? `Location: ${practiceLocation}` : ''}
    
    IMPORTANT: Use ONLY the contact information provided above in any posts that include contact details. Do not use or reference any other phone numbers or locations you may find in the research data.
    ` : ''}

    **Research-Based Content Creation:**
    ${onboardingContent ? `
    An onboarding document has been provided as your PRIMARY source of truth. Use the research data as supplementary information to enhance and validate the onboarding content.
    ` : `
    Use the comprehensive research data provided about this dental practice to create authentic, personalized content that reflects their actual services, team, location, and brand personality.
    `}

    **Practice Research Data:**
    ${practiceResearch}

    Based on this research, create a content plan with 2 unique posts per week for 12 weeks that authentically represents this specific practice.

    ${pastPostsContent ? `
    **Avoid Duplication:**
    The user has provided their previous posts. DO NOT generate content that duplicates or closely resembles these past posts. Create fresh, original content.
    ` : ''}

    **Holiday Content:**
    Using the start date provided, determine if any of the 12 weeks include major US holidays. Create holiday-themed posts that connect the celebration to dental health or the practice.

    **Content Strategy:**
    Create varied content that showcases the practice's unique qualities:
    - Educational dental tips relevant to their specialties
    - Service highlights based on their actual offerings
    - Community engagement reflecting their local involvement
    - Technology showcases if they use advanced equipment
    - Patient testimonials (create realistic ones based on their practice style)
    - Seasonal dental health tips
    - Practice milestones or achievements
    - Behind-the-scenes content matching their brand voice

    ${specialInstructions ? `
    REMINDER: Every post must incorporate the special instructions provided at the beginning of this prompt: "${specialInstructions}"
    ` : ''}

    Each post should include a compelling title and caption with appropriate hashtags (lowercase) and calls-to-action${(practicePhone || practiceLocation) ? ' using the verified contact information provided above' : ' that reflect the practice\'s actual contact information and location'}.

    IMPORTANT: Respond ONLY with valid JSON in this exact format:
    {
      "weeks": [
        {
          "week": 1,
          "posts": [
            {"title": "Post title", "caption": "Post caption with #hashtags"},
            {"title": "Post title", "caption": "Post caption with #hashtags"}
          ]
        }
      ]
    }
  `;

  const userPrompt = `
    Generate the 12-week content plan for the following practice:
    - Practice Name: "${practiceName}"
    - Practice Website: "${practiceUrl}"
    - Content Plan Start Date: ${startDate}
    - Posting Schedule: The two posts for each week should be scheduled for ${scheduleText}.
    
    Use the research data provided in the system instruction to create authentic, personalized content.
    
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


  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Received an empty response from the AI.");
    }
    
    // Clean the response by removing markdown code blocks if present
    const cleanedJson = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
    const parsedData = JSON.parse(cleanedJson);
    
    if (parsedData && parsedData.weeks) {
      // Post-process to ensure all hashtags are lowercase for consistency.
      const processedWeeks = parsedData.weeks.map((week: WeekPlan) => ({
        ...week,
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
  // Research the practice using Gemini Search API
  const practiceResearch = await researchPracticeWithSearch(practiceUrl, practiceName, ai);
  
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

  const systemInstruction = `
    You are a social media marketing expert for dental practices. Your task is to generate a SINGLE, new, unique social media post.

    You will be given comprehensive research about the practice, and potentially an onboarding document and a list of past posts. Use this information to create authentic content that reflects the practice's actual characteristics.

    **Practice Research Data:**
    ${practiceResearch}

    **Research-Based Content Creation:**
    ${onboardingContent ? `
    The provided onboarding document is your PRIMARY source of truth. Use the research data to enhance and validate this information.
    ` : `
    Use the comprehensive research data to create content that authentically represents this specific dental practice.
    `}

    **Date-Specific Content:**
    The post is for ${postDate}. Check if this date is on or near a major US holiday and create holiday-themed content if appropriate, connecting it to dental health.

    **Avoid Duplication:**
    You MUST NOT create content similar to the existing posts in the current plan or the user's past posts. Create fresh, original content.

    **User Instructions:**
    ${instructions ? `Follow these specific instructions: ${instructions}` : 'No special instructions provided.'}

    Create a post that showcases the practice's unique qualities based on the research, such as:
    - Educational content relevant to their specialties
    - Service highlights using their actual offerings
    - Community engagement reflecting their local involvement
    - Technology showcases if applicable
    - Patient testimonials matching their practice style

    Include a compelling title and caption with appropriate hashtags (lowercase) and calls-to-action using their actual contact information.

    IMPORTANT: Respond ONLY with valid JSON in this exact format:
    {
      "title": "Post title",
      "caption": "Post caption with #hashtags"
    }
  `;

  const userPrompt = `
    Generate a single, new social media post for:
    - Practice Name: "${practiceName}"
    - Practice Website: "${practiceUrl}"
    - Post Date: ${postDate}

    Use the research data provided in the system instruction to create authentic, personalized content.

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

  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
      },
    });

    const jsonText = response.text;
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
    console.error("Gemini API call failed during single post regeneration:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    throw new Error(`Failed to regenerate post. Details: ${errorMessage}`);
  }
};