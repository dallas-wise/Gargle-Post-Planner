function calculatePostDate(startDateString, weekIndex, postIndex, postSchedule) {
  const planStartDate = new Date(startDateString + 'T00:00:00');
  const targetDays = postSchedule === 'MW' ? [1, 3] : [2, 4];

  const startDayOfWeek = planStartDate.getDay();
  let firstSlotIndex = 0;
  let minOffset = Number.POSITIVE_INFINITY;

  targetDays.forEach((day, index) => {
    const offset = (day - startDayOfWeek + 7) % 7;
    if (offset < minOffset) {
      minOffset = offset;
      firstSlotIndex = index;
    }
  });

  const firstDate = new Date(planStartDate);
  firstDate.setDate(firstDate.getDate() + minOffset);

  const totalPostsBefore = weekIndex * targetDays.length + postIndex;

  if (totalPostsBefore === 0) {
    return firstDate;
  }

  let currentDate = new Date(firstDate);
  let currentSlotIndex = firstSlotIndex;

  for (let i = 0; i < totalPostsBefore; i++) {
    const nextSlotIndex = (currentSlotIndex + 1) % targetDays.length;
    const currentDay = targetDays[currentSlotIndex];
    const nextDay = targetDays[nextSlotIndex];
    let diff = nextDay - currentDay;
    if (diff <= 0) {
      diff += 7;
    }
    currentDate.setDate(currentDate.getDate() + diff);
    currentSlotIndex = nextSlotIndex;
  }

  return currentDate;
}

function printSchedule(startDate, schedule) {
  for (let week = 0; week < 6; week++) {
    const dates = [];
    for (let postIndex = 0; postIndex < 2; postIndex++) {
      const date = calculatePostDate(startDate, week, postIndex, schedule);
      dates.push(date.toISOString().split('T')[0]);
    }
    console.log('Week', week + 1, dates);
  }
}

printSchedule('2024-09-25', 'TTH');
printSchedule('2024-09-23', 'TTH');
printSchedule('2024-09-23', 'MW');
