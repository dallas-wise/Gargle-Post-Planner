import React, { useState, useEffect } from 'react';

export interface Milestone {
  id: string;
  name: string;
  type: 'birthday' | 'work-anniversary';
  month: string; // Month name (e.g., "January", "February")
  day: number;   // Day of month (1-31)
}

interface MilestoneManagerProps {
  milestones: Milestone[];
  setMilestones: (milestones: Milestone[]) => void;
  onUnsavedDataChange?: (hasUnsavedData: boolean) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MilestoneManager: React.FC<MilestoneManagerProps> = ({
  milestones,
  setMilestones,
  onUnsavedDataChange,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'birthday' | 'work-anniversary'>('birthday');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');

  // Notify parent when there's unsaved data
  useEffect(() => {
    const hasUnsavedData = name.trim() !== '' || month !== '' || day !== '';
    onUnsavedDataChange?.(hasUnsavedData);
  }, [name, month, day, onUnsavedDataChange]);

  const handleAdd = () => {
    if (!name.trim() || !month || !day) {
      alert('Please fill in all fields');
      return;
    }

    const dayNum = parseInt(day, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      alert('Please enter a valid day (1-31)');
      return;
    }

    const newMilestone: Milestone = {
      id: `${Date.now()}-${Math.random()}`,
      name: name.trim(),
      type,
      month,
      day: dayNum,
    };

    setMilestones([...milestones, newMilestone]);

    // Reset form
    setName('');
    setMonth('');
    setDay('');
  };

  const handleRemove = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id));
  };

  const formatDate = (month: string, day: number) => {
    return `${month} ${day}`;
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
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
            <label htmlFor="milestone-month" className="block text-xs font-medium text-gray-700 mb-1">
              Month
            </label>
            <select
              id="milestone-month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 text-sm"
            >
              <option value="">Select month</option>
              {MONTHS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="milestone-day" className="block text-xs font-medium text-gray-700 mb-1">
              Day
            </label>
            <input
              type="number"
              id="milestone-day"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              min="1"
              max="31"
              placeholder="1-31"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 text-sm"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#F79622] hover:bg-[#d47f12] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F79622] transition-colors"
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
                  <span className="text-gray-600">{formatDate(milestone.month, milestone.day)}</span>
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
