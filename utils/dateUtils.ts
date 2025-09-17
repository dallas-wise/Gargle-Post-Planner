export const calculatePostDate = (
  startDateString: string,
  weekIndex: number,
  postIndex: number,
  postSchedule: 'MW' | 'TTH'
): Date => {
  // Use T00:00:00 to avoid timezone issues where the date might shift
  const planStartDate = new Date(`${startDateString}T00:00:00`);

  // Target days of the week: Sunday=0, Monday=1, ..., Saturday=6
  const targetDays = postSchedule === 'MW' ? [1, 3] : [2, 4]; // [Monday, Wednesday] or [Tuesday, Thursday]
  const dayForThisPost = targetDays[postIndex];

  // Find the first Monday on or after the plan's start date to establish a baseline for week 1
  const firstMonday = new Date(planStartDate);
  const startDayOfWeek = firstMonday.getDay();
  const daysUntilFirstMonday = (1 - startDayOfWeek + 7) % 7;
  firstMonday.setDate(firstMonday.getDate() + daysUntilFirstMonday);

  // Start with the Monday of the correct week
  const postDate = new Date(firstMonday);
  postDate.setDate(firstMonday.getDate() + weekIndex * 7);

  // Adjust from that Monday to the correct day for the post (e.g., Wednesday or Thursday)
  const daysFromMonday = dayForThisPost - 1; // e.g., Wednesday (3) - Monday (1) = 2 days
  postDate.setDate(postDate.getDate() + daysFromMonday);

  return postDate;
};
