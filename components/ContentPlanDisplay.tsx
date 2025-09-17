import React from 'react';
import type { WeekPlan } from '../types';
import { PostCard } from './PostCard';
import * as XLSX from 'xlsx';
import { calculatePostDate } from '../utils/dateUtils';

interface ContentPlanDisplayProps {
  contentPlan: WeekPlan[];
  practiceName: string;
  postSchedule: 'MW' | 'TTH';
  startDate: string;
  onContentChange: (weekIndex: number, postIndex: number, field: 'title' | 'caption', value: string) => void;
  onRegeneratePost: (weekIndex: number, postIndex: number, instructions: string) => void;
  regeneratingPost: { weekIndex: number; postIndex: number; } | null;
}

export const ContentPlanDisplay: React.FC<ContentPlanDisplayProps> = ({ 
  contentPlan, 
  practiceName, 
  postSchedule, 
  startDate, 
  onContentChange,
  onRegeneratePost,
  regeneratingPost
}) => {

  const handleDownload = () => {
    const dataForExcel = contentPlan.flatMap(week => 
      week.posts.map(post => [post.caption])
    );
    const ws = XLSX.utils.aoa_to_sheet(dataForExcel);
    ws['!cols'] = [{ wch: 100 }];
    const sheetName = `G&F - Cycle 1 - ${postSchedule}`;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const fileName = `${practiceName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-content-plan.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="space-y-12">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Your 12-Week Social Media Plan</h2>
        <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-600">
          Here is your custom content schedule for <span className="font-semibold text-blue-600">{practiceName}</span>. You can edit the posts below before downloading.
        </p>
        <div className="mt-6">
          <button
            onClick={handleDownload}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-3 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Download as Excel
          </button>
        </div>
      </div>
      {contentPlan.map((weekData, weekIndex) => (
        <div key={weekData.week} className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-2xl font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-6">
            Week {weekData.week}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {weekData.posts.map((post, postIndex) => {
              const postDate = calculatePostDate(startDate, weekIndex, postIndex, postSchedule);
              const formattedDate = postDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
              const isRegenerating = regeneratingPost?.weekIndex === weekIndex && regeneratingPost?.postIndex === postIndex;
              
              return (
                <PostCard 
                  key={postIndex} 
                  post={post} 
                  postDate={formattedDate}
                  weekIndex={weekIndex}
                  postIndex={postIndex}
                  onContentChange={onContentChange}
                  onRegenerate={onRegeneratePost}
                  isRegenerating={isRegenerating}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};