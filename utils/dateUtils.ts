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

  // Find the first scheduled post day on or after the plan start date
  const firstTargetDay = targetDays[0];
  const firstPostDate = new Date(planStartDate);
  const startDayOfWeek = firstPostDate.getDay();
  const daysUntilFirstTarget = (firstTargetDay - startDayOfWeek + 7) % 7;
  firstPostDate.setDate(firstPostDate.getDate() + daysUntilFirstTarget);

  // Advance by whole weeks
  const postDate = new Date(firstPostDate);
  postDate.setDate(firstPostDate.getDate() + weekIndex * 7);

  // Adjust within the week to the specific scheduled day (e.g., Wednesday or Thursday)
  const dayOffset = (targetDays[postIndex] - firstTargetDay + 7) % 7;
  postDate.setDate(postDate.getDate() + dayOffset);

  return postDate;
};
