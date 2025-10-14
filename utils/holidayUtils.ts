export interface Holiday {
  name: string;
  date: Date;
}

type HolidayGenerator = (year: number) => Holiday;

const nthWeekdayOfMonth = (year: number, monthIndex: number, weekday: number, occurrence: number): Date => {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const firstWeekday = (weekday - firstOfMonth.getDay() + 7) % 7;
  const day = 1 + firstWeekday + (occurrence - 1) * 7;
  return new Date(year, monthIndex, day);
};

const lastWeekdayOfMonth = (year: number, monthIndex: number, weekday: number): Date => {
  const firstOfNextMonth = new Date(year, monthIndex + 1, 1);
  const lastDayOfMonth = new Date(firstOfNextMonth.getTime() - 1);
  const diff = (lastDayOfMonth.getDay() - weekday + 7) % 7;
  return new Date(year, monthIndex, lastDayOfMonth.getDate() - diff);
};

// Anonymous Gregorian algorithm (Meeus/Jones/Butcher) for Easter Sunday
const calculateEasterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-based month
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
};

const fixedDateHoliday = (name: string, monthIndex: number, day: number): HolidayGenerator => {
  return (year: number) => ({
    name,
    date: new Date(year, monthIndex, day),
  });
};

const nthWeekdayHoliday = (name: string, monthIndex: number, weekday: number, occurrence: number): HolidayGenerator => {
  return (year: number) => ({
    name,
    date: nthWeekdayOfMonth(year, monthIndex, weekday, occurrence),
  });
};

const lastWeekdayHoliday = (name: string, monthIndex: number, weekday: number): HolidayGenerator => {
  return (year: number) => ({
    name,
    date: lastWeekdayOfMonth(year, monthIndex, weekday),
  });
};

const HOLIDAY_GENERATORS: HolidayGenerator[] = [
  fixedDateHoliday("New Year's Day", 0, 1),
  nthWeekdayHoliday("Martin Luther King Jr. Day", 0, 1, 3), // Third Monday of January
  fixedDateHoliday("Valentine's Day", 1, 14),
  nthWeekdayHoliday("Presidents' Day", 1, 1, 3), // Third Monday of February
  fixedDateHoliday("St. Patrick's Day", 2, 17),
  (year: number) => ({ name: 'Easter Sunday', date: calculateEasterSunday(year) }),
  nthWeekdayHoliday("Mother's Day", 4, 0, 2), // Second Sunday of May
  lastWeekdayHoliday('Memorial Day', 4, 1), // Last Monday of May
  nthWeekdayHoliday("Father's Day", 5, 0, 3), // Third Sunday of June
  fixedDateHoliday('Independence Day', 6, 4),
  nthWeekdayHoliday('Labor Day', 8, 1, 1), // First Monday of September
  fixedDateHoliday('Halloween', 9, 31),
  fixedDateHoliday("Veterans Day", 10, 11),
  nthWeekdayHoliday('Thanksgiving', 10, 4, 4), // Fourth Thursday of November
  fixedDateHoliday('Christmas Day', 11, 25),
  fixedDateHoliday("New Year's Eve", 11, 31),
];

export const getHolidaysInRange = (rangeStart: Date, rangeEnd: Date): Holiday[] => {
  const startYear = rangeStart.getFullYear();
  const endYear = rangeEnd.getFullYear();

  const holidays: Holiday[] = [];

  for (let year = startYear - 1; year <= endYear + 1; year++) {
    for (const generator of HOLIDAY_GENERATORS) {
      const holiday = generator(year);
      if (holiday.date >= rangeStart && holiday.date <= rangeEnd) {
        holidays.push(holiday);
      }
    }
  }

  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
};

export const formatHolidayDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
