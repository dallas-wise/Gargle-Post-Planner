import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import type { WeekPlan, Post } from '../types';
import { calculatePostDate } from '../utils/dateUtils';
import { getHolidaysInRange, formatHolidayDate } from '../utils/holidayUtils';

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

const sanitizeJsonStringLiterals = (input: string) =>
  input.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match) => {
    const inner = match.slice(1, -1);
    const sanitizedInner = inner.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
    return `"${sanitizedInner}"`;
  });

const parseJsonSafely = <T>(rawJson: string): T => {
  try {
    return JSON.parse(rawJson) as T;
  } catch (initialError) {
    try {
      const sanitized = sanitizeJsonStringLiterals(rawJson);
      return JSON.parse(sanitized) as T;
    } catch (sanitizedError) {
      throw initialError instanceof Error ? initialError : sanitizedError;
    }
  }
};

const tryExtractSinglePost = (data: unknown): Post | null => {
  if (!data) {
    return null;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const extracted = tryExtractSinglePost(item);
      if (extracted) {
        return extracted;
      }
    }
    return null;
  }

  if (typeof data !== 'object') {
    return null;
  }

  const candidate = data as Record<string, any>;

  if (candidate.title && candidate.caption) {
    return {
      title: candidate.title,
      caption: candidate.caption,
      ...(candidate.photoIdeas && { photoIdeas: candidate.photoIdeas })
    };
  }

  if (candidate.post && candidate.post.title && candidate.post.caption) {
    return {
      title: candidate.post.title,
      caption: candidate.post.caption,
      ...(candidate.post.photoIdeas && { photoIdeas: candidate.post.photoIdeas })
    };
  }

  if (Array.isArray(candidate.posts) && candidate.posts.length > 0) {
    const first = candidate.posts[0];
    if (first?.title && first?.caption) {
      return {
        title: first.title,
        caption: first.caption,
        ...(first.photoIdeas && { photoIdeas: first.photoIdeas })
      };
    }
  }

  if (Array.isArray(candidate.weeks)) {
    for (const week of candidate.weeks) {
      if (week?.posts && Array.isArray(week.posts) && week.posts.length > 0) {
        const first = week.posts[0];
        if (first?.title && first?.caption) {
          return {
            title: first.title,
            caption: first.caption,
            ...(first.photoIdeas && { photoIdeas: first.photoIdeas })
          };
        }
      }
    }
  }

  return null;
};

const CORE_PROMPT = `# Identity
You are a social media expert, specializing in dental marketing. You are energetic and fun. These are the things that you find most important:
Promoting the dental office: your number one job is to help users learn more about the dental office and set appointments for their next dental visit.
Create meaningful, engaging content: you do not create AI slop, you write genuinely like a human. This does not mean that you inject emotions unnecessarily, but you demonstrate value through warmth and friendliness. See examples below of social media posts you can replicate in style and format.
Drive growth: you want to get more people to follow your page to help support the dental office. You make content that is genuinely engaging to do this. You aren’t aggressive, you simply work hard to make great content
# Audience
Your audience includes young adults and parents on social media platforms like Facebook and Instagram. They often aren’t looking for dental content while on social media, so your job is to create compelling content that draws their attention in a fun and entertaining way.
# Tone and Voice
You write on behalf of dentists. You’re never overly personal. You never drift into sentimentality or overly personal writing to describe services or transformations.
When you’re unsure about voice and tone, analyze the examples provided to pull the information you need. Analyze them for sentence construction, tone, voice, rhythm, positioning, and your language bank.
Avoid antithesis and comparative juxtaposition, especially with em dashes. Instead, use direct statements and comparisons: “Not only are you getting great care, you are getting peace of mind as well.” “We want to help you look great and feel confident.”
Avoid marketing clichés and overused phrases like 'committed to excellence,' 'state-of-the-art,' or 'incredible precision'
Don't use predictable AI transitions like 'We get it' or 'You might wonder'
Only use 1-2 exclamation points, and don’t have them be in a row.
Write like you're actually speaking to someone, with natural pauses and emphasis
Mix up the heading formats
You vary the language you select in every post, not always choosing the most statistically likely option every time, because you know you’re writing content for 50+ dental social media accounts per month, and each article needs to be different.
# Guidelines for Content
Generate a headline, caption, and photo ideas for each post.
Each headline must be 3-6 words long and cover a dental or dental office topic.
Each caption should be 1–2 paragraphs long.
For photo ideas, suggest 1-2 specific types of photos or content the client should provide to accompany the post (e.g., "Photo of the team in Halloween costumes", "Before/after smile transformation", "Office exterior shot").
Highlight what makes the dental office unique (family-friendly, modern technology, gentle care) - but ONLY occasionally, not in every post.

For calls to action, VARY the approach based on post type. Never suggest DMing to book. Use the ACTUAL contact information provided in the data:
- When you see "Practice phone number:" in the data, use that exact phone number in CTAs
- When you see "Practice website url:" in the data, use that exact website URL in CTAs
- NEVER use placeholder text like [phone] or [website] - always use the real contact information

Mix these CTA approaches:
- Direct scheduling CTAs (use in 30-40% of posts): Include the actual phone number and/or website URL. Examples: "Call us at (555) 123-4567 or visit www.example.com to schedule", "Ready to book? Give us a call or visit our website"
- Soft engagement CTAs (use in 30-40% of posts): "What are your dental health goals this year?", "Tag someone who needs to hear this!", "Drop a 🦷 if you learned something new!"
- Information CTAs (use in 20-30% of posts): Use the actual website URL when provided. Examples: "Visit www.example.com to learn more", "Questions? Give us a call"
- Some posts (especially fun facts, jokes, or holiday wishes) can end naturally without a pushy CTA - just hashtags

IMPORTANT:
1. Always replace placeholders with actual contact info from the provided data
2. Avoid repetitive scheduling language like "schedule your appointment" or "book your cleaning" in every post. It feels robotic and pushy.
Finish with 3-5 hashtags that blend local geography, dental work, and the subject of the post.
## Holiday Requirements
When there is a holiday, you must place the holiday post on the scheduled date that is closest to the actual holiday. If one of the scheduled dates is the holiday itself, use that exact date. Otherwise, use the closest scheduled date that occurs before the holiday. Always evaluate both scheduled dates each week to confirm which option is closest.
# Examples
Halloween Tips and Tricks (or Treats!)
When it comes to candy, dental care is probably the last thing that comes to mind (unless you had those **neighbors that hand out toothbrushes–we love dental care but come on 🙄) However, the only thing scarier than ghosts are cavities, so be sure to brush and floss after a candy run. And if you have braces, PLEASE stay away from the caramels and hard candies!
If it's been a bit since your last visit, don't get spooked 👻 set up an appointment with Dr. Green today!
#spookyseason #spanishforkdentist #dentaltips
Happy Birthday Dr. Green!!
Everybody show some love for Dr. Green! He has been serving the Spanish Fork area since 2006, and his biggest birthday wish is for everyone to floss more often than just the night before a dental appointment 🦷🥳🪥🎈🎊 Happy birthday Dr. Green!
#happybirthdaydrgreen #spanishforkdentist #flossingiscool`;

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
  const dates: { week: number; dates: { display: string; iso: string }[] }[] = [];
  const targetDays = postSchedule === 'MW' ? [1, 3] : [2, 4]; // Monday=1, Tuesday=2, Wednesday=3, Thursday=4

  const formatIso = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  for (let week = 0; week < numWeeks; week++) {
    const weekDates = targetDays.map((_, postIndex) => {
      const date = calculatePostDate(startDate, week, postIndex, postSchedule);
      return {
        display: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        iso: formatIso(date),
        timestamp: date.getTime()
      };
    }).sort((a, b) => a.timestamp - b.timestamp)
      .map(({ display, iso }) => ({ display, iso }));

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

  const rawPostingSlots = postingDates.flatMap(({ week, dates }) =>
    dates.map((date, index) => ({
      week,
      display: date.display,
      iso: date.iso,
      postIndex: index,
      dateObj: new Date(`${date.iso}T00:00:00`)
    }))
  );

  const allPostingSlots = rawPostingSlots
    .slice()
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
    .map((slot, index) => ({
      ...slot,
      sequence: index + 1
    }));

  const planStart = allPostingSlots[0]?.dateObj ?? new Date(`${startDate}T00:00:00`);
  const planEnd = allPostingSlots[allPostingSlots.length - 1]?.dateObj ?? planStart;
  const holidaysInRange = getHolidaysInRange(planStart, planEnd);

  const holidayAlignment = holidaysInRange
    .map(holiday => {
      const candidatesBefore = allPostingSlots.filter(slot => slot.dateObj.getTime() <= holiday.date.getTime());
      let chosen = candidatesBefore.length
        ? candidatesBefore.reduce((best, current) => {
            const bestDiff = holiday.date.getTime() - best.dateObj.getTime();
            const currentDiff = holiday.date.getTime() - current.dateObj.getTime();
            return currentDiff < bestDiff ? current : best;
          })
        : null;

      let relation: 'exact' | 'before' | 'after';

      if (chosen) {
        relation = chosen.dateObj.getTime() === holiday.date.getTime() ? 'exact' : 'before';
      } else {
        const candidatesAfter = allPostingSlots.filter(slot => slot.dateObj.getTime() > holiday.date.getTime());
        if (!candidatesAfter.length) {
          return null;
        }
        chosen = candidatesAfter.reduce((best, current) => {
          const bestDiff = Math.abs(holiday.date.getTime() - best.dateObj.getTime());
          const currentDiff = Math.abs(holiday.date.getTime() - current.dateObj.getTime());
          return currentDiff < bestDiff ? current : best;
        });
        relation = 'after';
      }

      const dayMs = 24 * 60 * 60 * 1000;
      const diffDays = Math.round((holiday.date.getTime() - chosen.dateObj.getTime()) / dayMs);
      const absDiffDays = Math.abs(diffDays);
      const diffDescription =
        relation === 'exact'
          ? 'on the holiday'
          : relation === 'before'
            ? `${absDiffDays} day${absDiffDays === 1 ? '' : 's'} before`
            : `${absDiffDays} day${absDiffDays === 1 ? '' : 's'} after (no earlier post date is available in this plan)`;

      return {
        holiday,
        slot: chosen,
        relation,
        diffDescription,
      };
    })
    .filter(Boolean) as {
      holiday: { name: string; date: Date };
      slot: typeof allPostingSlots[number];
      relation: 'exact' | 'before' | 'after';
      diffDescription: string;
    }[];

  // Parse and align team milestones (birthdays/work anniversaries)
  const milestoneAlignment: Array<{
    name: string;
    date: Date;
    slot: typeof allPostingSlots[number];
    relation: 'exact' | 'before' | 'after';
    diffDescription: string;
  }> = [];

  if (milestones?.trim()) {
    const milestoneLines = milestones.trim().split('\n');

    milestoneLines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Try to parse dates in various formats
      // Supports: "Name - Month Day", "Name - Month Day, Year", "Name: Month Day", etc.
      const datePatterns = [
        /(.+?)\s*[-:]\s*([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?/i,  // "Dr. Smith Birthday - March 15" or "Dr. Smith - March 15, 2024"
      ];

      for (const pattern of datePatterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          const [, name, monthStr, dayStr, yearStr] = match;
          const month = monthStr.trim();
          const day = parseInt(dayStr, 10);
          const year = yearStr ? parseInt(yearStr, 10) : new Date(startDate).getFullYear();

          // Parse the date
          const milestoneDate = new Date(`${month} ${day}, ${year}`);

          // Check if date is valid
          if (!isNaN(milestoneDate.getTime())) {
            // Use same alignment logic as holidays - prefer the date before or on the milestone
            const candidatesBefore = allPostingSlots.filter(slot => slot.dateObj.getTime() <= milestoneDate.getTime());
            let chosen = candidatesBefore.length
              ? candidatesBefore.reduce((best, current) => {
                  const bestDiff = milestoneDate.getTime() - best.dateObj.getTime();
                  const currentDiff = milestoneDate.getTime() - current.dateObj.getTime();
                  return currentDiff < bestDiff ? current : best;
                })
              : null;

            let relation: 'exact' | 'before' | 'after';

            if (chosen) {
              relation = chosen.dateObj.getTime() === milestoneDate.getTime() ? 'exact' : 'before';
            } else {
              const candidatesAfter = allPostingSlots.filter(slot => slot.dateObj.getTime() > milestoneDate.getTime());
              if (!candidatesAfter.length) {
                return; // Skip if no suitable slot
              }
              chosen = candidatesAfter.reduce((best, current) => {
                const bestDiff = Math.abs(milestoneDate.getTime() - best.dateObj.getTime());
                const currentDiff = Math.abs(milestoneDate.getTime() - current.dateObj.getTime());
                return currentDiff < bestDiff ? current : best;
              });
              relation = 'after';
            }

            const dayMs = 24 * 60 * 60 * 1000;
            const diffDays = Math.round((milestoneDate.getTime() - chosen.dateObj.getTime()) / dayMs);
            const absDiffDays = Math.abs(diffDays);
            const diffDescription =
              relation === 'exact'
                ? 'on the exact date'
                : relation === 'before'
                  ? `${absDiffDays} day${absDiffDays === 1 ? '' : 's'} before`
                  : `${absDiffDays} day${absDiffDays === 1 ? '' : 's'} after (no earlier post date is available in this plan)`;

            milestoneAlignment.push({
              name: name.trim(),
              date: milestoneDate,
              slot: chosen,
              relation,
              diffDescription,
            });

            break;
          }
        }
      }
    });
  }

  // Format dates for the prompt
  const dateSchedule = relevantDates.map(({ week, dates }) =>
    `Week ${week}: ${dates.map(date => `${date.display} (${date.iso})`).join(' and ')}`
  ).join('\n');

  const relevantSlots = allPostingSlots.filter(slot => slot.week >= weekStart && slot.week <= weekEnd);
  const chronologicalDates = relevantSlots.map((slot, index) => {
    const dayName = slot.dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    return `${index + 1}. Week ${slot.week} - ${slot.display} (${slot.iso}) — ${dayName}`;
  });

  // ============================================================================
  // REFERENCE DATA
  // ============================================================================

  const normalizedSpecialInstructions = specialInstructions?.trim() || null;

  const referenceData = {
    onboardingDocument: onboardingContent || null,
    pastPosts: pastPostsContent || null,
    contactInfo: {
      phone: practicePhone || null,
      location: practiceLocation || null
    },
    teamMilestones: milestones || null,
    userInstructions: normalizedSpecialInstructions,
    practiceInfo: practiceResearch
  };

  // ============================================================================
  // NEW IMPROVED PROMPT - Focus on unique engaging content
  // ============================================================================

  const basePrompt = `${CORE_PROMPT}
# Instructions
Review the data that you have been given. This includes:
Dental office information (required)
Practice name
Practice website url
Practice phone number (optional)
Practice locations (if applicable)
Content plan start date (required)
Schedule (Monday/Wednesday, Tuesday/Thursday) (required)
PDF file uploads (optional)
Client Onboarding PDF
Avoid Duplicate PDF
Special instructions (optional)
Birthdays/work anniversaries
Special instructions

## Content Balance and Variety
CRITICAL: Practice-specific details must be used VERY SPARINGLY to avoid repetition:
- If special instructions mention unique features (e.g., "We have Netflix", "Spa-like atmosphere", "Same-day crowns"), use these phrases in ONLY 1-2 posts maximum across all 12 weeks
- NEVER repeat the exact same practice-specific phrase or unique detail in multiple posts
- Think of special instructions as background context, NOT a checklist to mention in every post
- Most posts (18-20 out of 24) should be general dental content that could work for any practice
- Only 4-6 posts should prominently feature practice-specific differentiators
- Vary HOW you mention practice details - don't use the same phrasing patterns
- The goal: readers should find the content fresh and varied, not repetitive marketing

## Content Categories - Mix These Throughout the 12 Weeks
IMPORTANT: Draw content from MULTIPLE sources, not just the practice website. Create a diverse mix that feels fresh and varied.

**Educational Tips** (2-3 posts): Diverse dental health advice - AVOID repetitive "brush and floss" messaging
- Dental health myths debunked
- How different foods/drinks affect teeth (coffee stains, acidic foods, teeth-strengthening foods)
- Oral health connections to overall health (heart disease, diabetes, pregnancy)
- Age-specific dental care (baby teeth care, wisdom teeth, senior oral health)
- Managing dental anxiety or pain
- DO NOT: Repeatedly tell people to "brush, floss, and schedule an appointment" - vary your educational topics!

**Fun & Engaging** (3-4 posts): Light-hearted content from general dental knowledge, NOT the website
- Dental jokes and puns
- Weird dental facts and trivia ("Did you know snails have thousands of teeth?")
- Historical dental facts (George Washington's teeth, ancient dental practices)
- Pop culture references related to teeth/smiles
- Interactive posts (polls, questions: "Coffee or tea?", "Do you floss daily?")

**Seasonal & Timely** (3-4 posts): Time-sensitive content relevant to the season or time of year
- End-of-year insurance benefits reminders (November-December)
- Back-to-school dental checkups (August-September)
- Spring cleaning for your smile (March-April)
- Summer vacation dental prep
- New Year's resolution content (January)
- Holiday season posts (not just on the holiday - throughout the season)
- National awareness days (National Tooth Fairy Day, etc.)

**Practice Highlights** (2-3 posts): Showcase practice uniqueness - USE WEBSITE RESEARCH SPARINGLY
- Technology or equipment (mention ONCE if it's unique)
- Team spotlights or milestones
- Community involvement
- Patient testimonial themes (general, not specific details)

**Promotional/Engagement** (2-3 posts): Community-building, NOT hard-sell
- Refer-a-friend campaigns (with why referrals matter)
- Patient appreciation posts
- Social media engagement ("Follow us for more tips!")
- Share your smile story campaigns

**Service-Focused** (1-2 posts): Specific treatments - ONLY when truly relevant
- Only highlight services that are unique or seasonal (teeth whitening before holidays, Invisalign for New Year goals)
- Keep it informational, not salesy

BALANCE RULE: 75% of posts should be general content (educational, fun, seasonal) that any dental practice could post. Only 25% should be practice-specific or website-based.

## Seasonal Content Planning
Look at the actual dates in your posting schedule to identify seasonal opportunities:
- If posts fall in November-December: Include end-of-year insurance benefit reminders, holiday season content (not just holiday day posts)
- If posts fall in August-September: Back-to-school dental checkup reminders
- If posts fall in January: New Year's resolution content, fresh start themes
- If posts fall in March-May: Spring cleaning themes, outdoor activity dental tips
- If posts fall in June-August: Summer vacation dental prep
- Create "lead-up" posts for major holidays: Thanksgiving prep, Christmas season (not just Christmas day), etc.

## Critical: Never Make Assumptions
DO NOT mention or assume ANY of the following unless EXPLICITLY provided in the reference materials (onboarding PDF, special instructions, or website research):
- Office closures or holiday hours (e.g., "We're closed for Christmas", "Closed for Veterans Day")
- Special discounts, promotions, or deals (e.g., "Veterans discount", "Holiday special pricing")
- Specific services not confirmed in the research data
- Patient financing options or insurance policies
- Emergency availability or after-hours services

If you want to create holiday content, focus on general well-wishes, dental tips related to the holiday, or fun facts - NOT practice operations or promotions.

Look ahead at the next twelve weeks, and write out the dates that each post will be on. Based on that, if there are any holidays that happen within the twelve weeks, the post that happens right before the holiday must be holiday themed. Ensure that you get as close to the actual date as possible with your post.
If you are given "Holiday alignment requirements", use the exact post assignments specified there without moving the holiday theme to any other date.
If you are given "Team milestone alignment requirements" (birthdays, work anniversaries), create celebration posts for those team members on the EXACT post dates specified. Do not move these milestone posts to any other date. These are time-sensitive celebrations that must align with the actual milestone dates as closely as possible.
If there are PDFs provided, read through the content. The Client Onboarding PDF will inform you of additional dental office information, which can give you more information to work with. The Avoid Duplicate PDF is a collection of posts that have been made by that dental office up to this point. Do not duplicate any of this content in your twelve week plan. If there is no PDF, move on to the next step.
Collect information from the dental office's website, including services, offers, and people.
Create an outline of the posts that you are going to make. List out each week and the topics that you will be covering.
Create each week's content, following the examples, information, and formatting provided above.
Ensure that each post fulfills length, holiday, and instruction requirements by checking each one.`;

  const dataSections: string[] = [];
  dataSections.push(`Practice name: ${practiceName}`);
  dataSections.push(`Practice website url: ${practiceUrl}`);
  if (practicePhone) {
    dataSections.push(`Practice phone number: ${practicePhone}`);
  }
  if (practiceLocation) {
    dataSections.push(`Practice locations: ${practiceLocation}`);
  }
  dataSections.push(`Content plan start date: ${startDate}`);
  dataSections.push(`Schedule: ${scheduleText}`);
  dataSections.push(`Weeks covered in this batch: ${weekStart}-${weekEnd}`);
  dataSections.push(`Total posts required: ${totalPosts}`);
  dataSections.push(`Exact posting dates by week:\n${dateSchedule}`);
  if (chronologicalDates.length) {
    dataSections.push(`Chronological posting dates (use these exact dates in order):\n${chronologicalDates.join('\n')}`);
  }
  dataSections.push('Scheduling instructions: Use the exact posting dates above when planning post themes and align holiday content with the closest applicable date.');

  if (referenceData.userInstructions) {
    dataSections.push(`Special instructions: ${referenceData.userInstructions}`);
  }
  if (referenceData.onboardingDocument) {
    dataSections.push(`Client Onboarding PDF content:\n${referenceData.onboardingDocument}`);
  }
  if (referenceData.pastPosts) {
    dataSections.push(`Avoid Duplicate PDF content (do not reuse):\n${referenceData.pastPosts}`);
  }
  dataSections.push(`Website research summary:\n${referenceData.practiceInfo}`);
  if (holidayAlignment.length) {
    const holidayLines = holidayAlignment.map(({ holiday, slot, diffDescription }) => {
      const dayName = slot.dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      return `${holiday.name} (${formatHolidayDate(holiday.date)}): Use the post scheduled for ${dayName}, ${slot.display} (${slot.iso}) [Post ${slot.sequence}, Week ${slot.week}, Post ${slot.postIndex + 1}] — ${diffDescription}. Do not move this holiday to any other date.`;
    });
    dataSections.push(`Holiday alignment requirements (must follow exactly):\n${holidayLines.join('\n')}`);
  }
  if (milestoneAlignment.length) {
    const milestoneLines = milestoneAlignment.map(({ name, date, slot, diffDescription }) => {
      const dayName = slot.dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = formatHolidayDate(date);
      return `${name} (${dateStr}): Use the post scheduled for ${dayName}, ${slot.display} (${slot.iso}) [Post ${slot.sequence}, Week ${slot.week}, Post ${slot.postIndex + 1}] — ${diffDescription}. Create a celebration post for this milestone on this exact date assignment.`;
    });
    dataSections.push(`Team milestone alignment requirements (must follow exactly):\n${milestoneLines.join('\n')}`);
  }

  const systemInstruction = `${basePrompt}

## Provided Data
${dataSections.join('\n\n')}`;

  const userPrompt = `Generate a ${numWeeks}-week content calendar for ${practiceName}.

Start Date: ${startDate}
Posting Days: ${scheduleText}
Weeks: ${weekStart} through ${weekEnd}

Focus on unique, engaging content that connects with real people. Make it diverse and interesting!${normalizedSpecialInstructions ? `

Special instructions to follow exactly:
${normalizedSpecialInstructions}` : ''}

Return ONLY valid JSON:
{
  "weeks": [
    {
      "week": 1,
      "posts": [
        {"title": "Post Title", "caption": "Caption with #hashtags", "photoIdeas": "Specific photo suggestions for this post"},
        {"title": "Post Title", "caption": "Caption with #hashtags", "photoIdeas": "Specific photo suggestions for this post"}
      ]
    }
  ]
}`;


  try {
    let jsonText: string;

    if (aiProvider === 'openai') {
      // Use OpenAI GPT-4o (gpt-5 may not be available yet)
      console.log('Generating with OpenAI GPT-4o...');
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      jsonText = response.choices[0]?.message?.content || '';
      console.log('OpenAI response received');
    } else {
      // Use Gemini
      const response = await geminiAI.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      });

      jsonText = response.text || '';
    }

    if (!jsonText) {
      throw new Error("Received an empty response from the AI.");
    }

    // Clean the response by removing markdown code blocks if present
    const cleanedJson = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
    const parsedData = parseJsonSafely<{ weeks: WeekPlan[] }>(cleanedJson);

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
  specialInstructions?: string,
  practicePhone?: string,
  practiceLocation?: string,
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

  const normalizedGlobalInstructions = specialInstructions?.trim() || null;
  const trimmedPostInstructions = instructions.trim();
  const hasPostInstructions = trimmedPostInstructions.length > 0;

  // ============================================================================
  // NEW IMPROVED SINGLE POST PROMPT
  // ============================================================================

  const singlePostBasePrompt = `${CORE_PROMPT}
# Instructions
Use the information below to create exactly one social media post for the specified dental practice and scheduled date. Follow all tone, voice, and content guidelines above. Write a 1–2 paragraph caption (bullet points are allowed when helpful). Highlight what makes the practice unique occasionally, but not in every post.

For the call to action, vary your approach and USE THE ACTUAL CONTACT INFORMATION provided in the data:
- NEVER use placeholder text like [phone] or [website]
- When you see "Practice phone number:" use that exact phone number
- When you see "Practice website url:" use that exact website URL
- Mix approaches: direct scheduling CTAs with actual contact info, soft engagement CTAs ("Tag someone who needs this!"), or informational CTAs with the actual website
- Some posts can end naturally without a pushy CTA
- Never suggest DMing to book
- Avoid repetitive "schedule your appointment" language

Finish with 3-5 hashtags that blend local geography, dental work, and the subject of the post. If the provided date is the closest posting day before a holiday, make the post relevant to that holiday. Avoid duplicating any existing posts listed in the provided data.`;

  const singlePostDataSections: string[] = [];
  singlePostDataSections.push(`Practice name: ${practiceName}`);
  singlePostDataSections.push(`Practice website url: ${practiceUrl}`);
  if (practicePhone) {
    singlePostDataSections.push(`Practice phone number: ${practicePhone}`);
  }
  if (practiceLocation) {
    singlePostDataSections.push(`Practice locations: ${practiceLocation}`);
  }
  singlePostDataSections.push(`Post date: ${postDate}`);

  if (normalizedGlobalInstructions) {
    singlePostDataSections.push(`Special instructions (global): ${normalizedGlobalInstructions}`);
  }

  if (hasPostInstructions) {
    singlePostDataSections.push(`Regeneration request: ${trimmedPostInstructions}`);
  }

  if (onboardingContent) {
    singlePostDataSections.push(`Client Onboarding PDF content:\n${onboardingContent}`);
  }

  if (pastPostsContent) {
    singlePostDataSections.push(`Avoid Duplicate PDF content (do not reuse):\n${pastPostsContent}`);
  }

  singlePostDataSections.push(existingPostsText
    ? `Existing plan posts (avoid duplicates):\n${existingPostsText}`
    : 'Existing plan posts (avoid duplicates): None provided');

  singlePostDataSections.push(`Practice research summary:\n${practiceResearch}`);

  const systemInstruction = `${singlePostBasePrompt}

## Provided Data
${singlePostDataSections.join('\n\n')}

Return ONLY valid JSON:
{"title": "Post Title", "caption": "Caption with #hashtags", "photoIdeas": "Specific photo suggestions for this post"}`;

  const additionalGuidance = [
    normalizedGlobalInstructions ? `Follow these ongoing special instructions: ${normalizedGlobalInstructions}` : null,
    hasPostInstructions ? `Post-specific notes: ${trimmedPostInstructions}` : null,
  ].filter(Boolean).join('\n');

  const userPrompt = `Generate ONE unique post for ${practiceName} on ${postDate}.

Make it engaging and different from existing posts!${additionalGuidance ? `

Additional guidance:
${additionalGuidance}` : ''}`;


  try {
    let jsonText: string;

    if (aiProvider === 'openai') {
      // Use OpenAI GPT-4o
      console.log('Regenerating post with OpenAI GPT-4o...');
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      });

      jsonText = response.choices[0]?.message?.content || '';
      console.log('OpenAI response received');
    } else {
      // Use Gemini
      const response = await geminiAI.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.8,
          responseMimeType: 'application/json',
        },
      });

      jsonText = response.text || '';
    }

    if (!jsonText) {
      throw new Error("Received an empty response from the AI when regenerating post.");
    }

    // Clean the response by removing markdown code blocks if present
    const cleanedJson = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
    const parsedData = parseJsonSafely<unknown>(cleanedJson);
    const post = tryExtractSinglePost(parsedData);

    if (post && post.title && post.caption) {
      // Post-process to ensure hashtags are lowercase
      post.caption = post.caption.replace(/#(\w+)/g, (_match: string, tag: string) => `#${tag.toLowerCase()}`);
      return post as Post;
    } else {
       const receivedKeys = parsedData && typeof parsedData === 'object' ? Object.keys(parsedData as Record<string, unknown>) : [];
       throw new Error(`Invalid data structure received from AI for single post. Keys: ${receivedKeys.join(', ')}`);
    }

  } catch (error) {
    console.error(`${aiProvider.toUpperCase()} API call failed during single post regeneration:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    throw new Error(`Failed to regenerate post. Details: ${errorMessage}`);
  }
};
