import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CalendarSportsEvent } from '../models/CalendarSportsEvent.js';
import { Event } from '../models/Event.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const holidaysPath = path.resolve(currentDir, '../data/indian-calendar-2026.json');
const visibleEventCondition = {
  $or: [{ isHidden: false }, { isHidden: { $exists: false } }]
};

let cachedHolidayEntries = null;

const holidayToneByType = {
  national: 'holiday-national',
  religious: 'holiday-religious',
  regional: 'holiday-regional',
  sports: 'holiday-sports',
  political: 'holiday-political',
  civic: 'holiday-political',
  strike: 'holiday-strike'
};

const holidaySubtitleByType = {
  national: 'National holiday',
  religious: 'Religious observance',
  regional: 'Regional holiday',
  sports: 'Sports / wellness day',
  political: 'Civic / political observance',
  civic: 'Civic / political observance',
  strike: 'Service advisory / strike'
};

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const toDateInputValue = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (value, days) => {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
};

const overlapsDateRange = (item, rangeStart, rangeEnd) => {
  const itemStart = startOfDay(item.startDate);
  const itemEnd = endOfDay(item.endDate || item.startDate);

  return itemStart <= rangeEnd && itemEnd >= rangeStart;
};

const loadHolidayEntries = () => {
  if (cachedHolidayEntries) {
    return cachedHolidayEntries;
  }

  cachedHolidayEntries = JSON.parse(fs.readFileSync(holidaysPath, 'utf8'));
  return cachedHolidayEntries;
};

export const refreshHolidayCache = async () => {
  cachedHolidayEntries = null;
  const entries = loadHolidayEntries();
  const countsByType = entries.reduce(
    (acc, item) => ({
      ...acc,
      [item.holidayType || 'unknown']: (acc[item.holidayType || 'unknown'] || 0) + 1
    }),
    {}
  );

  return {
    total: entries.length,
    countsByType,
    range: {
      start: entries[0]?.startDate || null,
      end: entries[entries.length - 1]?.endDate || null
    }
  };
};

const buildHolidayEntries = ({ dateFrom, dateTo }) =>
  loadHolidayEntries()
    .filter((item) => overlapsDateRange(item, dateFrom, dateTo))
    .map((item) => {
      const holidayType = item.holidayType || 'regional';
      const colorTone = holidayToneByType[holidayType] || 'holiday-regional';
      const subtitle =
        item.subtitle ||
        `${holidaySubtitleByType[holidayType] || 'Holiday'}${item.region ? ` • ${item.region}` : ''}`;

      return {
        ...item,
        id: item.id,
        entryId: item.id,
        entryType: 'holiday',
        title: item.name,
        subtitle,
        colorTone
      };
    });

const buildEventMatchStage = ({ dateFrom, dateTo, includeHiddenEvents }) => {
  const stage = {
    isDeleted: false,
    endDate: { $gte: startOfDay(dateFrom) },
    startDate: { $lte: endOfDay(dateTo) }
  };

  if (!includeHiddenEvents) {
    Object.assign(stage, visibleEventCondition);
  }

  return stage;
};

const buildEventEntries = async ({ dateFrom, dateTo, includeHiddenEvents = true }) =>
  Event.aggregate([
    {
      $match: buildEventMatchStage({
        dateFrom,
        dateTo,
        includeHiddenEvents
      })
    },
    { $sort: { startDate: 1, name: 1 } },
    {
      $lookup: {
        from: 'registrations',
        localField: '_id',
        foreignField: 'eventId',
        as: 'registrations'
      }
    },
    {
      $lookup: {
        from: 'eventinterests',
        localField: '_id',
        foreignField: 'eventId',
        as: 'interests'
      }
    },
    {
      $addFields: {
        registrationCount: { $size: '$registrations' },
        interestCount: { $size: '$interests' }
      }
    },
    {
      $project: {
        registrations: 0,
        interests: 0
      }
    },
    {
      $addFields: {
        entryId: { $concat: ['event:', { $toString: '$_id' }] },
        entryType: 'event',
        title: '$name',
        subtitle: {
          $concat: ['$sportType', ' • ', '$venue']
        },
        colorTone: {
          $cond: [
            '$isHidden',
            'event-hidden',
            {
              $cond: ['$registrationEnabled', 'event-live', 'event-closed']
            }
          ]
        }
      }
    }
  ]);

const buildSportsEntries = async ({ dateFrom, dateTo }) => {
  const items = await CalendarSportsEvent.find({
    endDate: { $gte: startOfDay(dateFrom) },
    startDate: { $lte: endOfDay(dateTo) }
  })
    .sort({ startDate: 1, name: 1 })
    .lean();

  return items.map((item) => ({
    ...item,
    entryId: `sports:${item._id}`,
    entryType: 'sports_fixture',
    title: item.name,
    subtitle: `${item.sportType}${item.location ? ` • ${item.location}` : ''}`,
    colorTone: 'sports-fixture'
  }));
};

export const buildDefaultCalendarRange = (referenceDate = new Date()) => {
  const from = startOfDay(referenceDate);
  const to = endOfDay(addDays(from, 30));

  return {
    dateFrom: from,
    dateTo: to
  };
};

export const buildCalendarRangeFromQuery = (query = {}, referenceDate = new Date()) => {
  const defaults = buildDefaultCalendarRange(referenceDate);
  const dateFrom = query.dateFrom ? startOfDay(query.dateFrom) : defaults.dateFrom;
  const dateTo = query.dateTo ? endOfDay(query.dateTo) : defaults.dateTo;

  return {
    dateFrom,
    dateTo,
    dateFromValue: toDateInputValue(dateFrom),
    dateToValue: toDateInputValue(dateTo)
  };
};

export const getCalendarFeed = async ({
  dateFrom,
  dateTo,
  includeHiddenEvents = true
}) => {
  const [holidays, sportsFixtures, events] = await Promise.all([
    Promise.resolve(buildHolidayEntries({ dateFrom, dateTo })),
    buildSportsEntries({ dateFrom, dateTo }),
    buildEventEntries({ dateFrom, dateTo, includeHiddenEvents })
  ]);

  const items = [...holidays, ...sportsFixtures, ...events].sort((left, right) => {
    const leftStart = new Date(left.startDate).getTime();
    const rightStart = new Date(right.startDate).getTime();

    if (leftStart !== rightStart) {
      return leftStart - rightStart;
    }

    const entryPriority = {
      holiday: 0,
      sports_fixture: 1,
      event: 2
    };

    if ((entryPriority[left.entryType] ?? 99) !== (entryPriority[right.entryType] ?? 99)) {
      return (entryPriority[left.entryType] ?? 99) - (entryPriority[right.entryType] ?? 99);
    }

    return String(left.title || '').localeCompare(String(right.title || ''), 'en-IN');
  });

  return {
    dateFrom: toDateInputValue(dateFrom),
    dateTo: toDateInputValue(dateTo),
    items
  };
};
