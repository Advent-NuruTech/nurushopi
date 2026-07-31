export type SabbathParams = {
  now?: Date;
  tzOffsetMinutes?: number;
};

export type SabbathWindow = {
  start: Date;
  end: Date;
  isClosed: boolean;
};

export type SabbathTiming = SabbathWindow & {
  nextStart: Date;
  nextEnd: Date;
  msToStart: number;
  msToEnd: number;
};

// Friday 5:00 PM → Saturday 6:30 PM
const SABBATH_START_HOUR = 17;
const SABBATH_START_MINUTE = 0;

const SABBATH_END_HOUR = 18;
const SABBATH_END_MINUTE = 30;

const getLocalParts = (now: Date, tzOffsetMinutes?: number) => {
  if (typeof tzOffsetMinutes === "number") {
    const local = new Date(now.getTime() - tzOffsetMinutes * 60_000);

    return {
      year: local.getUTCFullYear(),
      month: local.getUTCMonth(),
      date: local.getUTCDate(),
      day: local.getUTCDay(),
      local,
    };
  }

  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    date: now.getDate(),
    day: now.getDay(),
    local: now,
  };
};

const makeLocalDate = (
  year: number,
  month: number,
  date: number,
  hour: number,
 minute: number,
  tzOffsetMinutes?: number
) => {
  if (typeof tzOffsetMinutes === "number") {
    const utcMs =
      Date.UTC(year, month, date, hour, minute) +
      tzOffsetMinutes * 60_000;

    return new Date(utcMs);
  }

  return new Date(year, month, date, hour, minute);
};

export function getSabbathWindow(
  params: SabbathParams = {}
): SabbathWindow {
  const now = params.now ?? new Date();

  const { year, month, date, day } = getLocalParts(
    now,
    params.tzOffsetMinutes
  );

  // Friday of the current week
  const daysSinceFriday = (day + 2) % 7;
  const fridayDate = date - daysSinceFriday;

  // Friday 5:00 PM
  const start = makeLocalDate(
    year,
    month,
    fridayDate,
    SABBATH_START_HOUR,
    SABBATH_START_MINUTE,
    params.tzOffsetMinutes
  );

  // Saturday 6:30 PM
  const end = makeLocalDate(
    year,
    month,
    fridayDate + 1,
    SABBATH_END_HOUR,
    SABBATH_END_MINUTE,
    params.tzOffsetMinutes
  );

  const isClosed =
    now.getTime() >= start.getTime() &&
    now.getTime() < end.getTime();

  return {
    start,
    end,
    isClosed,
  };
}

export function isSabbathClosed(
  params: SabbathParams = {}
): boolean {
  return getSabbathWindow(params).isClosed;
}

export function getSabbathTiming(
  params: SabbathParams = {}
): SabbathTiming {
  const now = params.now ?? new Date();
  const current = getSabbathWindow(params);

  let nextStart = current.start;
  let nextEnd = current.end;

  // If this week's Sabbath has already begun,
  // move countdown to next Friday.
  if (now.getTime() >= current.start.getTime()) {
    nextStart = new Date(
      current.start.getTime() + 7 * 24 * 60 * 60 * 1000
    );

    nextEnd = new Date(
      current.end.getTime() + 7 * 24 * 60 * 60 * 1000
    );
  }

  return {
    ...current,
    nextStart,
    nextEnd,
    msToStart: nextStart.getTime() - now.getTime(),
    msToEnd: current.end.getTime() - now.getTime(),
  };
}