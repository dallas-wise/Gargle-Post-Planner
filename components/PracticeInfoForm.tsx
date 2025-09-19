import React from 'react';

type PostSchedule = 'MW' | 'TTH';

interface PracticeInfoFormProps {
  practiceName: string;
  setPracticeName: (value: string) => void;
  practiceUrl: string;
  setPracticeUrl: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  postSchedule: PostSchedule;
  setPostSchedule: (value: PostSchedule) => void;
  onboardingFile: File | null;
  setOnboardingFile: (file: File | null) => void;
  pastPostsFile: File | null;
  setPastPostsFile: (file: File | null) => void;
  specialInstructions: string;
  setSpecialInstructions: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export const PracticeInfoForm: React.FC<PracticeInfoFormProps> = ({
  practiceName,
  setPracticeName,
  practiceUrl,
  setPracticeUrl,
  startDate,
  setStartDate,
  postSchedule,
  setPostSchedule,
  onboardingFile,
  setOnboardingFile,
  pastPostsFile,
  setPastPostsFile,
  specialInstructions,
  setSpecialInstructions,
  onSubmit,
  isLoading,
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: (file: File | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert("File is too large. Please upload a PDF under 10MB.");
        e.target.value = ''; // Clear the input
        return;
      }
      if (file.type !== 'application/pdf') {
        alert("Invalid file type. Please upload a PDF file.");
        e.target.value = ''; // Clear the input
        return;
      }
      setFile(file);
    } else {
      setFile(null);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-8">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="practiceName" className="block text-sm font-medium text-gray-700 mb-1">
              Practice Name
            </label>
            <input
              type="text"
              id="practiceName"
              value={practiceName}
              onChange={(e) => setPracticeName(e.target.value)}
              placeholder="e.g., SmileBright Dental"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder:text-gray-400"
              required
            />
          </div>
          <div>
            <label htmlFor="practiceUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Practice Website URL
            </label>
            <input
              type="url"
              id="practiceUrl"
              value={practiceUrl}
              onChange={(e) => setPracticeUrl(e.target.value)}
              placeholder="e.g., https://www.yourdentalpractice.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder:text-gray-400"
              required
            />
          </div>
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Content Plan Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder:text-gray-400"
              required
              style={{ colorScheme: 'light' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Post Schedule
            </label>
            <div className="flex rounded-lg bg-gray-100 p-1 space-x-1">
              <button
                type="button"
                onClick={() => setPostSchedule('MW')}
                className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  postSchedule === 'MW'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'bg-transparent text-gray-500 hover:bg-white/60'
                }`}
              >
                Mondays & Wednesdays
              </button>
              <button
                type="button"
                onClick={() => setPostSchedule('TTH')}
                className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  postSchedule === 'TTH'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'bg-transparent text-gray-500 hover:bg-white/60'
                }`}
              >
                Tuesdays & Thursdays
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client Onboarding PDF (Optional)
          </label>
          <p className="text-sm text-gray-500 mb-2">
            Upload the client's onboarding document. This helps the AI understand the practice's brand, voice, and specific services for a more tailored plan.
          </p>
          <div className="flex items-center">
            <label
                htmlFor="onboardingFile"
                className="cursor-pointer bg-white hover:bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors border border-gray-300"
            >
                Choose File
            </label>
            <input
                type="file"
                id="onboardingFile"
                accept=".pdf"
                onChange={(e) => handleFileChange(e, setOnboardingFile)}
                className="hidden"
            />
            {onboardingFile ? (
                <div className="flex items-center ml-4">
                    <span className="text-sm text-gray-600 truncate max-w-xs">{onboardingFile.name}</span>
                    <button
                        type="button"
                        onClick={() => setOnboardingFile(null)}
                        className="text-gray-400 hover:text-gray-600 focus:outline-none rounded-full p-1 ml-2"
                        aria-label="Remove file"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            ) : (
                <span className="ml-4 text-sm text-gray-500">No file chosen</span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Avoid Duplicate Content (Optional)
          </label>
          <p className="text-sm text-gray-500 mb-2">
            Upload a PDF of your past social media posts to help the AI generate fresh, unique ideas.
          </p>
          <div className="flex items-center">
            <label
                htmlFor="pastPosts"
                className="cursor-pointer bg-white hover:bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors border border-gray-300"
            >
                Choose File
            </label>
            <input
                type="file"
                id="pastPosts"
                accept=".pdf"
                onChange={(e) => handleFileChange(e, setPastPostsFile)}
                className="hidden"
            />
            {pastPostsFile ? (
                <div className="flex items-center ml-4">
                    <span className="text-sm text-gray-600 truncate max-w-xs">{pastPostsFile.name}</span>
                    <button
                        type="button"
                        onClick={() => setPastPostsFile(null)}
                        className="text-gray-400 hover:text-gray-600 focus:outline-none rounded-full p-1 ml-2"
                        aria-label="Remove file"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            ) : (
                <span className="ml-4 text-sm text-gray-500">No file chosen</span>
            )}
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200">
        <div>
          <label htmlFor="specialInstructions" className="block text-sm font-medium text-gray-700 mb-1">
            Special Instructions for Post Generation (Optional)
          </label>
          <p className="text-sm text-gray-500 mb-2">
            Provide specific instructions to guide the AI in creating your posts (e.g., "Use a friendly, conversational tone", "Include more patient testimonials", "Focus on family-friendly content").
          </p>
          <textarea
            id="specialInstructions"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            rows={3}
            placeholder="e.g., Use a friendly tone, include more educational content about preventive care..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder:text-gray-400 resize-none"
          />
        </div>
      </div>

      <div className="flex justify-start pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-[#156fb9] hover:bg-[#125e9f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#156fb9] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            'Generate Content Plan'
          )}
        </button>
      </div>
    </form>
  );
};