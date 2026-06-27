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

const SABBATH_SUNSET_HOUR = 18;

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
      Date.UTC(year, month, date, hour, minute) + tzOffsetMinutes * 60_000;
    return new Date(utcMs);
  }
  return new Date(year, month, date, hour, minute);
};

export function getSabbathWindow(params: SabbathParams = {}): SabbathWindow {
  const now = params.now ?? new Date();
  const { year, month, date, day } = getLocalParts(now, params.tzOffsetMinutes);

  const daysSinceFriday = (day + 2) % 7;
  const fridayDate = date - daysSinceFriday;

  const start = makeLocalDate(
    year,
    month,
    fridayDate,
    SABBATH_SUNSET_HOUR,
    0,
    params.tzOffsetMinutes
  );
  const end = makeLocalDate(
    year,
    month,
    fridayDate + 1,
    SABBATH_SUNSET_HOUR,
    0,
    params.tzOffsetMinutes
  );

  const isClosed = now.getTime() >= start.getTime() && now.getTime() < end.getTime();
  return { start, end, isClosed };
}

export function isSabbathClosed(params: SabbathParams = {}) {
  return getSabbathWindow(params).isClosed;
}

export function getSabbathTiming(params: SabbathParams = {}): SabbathTiming {
  const now = params.now ?? new Date();
  const current = getSabbathWindow(params);

  let nextStart = current.start;
  let nextEnd = current.end;

  if (now.getTime() >= current.start.getTime()) {
    nextStart = new Date(current.start.getTime() + 7 * 24 * 60 * 60 * 1000);
    nextEnd = new Date(current.end.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  const msToStart = nextStart.getTime() - now.getTime();
  const msToEnd = current.end.getTime() - now.getTime();

  return {
    ...current,
    nextStart,
    nextEnd,
    msToStart,
    msToEnd,
  };
}
