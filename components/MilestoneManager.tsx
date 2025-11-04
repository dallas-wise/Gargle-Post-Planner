import React, { useState } from 'react';

export interface Milestone {
  id: string;
  name: string;
  type: 'birthday' | 'work-anniversary';
  date: string; // YYYY-MM-DD format
}

interface MilestoneManagerProps {
  milestones: Milestone[];
  setMilestones: (milestones: Milestone[]) => void;
}

export const MilestoneManager: React.FC<MilestoneManagerProps> = ({
  milestones,
  setMilestones,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'birthday' | 'work-anniversary'>('birthday');
  const [date, setDate] = useState('');

  const handleAdd = () => {
    if (!name.trim() || !date) {
      alert('Please fill in all fields');
      return;
    }

    const newMilestone: Milestone = {
      id: `${Date.now()}-${Math.random()}`,
      name: name.trim(),
      type,
      date,
    };

    setMilestones([...milestones, newMilestone]);

    // Reset form
    setName('');
    setDate('');
  };

  const handleRemove = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getTypeLabel = (type: 'birthday' | 'work-anniversary') => {
    return type === 'birthday' ? 'Birthday' : 'Work Anniversary';
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Birthdays & Work Anniversaries (Optional)
      </label>
      <p className="text-sm text-gray-500 mb-3">
        Add team member birthdays and work anniversaries. The AI will create celebration posts on the appropriate dates.
      </p>

      {/* Input Form */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label htmlFor="milestone-name" className="block text-xs font-medium text-gray-700 mb-1">
              Person's Name
            </label>
            <input
              type="text"
              id="milestone-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Dr. Johnson"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 text-sm"
            />
          </div>

          <div>
            <label htmlFor="milestone-type" className="block text-xs font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              id="milestone-type"
              value={type}
              onChange={(e) => setType(e.target.value as 'birthday' | 'work-anniversary')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 text-sm"
            >
              <option value="birthday">Birthday</option>
              <option value="work-anniversary">Work Anniversary</option>
            </select>
          </div>

          <div>
            <label htmlFor="milestone-date" className="block text-xs font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              id="milestone-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 text-sm"
              style={{ colorScheme: 'light' }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="-ml-0.5 mr-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Milestone
        </button>
      </div>

      {/* Milestone List */}
      {milestones.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-700 mb-2">
            Added Milestones ({milestones.length})
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-3 py-2 text-sm"
              >
                <div className="flex-grow">
                  <span className="font-medium text-gray-900">{milestone.name}</span>
                  <span className="text-gray-500 mx-2">•</span>
                  <span className="text-gray-600">{getTypeLabel(milestone.type)}</span>
                  <span className="text-gray-500 mx-2">•</span>
                  <span className="text-gray-600">{formatDate(milestone.date)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(milestone.id)}
                  className="text-red-600 hover:text-red-800 focus:outline-none ml-3"
                  aria-label="Remove milestone"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
