import React, { useState, useCallback, useEffect } from 'react';
import { PracticeInfoForm } from './components/PracticeInfoForm';
import { ContentPlanDisplay } from './components/ContentPlanDisplay';
import { generateContentPlan, generateSinglePost } from './services/geminiService';
import type { WeekPlan, Post } from './types';
import { ErrorDisplay } from './components/ErrorDisplay';
import { Hero } from './components/Hero';
import { Header } from './components/Header';
import { extractTextFromPdf } from './utils/pdfParser';
import { calculatePostDate } from './utils/dateUtils';

type PostSchedule = 'MW' | 'TTH';

const App: React.FC = () => {
  const [practiceName, setPracticeName] = useState<string>('');
  const [practiceUrl, setPracticeUrl] = useState<string>('');
  const [practicePhone, setPracticePhone] = useState<string>('');
  const [practiceLocation, setPracticeLocation] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [postSchedule, setPostSchedule] = useState<PostSchedule>('MW');
  const [onboardingFile, setOnboardingFile] = useState<File | null>(null);
  const [pastPostsFile, setPastPostsFile] = useState<File | null>(null);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [contentPlan, setContentPlan] = useState<WeekPlan[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for regenerating a single post
  const [regeneratingPost, setRegeneratingPost] = useState<{ weekIndex: number; postIndex: number } | null>(null);
  // State to hold the text content of the uploaded files
  const [onboardingContent, setOnboardingContent] = useState<string | undefined>();
  const [pastPostsContent, setPastPostsContent] = useState<string | undefined>();

  // Effects to clear text content if a file is removed
  useEffect(() => {
    if (!onboardingFile) setOnboardingContent(undefined);
  }, [onboardingFile]);

  useEffect(() => {
    if (!pastPostsFile) setPastPostsContent(undefined);
  }, [pastPostsFile]);

  const handleSubmit = useCallback(async () => {
    if (!practiceName || !practiceUrl || !startDate) {
      setError('Please fill out all fields, including the start date, before generating the plan.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setContentPlan(null);

    try {
      let tempPastPostsContent: string | undefined = undefined;
      if (pastPostsFile) {
        try {
          tempPastPostsContent = await extractTextFromPdf(pastPostsFile);
          setPastPostsContent(tempPastPostsContent); // Store content in state
        } catch (pdfError) {
          console.error("Failed to parse past posts PDF:", pdfError);
          setError("There was an issue reading the past posts PDF file. Please ensure it's a valid PDF and try again.");
          setIsLoading(false);
          return;
        }
      }

      let tempOnboardingContent: string | undefined = undefined;
      if (onboardingFile) {
        try {
            tempOnboardingContent = await extractTextFromPdf(onboardingFile);
            setOnboardingContent(tempOnboardingContent); // Store content in state
        } catch (pdfError) {
            console.error("Failed to parse onboarding PDF:", pdfError);
            setError("There was an issue reading the onboarding PDF file. Please ensure it's a valid PDF and try again.");
            setIsLoading(false);
            return;
        }
      }

      const plan = await generateContentPlan(practiceName, practiceUrl, startDate, postSchedule, tempPastPostsContent, tempOnboardingContent, specialInstructions, practicePhone, practiceLocation);
      setContentPlan(plan);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate content plan. ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [practiceName, practiceUrl, practicePhone, practiceLocation, startDate, postSchedule, pastPostsFile, onboardingFile, specialInstructions]);

  const handleContentPlanChange = useCallback((weekIndex: number, postIndex: number, field: 'title' | 'caption', value: string) => {
    setContentPlan(currentPlan => {
      if (!currentPlan) return null;
      const newPlan = JSON.parse(JSON.stringify(currentPlan));
      newPlan[weekIndex].posts[postIndex][field] = value;
      return newPlan;
    });
  }, []);
  
  const handleRegeneratePost = useCallback(async (weekIndex: number, postIndex: number, instructions: string) => {
    if (!contentPlan) return;

    setRegeneratingPost({ weekIndex, postIndex });
    setError(null);

    try {
      const postDate = calculatePostDate(startDate, weekIndex, postIndex, postSchedule);
      
      const newPost = await generateSinglePost(
        practiceName,
        practiceUrl,
        contentPlan,
        { weekIndex, postIndex },
        postDate.toISOString().split('T')[0], // Pass date as YYYY-MM-DD
        instructions,
        onboardingContent,
        pastPostsContent
      );

      setContentPlan(currentPlan => {
        if (!currentPlan) return null;
        const newPlan = JSON.parse(JSON.stringify(currentPlan));
        newPlan[weekIndex].posts[postIndex] = newPost;
        return newPlan;
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to regenerate post. ${errorMessage}`);
      console.error(err);
    } finally {
      setRegeneratingPost(null);
    }
  }, [practiceName, practiceUrl, startDate, postSchedule, contentPlan, onboardingContent, pastPostsContent]);


  return (
    <div className="bg-gray-50 min-h-screen text-gray-800 font-sans">
      <Header />
      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-7xl mx-auto">
          <Hero />
          
          <div className="mt-12 bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
            <PracticeInfoForm
              practiceName={practiceName}
              setPracticeName={setPracticeName}
              practiceUrl={practiceUrl}
              setPracticeUrl={setPracticeUrl}
              practicePhone={practicePhone}
              setPracticePhone={setPracticePhone}
              practiceLocation={practiceLocation}
              setPracticeLocation={setPracticeLocation}
              startDate={startDate}
              setStartDate={setStartDate}
              postSchedule={postSchedule}
              setPostSchedule={setPostSchedule}
              onboardingFile={onboardingFile}
              setOnboardingFile={setOnboardingFile}
              pastPostsFile={pastPostsFile}
              setPastPostsFile={setPastPostsFile}
              specialInstructions={specialInstructions}
              setSpecialInstructions={setSpecialInstructions}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
            
            {error && <div className="mt-6"><ErrorDisplay message={error} /></div>}

            {contentPlan && !isLoading && !error && (
              <div className="mt-12 pt-12 border-t border-gray-200">
                <ContentPlanDisplay
                  contentPlan={contentPlan}
                  practiceName={practiceName}
                  postSchedule={postSchedule}
                  startDate={startDate}
                  onContentChange={handleContentPlanChange}
                  onRegeneratePost={handleRegeneratePost}
                  regeneratingPost={regeneratingPost}
                />
              </div>
            )}
          </div>
        </div>
      </main>

       <footer className="text-center py-6 text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Gargle. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;