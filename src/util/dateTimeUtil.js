import moment from 'moment-timezone';

const DAY_MS = 24 * 60 * 60 * 1000;

const toTodayAt = (now, hh, mm, ss) => {
  const d = new Date(now);
  d.setHours(hh, mm, ss, 0);
  return d;
};

const computeDailyWindow = ({ hh, mm, ss }, now = new Date()) => {
  const midnight = new Date(now);
  midnight.setHours(23, 59, 0, 0);

  const todayStart = toTodayAt(now, hh, mm, ss);

  let dateFrom = new Date(todayStart.getTime() - DAY_MS);
  let dateTo = todayStart;

  if (now > dateTo && now <= midnight) {
    dateFrom = todayStart;
    dateTo = new Date(todayStart.getTime() + DAY_MS);
  }

  let formattedDateFrom = moment.tz(dateFrom, 'Asia/Manila').toDate();
  let formattedDateTo = moment.tz(dateTo, 'Asia/Manila').toDate();

  return {
    now,
    midnight,
    dateFrom,
    dateTo,
    formattedDateFrom,
    formattedDateTo,
  };
};

const isValidDate = (date) => {
  let check = false;

  if (!date || typeof date !== 'string') return check;

  const pattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = date.match(pattern);

  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);

    if (month < 1 || month > 12) return check;
    if (day < 1 || day > 31) return check;

    if ([4, 6, 9, 11].includes(month) && day > 30) return check;

    if (month === 2) {
      const isLeapYear =
        (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      if (day > 29 || (day === 29 && !isLeapYear)) return check;
    }

    check = true;
  }

  return check;
};

const getCurrentTimestamp = () => {
  return moment().tz('Asia/Manila').format('YYYY-MM-DD[T]HH:mm:ss.SSS');
};

export { computeDailyWindow, getCurrentTimestamp, isValidDate };
