import React, { useState } from 'react';
import type { Post } from '../types';

interface PostCardProps {
  post: Post;
  postDate: string;
  weekIndex: number;
  postIndex: number;
  onContentChange: (weekIndex: number, postIndex: number, field: 'title' | 'caption' | 'photoIdeas', value: string) => void;
  onRegenerate: (weekIndex: number, postIndex: number, instructions: string) => void;
  isRegenerating: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({ post, postDate, weekIndex, postIndex, onContentChange, onRegenerate, isRegenerating }) => {
  const [instructions, setInstructions] = useState('');

  return (
    <div className="bg-gray-50 rounded-lg p-5 border border-gray-200 flex flex-col h-full relative">
      {isRegenerating && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
          <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}

      <div className="flex-grow flex flex-col min-h-0">
        <div className='flex justify-between items-center mb-3'>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-100 px-3 py-1 rounded-full self-start">
            {postDate}
          </span>
        </div>
        
        <label htmlFor={`title-${weekIndex}-${postIndex}`} className="sr-only">Post Title</label>
        <textarea
          id={`title-${weekIndex}-${postIndex}`}
          value={post.title}
          onChange={(e) => onContentChange(weekIndex, postIndex, 'title', e.target.value)}
          rows={2}
          className="w-full text-lg font-bold text-gray-900 mb-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md -ml-2 px-2 py-1 transition-shadow resize-none"
        />
        
        <label htmlFor={`caption-${weekIndex}-${postIndex}`} className="sr-only">Post Caption</label>
        <textarea
          id={`caption-${weekIndex}-${postIndex}`}
          value={post.caption}
          onChange={(e) => onContentChange(weekIndex, postIndex, 'caption', e.target.value)}
          rows={8}
          className="text-gray-600 whitespace-pre-wrap text-sm leading-relaxed bg-transparent w-full focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md -ml-2 px-2 py-1 transition-shadow resize-none flex-grow"
        />

        <div className="mt-3 pt-3 border-t border-gray-200">
          <label htmlFor={`photoIdeas-${weekIndex}-${postIndex}`} className="block text-xs font-semibold text-gray-700 mb-1">
            Photo/Content Ideas
          </label>
          <textarea
            id={`photoIdeas-${weekIndex}-${postIndex}`}
            value={post.photoIdeas || ''}
            onChange={(e) => onContentChange(weekIndex, postIndex, 'photoIdeas', e.target.value)}
            rows={2}
            placeholder="Suggested photos or content for this post..."
            className="text-gray-600 text-sm leading-relaxed bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-2 border border-gray-300 transition-shadow resize-none"
          />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
         <div className="mb-4">
          <label htmlFor={`instructions-${weekIndex}-${postIndex}`} className="block text-xs font-medium text-gray-600 mb-1">
            Special Instructions (Optional)
          </label>
          <textarea
            id={`instructions-${weekIndex}-${postIndex}`}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            placeholder="e.g., Make this post funnier, add a question..."
            className="text-gray-600 text-sm leading-relaxed bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-2 border border-gray-300 transition-shadow resize-none"
          />
        </div>
        <button
          onClick={() => onRegenerate(weekIndex, postIndex, instructions)}
          disabled={isRegenerating}
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Generate New Post
        </button>
      </div>
    </div>
  );
};
