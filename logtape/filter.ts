import type { LogLevel } from "./level.ts";
import type { LogRecord } from "./record.ts";

/**
 * A filter is a function that accepts a log record and returns `true` if the
 * record should be passed to the sink.
 *
 * @param record The log record to filter.
 * @returns `true` if the record should be passed to the sink.
 */
export type Filter = (record: LogRecord) => boolean;

/**
 * A filter-like value is either a {@link Filter} or a {@link LogLevel}.
 * `null` is also allowed to represent a filter that rejects all records.
 */
export type FilterLike = Filter | LogLevel | null;

/**
 * Converts a {@link FilterLike} value to an actual {@link Filter}.
 *
 * @param filter The filter-like value to convert.
 * @returns The actual filter.
 */
export function toFilter(filter: FilterLike): Filter {
  if (typeof filter === "function") return filter;
  return getLevelFilter(filter);
}

const levelsOrder = [
  "fatal",
  "critical",
  "error",
  "warning",
  "info",
  "debug",
];

/**
 * Returns a filter that accepts log records with the specified level.
 *
 * @param level The level to filter by.  If `null`, the filter will reject all
 *              records.
 * @returns The filter.
 */
export function getLevelFilter(level: LogLevel | null): Filter {
  if (level == null) return () => false;
  if (level === "debug") return () => true;

  const levelIndex = getLevelIndex(level);

  return (record: LogRecord) => {
    const recordLevelIndex = getLevelIndex(record.level);
    return levelIndex >= recordLevelIndex;
  };
}

const levelsOrderMap = new Map(
  levelsOrder.map((level, index) => [level, index]),
);

function getLevelIndex(level: LogLevel): number {
  const index = levelsOrderMap.get(level);
  if (index === undefined) throw new TypeError(`Invalid log level: ${level}.`);
  return index;
}
