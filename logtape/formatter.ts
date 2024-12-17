import type { CategoryList } from "./category.ts";
import { inspect, type InspectConfig } from "./inspect.ts";
import type { LogLevel } from "./level.ts";
import type { LogRecord } from "./record.ts";
import { getFunction } from "./utils.ts";

/**
 * A text formatter is a function that accepts a log record and returns
 * a string.
 *
 * @param record The log record to format.
 * @returns The formatted log record.
 */
export type TextFormatter = (record: LogRecord) => string;

/**
 * The severity level abbreviations.
 */
const levelAbbreviations: Record<LogLevel, string> = {
  "debug": "DBG",
  "info": "INF",
  "warning": "WRN",
  "error": "ERR",
  "critical": "CRT",
  "fatal": "FTL",
};

/**
 * The formatted values for a log record.
 * @since 0.6.0
 */
export interface FormattedValues {
  /**
   * The formatted timestamp.
   */
  timestamp: string;

  /**
   * The formatted log level.
   */
  level: string;

  /**
   * The formatted category.
   */
  category: string;

  /**
   * The formatted message.
   */
  message: string;

  /**
   * The unformatted log record.
   */
  record: LogRecord;
}

export type BaseFormatterOptions = {
  shouldPrintProperties?: boolean | ((record: LogRecord) => boolean);
  inspectConfig?: InspectConfig;
};

/**
 * The various options for the built-in text formatters.
 * @since 0.6.0
 */
export interface TextFormatterOptions extends BaseFormatterOptions {
  /**
   * The timestamp format.  This can be one of the following:
   *
   * - `"date-time-timezone"`: The date and time with the full timezone offset
   *   (e.g., `"2023-11-14 22:13:20.000 +00:00"`).
   * - `"date-time-tz"`: The date and time with the short timezone offset
   *   (e.g., `"2023-11-14 22:13:20.000 +00"`).
   * - `"date-time"`: The date and time without the timezone offset
   *   (e.g., `"2023-11-14 22:13:20.000"`).
   * - `"time-timezone"`: The time with the full timezone offset but without
   *   the date (e.g., `"22:13:20.000 +00:00"`).
   * - `"time-tz"`: The time with the short timezone offset but without the date
   *   (e.g., `"22:13:20.000 +00"`).
   * - `"time"`: The time without the date or timezone offset
   *   (e.g., `"22:13:20.000"`).
   * - `"date"`: The date without the time or timezone offset
   *   (e.g., `"2023-11-14"`).
   * - `"rfc3339"`: The date and time in RFC 3339 format
   *   (e.g., `"2023-11-14T22:13:20.000Z"`).
   *
   * Alternatively, this can be a function that accepts a timestamp and returns
   * a string.
   *
   * The default is `"date-time-timezone"`.
   */
  timestamp?:
    | "date-time-timezone"
    | "date-time-tz"
    | "date-time"
    | "time-timezone"
    | "time-tz"
    | "time"
    | "date"
    | "rfc3339"
    | ((ts: number) => string);

  /**
   * The log level format.  This can be one of the following:
   *
   * - `"ABBR"`: The log level abbreviation in uppercase (e.g., `"INF"`).
   * - `"FULL"`: The full log level name in uppercase (e.g., `"INFO"`).
   * - `"L"`: The first letter of the log level in uppercase (e.g., `"I"`).
   * - `"abbr"`: The log level abbreviation in lowercase (e.g., `"inf"`).
   * - `"full"`: The full log level name in lowercase (e.g., `"info"`).
   * - `"l"`: The first letter of the log level in lowercase (e.g., `"i"`).
   *
   * Alternatively, this can be a function that accepts a log level and returns
   * a string.
   *
   * The default is `"ABBR"`.
   */
  level?:
    | "ABBR"
    | "FULL"
    | "L"
    | "abbr"
    | "full"
    | "l"
    | ((level: LogLevel) => string);

  /**
   * The separator between category names.  For example, if the separator is
   * `"·"`, the category `["a", "b", "c"]` will be formatted as `"a·b·c"`.
   * The default separator is `"·"`.
   *
   * If this is a function, it will be called with the category array and
   * should return a string, which will be used for rendering the category.
   */
  category?: string | ((category: CategoryList) => string);

  /**
   * The format of the embedded values.
   *
   * A function that renders a value to a string.  This function is used to
   * render the values in the log record.
   * The default is simple polyfill of [`util.inspect()`] in Node.js.
   *
   * [`util.inspect()`]: https://nodejs.org/api/util.html#utilinspectobject-options
   * @param value The value to render.
   * @returns The string representation of the value.
   */
  value?: (value: unknown) => string;

  /**
   * How those formatted parts are concatenated.
   *
   * A function that formats the log record.  This function is called with the
   * formatted values and should return a string.  Note that the formatted
   * *should not* include a newline character at the end.
   *
   * By default, this is a function that formats the log record as follows:
   *
   * ```
   * 2023-11-14 22:13:20.000 +00:00 [INF] category·subcategory: Hello, world!
   * ```
   * @param values The formatted values.
   * @returns The formatted log record.
   */
  format?: (values: FormattedValues) => string;
}

function getDateIsoString(ts: number): string {
  return new Date(ts).toISOString();
}

function splitStringGetLeft(str: string, char: string): string {
  const index = str.indexOf(char);
  if (index === -1) return str;
  return str.slice(0, index);
}

function splitStringGetRight(str: string, char: string): string {
  const index = str.indexOf(char);
  if (index === -1) return str;
  return str.slice(index + 1);
}

function getTimeFromDateString(dateStr: string): string {
  return splitStringGetRight(dateStr, "T");
}

function getDateFromDateString(dateStr: string): string {
  return splitStringGetLeft(dateStr, "T");
}

const _tzOffset = -new Date().getTimezoneOffset() / 60;
const tzOffsetSign = _tzOffset >= 0 ? "+" : "-";
export const tzOffset = tzOffsetSign +
  String(Math.abs(_tzOffset)).padStart(2, "0");
export const timezoneOffset = tzOffset + ":00";

const textFormatterTimestampsMap = new Map<
  TextFormatterOptions["timestamp"],
  (ts: number) => string
>([
  [
    "date-time-timezone",
    (ts) =>
      getDateIsoString(ts).replace("T", " ").slice(0, -1) +
      ` ${timezoneOffset}`,
  ],
  [
    "date-time-tz",
    (ts) =>
      getDateIsoString(ts).replace("T", " ").slice(0, -1) + ` ${tzOffset}`,
  ],
  [
    "date-time",
    (ts) => getDateIsoString(ts).replace("T", " ").slice(0, -1),
  ],
  [
    "time-timezone",
    (ts) =>
      getTimeFromDateString(getDateIsoString(ts)).slice(0, -1) +
      ` ${timezoneOffset}`,
  ],
  [
    "time-tz",
    (ts) =>
      getTimeFromDateString(getDateIsoString(ts)).slice(0, -1) + ` ${tzOffset}`,
  ],
  [
    "time",
    (ts) => getTimeFromDateString(getDateIsoString(ts)).slice(0, -1),
  ],
  ["date", (ts) => getDateFromDateString(getDateIsoString(ts))],
  ["rfc3339", (ts) => getDateIsoString(ts)],
]);

const textFormatterLevelsMap = new Map<
  TextFormatterOptions["level"],
  (level: LogLevel) => string
>([
  ["ABBR", (level) => levelAbbreviations[level]],
  ["abbr", (level) => levelAbbreviations[level].toLowerCase()],
  ["FULL", (level) => level.toUpperCase()],
  ["full", (level) => level],
  ["L", (level) => level.charAt(0).toUpperCase()],
  ["l", (level) => level.charAt(0)],
]);

/**
 * Get a text formatter with the specified options.  Although it's flexible
 * enough to create a custom formatter, if you want more control, you can
 * create a custom formatter that satisfies the {@link TextFormatter} type
 * instead.
 *
 * For more information on the options, see {@link TextFormatterOptions}.
 *
 * By default, the formatter formats log records as follows:
 *
 * ```
 * 2023-11-14 22:13:20.000 +00:00 [INF] category·subcategory: Hello, world!
 * ```
 * @param options The options for the text formatter.
 * @returns The text formatter.
 * @since 0.6.0
 */
export function getTextFormatter(
  {
    timestamp,
    level,
    category,
    value,
    format,
    inspectConfig,
  }: TextFormatterOptions = {},
): TextFormatter {
  const timestampRenderer = typeof timestamp === "function"
    ? timestamp
    : textFormatterTimestampsMap.get(
      timestamp ?? "date-time-timezone",
    )!;
  const levelRenderer = typeof level === "function"
    ? level
    : textFormatterLevelsMap.get(level ?? "ABBR")!;

  const optionsCategory = category;
  const categorySeparator = typeof optionsCategory === "function"
    ? optionsCategory
    : (category: CategoryList) => category.join(optionsCategory ?? "·");
  const valueRenderer = value ?? inspect;

  const formatter = format ??
    (({ timestamp, level, category, message, record }: FormattedValues) =>
      `${timestamp} [${level}] ${category}: ${message}` +
      (record.message.length === 1
        ? ` ${inspect(record.properties, inspectConfig)}`
        : ""));

  return (record: LogRecord): string => {
    const timestamp = timestampRenderer(record.timestamp);
    const level = levelRenderer(record.level);
    const category = categorySeparator(record.category);
    const message = record.message.reduce<string>(
      (msg, part, i) => msg + (i % 2 === 0 ? part : valueRenderer(part)),
      "",
    );

    const values: FormattedValues = {
      timestamp,
      level,
      category,
      message,
      record,
    };

    return `${formatter(values)}\n`;
  };
}

/**
 * The default text formatter.  This formatter formats log records as follows:
 *
 * ```
 * 2023-11-14 22:13:20.000 +00:00 [INF] category·subcategory: Hello, world!
 * ```
 *
 * @param record The log record to format.
 * @returns The formatted log record.
 */
export const defaultTextFormatter: TextFormatter = getTextFormatter();

const RESET = "\x1b[0m";

/**
 * The ANSI colors.  These can be used to colorize text in the console.
 * @since 0.6.0
 */
export type AnsiColor =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "darkorange"
  | "magenta"
  | "cyan"
  | "white";

const ansiColors: Record<AnsiColor, string> = {
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  darkorange: "\x1b[38;5;208m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

/**
 * The ANSI text styles.
 * @since 0.6.0
 */
export type AnsiStyle =
  | "bold"
  | "dim"
  | "italic"
  | "underline"
  | "strikethrough";

const ansiStyles: Record<AnsiStyle, string> = {
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",
  strikethrough: "\x1b[9m",
};

const defaultLevelColors: Record<LogLevel, AnsiColor | null> = {
  debug: "blue",
  info: "green",
  warning: "yellow",
  error: "red",
  critical: "darkorange",
  fatal: "magenta",
};

/**
 * The various options for the ANSI color formatter.
 * @since 0.6.0
 */
export interface AnsiColorFormatterOptions extends TextFormatterOptions {
  /**
   * The timestamp format.  This can be one of the following:
   *
   * - `"date-time-timezone"`: The date and time with the full timezone offset
   *   (e.g., `"2023-11-14 22:13:20.000 +00:00"`).
   * - `"date-time-tz"`: The date and time with the short timezone offset
   *   (e.g., `"2023-11-14 22:13:20.000 +00"`).
   * - `"date-time"`: The date and time without the timezone offset
   *   (e.g., `"2023-11-14 22:13:20.000"`).
   * - `"time-timezone"`: The time with the full timezone offset but without
   *   the date (e.g., `"22:13:20.000 +00:00"`).
   * - `"time-tz"`: The time with the short timezone offset but without the date
   *   (e.g., `"22:13:20.000 +00"`).
   * - `"time"`: The time without the date or timezone offset
   *   (e.g., `"22:13:20.000"`).
   * - `"date"`: The date without the time or timezone offset
   *   (e.g., `"2023-11-14"`).
   * - `"rfc3339"`: The date and time in RFC 3339 format
   *   (e.g., `"2023-11-14T22:13:20.000Z"`).
   *
   * Alternatively, this can be a function that accepts a timestamp and returns
   * a string.
   *
   * The default is `"date-time-tz"`.
   */
  timestamp?:
    | "date-time-timezone"
    | "date-time-tz"
    | "date-time"
    | "time-timezone"
    | "time-tz"
    | "time"
    | "date"
    | "rfc3339"
    | ((ts: number) => string);

  /**
   * The ANSI style for the timestamp.  `"dim"` is used by default.
   */
  timestampStyle?: AnsiStyle | null;

  /**
   * The ANSI color for the timestamp.  No color is used by default.
   */
  timestampColor?: AnsiColor | null;

  /**
   * The ANSI style for the log level.  `"bold"` is used by default.
   */
  levelStyle?: AnsiStyle | null;

  /**
   * The ANSI colors for the log levels.  The default colors are as follows:
   *
   * - `"debug"`: `"blue"`
   * - `"info"`: `"green"`
   * - `"warning"`: `"yellow"`
   * - `"error"`: `"red"`
   * - `"critical"`: `"darkorange"`
   * - `"fatal"`: `"magenta"`
   */
  levelColors?: Record<LogLevel, AnsiColor | null>;

  /**
   * The ANSI style for the category.  `"dim"` is used by default.
   */
  categoryStyle?: AnsiStyle | null;

  /**
   * The ANSI color for the category.  No color is used by default.
   */
  categoryColor?: AnsiColor | null;
}

function getAnsiStyle(style: AnsiStyle | null): string {
  return style ? ansiStyles[style] : "";
}
function getAnsiColor(color: AnsiColor | null): string {
  return color ? ansiColors[color] : "";
}
function getToAnsiStringTransformer(
  color: AnsiColor | null,
  style: AnsiStyle | null,
): (str: string) => string {
  const prefix = `${getAnsiStyle(style)}${getAnsiColor(color)}`;
  const suffix = style || color ? RESET : "";
  return (str: string) => `${prefix}${str}${suffix}`;
}

/**
 * Get an ANSI color formatter with the specified options.
 *
 * ![A preview of an ANSI color formatter.](https://i.imgur.com/I8LlBUf.png)
 * @param option The options for the ANSI color formatter.
 * @returns The ANSI color formatter.
 * @since 0.6.0
 */
export function getAnsiColorFormatter(
  options: AnsiColorFormatterOptions = {},
): TextFormatter {
  const {
    format,
    timestampStyle = "dim",
    timestampColor = null,
    levelStyle = "bold",
    levelColors = defaultLevelColors,
    categoryStyle = "dim",
    categoryColor = null,
    inspectConfig,
  } = options;

  const shouldPrintProperties = getFunction(options.shouldPrintProperties) ??
    (({ message }: LogRecord) => message.length === 1);

  const getAnsiTimestamp = getToAnsiStringTransformer(
    timestampColor,
    timestampStyle,
  );

  const getAnsiCategory = getToAnsiStringTransformer(
    categoryColor,
    categoryStyle,
  );

  return getTextFormatter({
    timestamp: "date-time-tz",
    value(value: unknown): string {
      return inspect(value, { colors: true, ...inspectConfig });
    },
    ...options,
    format({ timestamp: ts, level: l, category, message, record }): string {
      const timestamp = getAnsiTimestamp(ts);
      const levelColor = levelColors[record.level];
      const getAnsiLevel = getToAnsiStringTransformer(
        levelColor,
        levelStyle,
      );
      const level = getAnsiLevel(l);
      return format
        ? format({
          timestamp,
          level,
          category: getAnsiCategory(category),
          message,
          record,
        })
        : `${timestamp} ${level} ${getAnsiCategory(`${category}:`)} ${message}${
          shouldPrintProperties(record) && record.properties
            ? ` ${
              inspect(record.properties, { colors: true, ...inspectConfig })
            }`
            : ""
        }`;
    },
  });
}

/**
 * A text formatter that uses ANSI colors to format log records.
 *
 * ![A preview of ansiColorFormatter.](https://i.imgur.com/I8LlBUf.png)
 *
 * @param record The log record to format.
 * @returns The formatted log record.
 * @since 0.5.0
 */
export const ansiColorFormatter: TextFormatter = getAnsiColorFormatter();

/**
 * A console formatter is a function that accepts a log record and returns
 * an array of arguments to pass to {@link console.log}.
 *
 * @param record The log record to format.
 * @returns The formatted log record, as an array of arguments for
 *          {@link console.log}.
 */
export type ConsoleFormatter = (record: LogRecord) => readonly unknown[];

/**
 * The styles for the log level in the console.
 */
const logLevelStyles: Record<LogLevel, string> = {
  "debug": "background-color: gray; color: white;",
  "info": "background-color: white; color: black;",
  "warning": "background-color: orange; color: black;",
  "error": "background-color: red; color: white;",
  "critical": "background-color: darkred; color: white;",
  "fatal": "background-color: maroon; color: white;",
};

type DefaultConsoleFormatterOptions = BaseFormatterOptions;

/**
 * The default console formatter.
 *
 * @param record The log record to format.
 * @returns The formatted log record, as an array of arguments for
 *          {@link console.log}.
 */
export function getDefaultConsoleFormatter(
  options: DefaultConsoleFormatterOptions = {},
): ConsoleFormatter {
  return (record: LogRecord): readonly unknown[] => {
    const { message, timestamp, level, category, properties } = record;

    const shouldPrintProperties = getFunction(options.shouldPrintProperties) ??
      (({ message }: LogRecord) => message.length === 1);

    // Format time as HH:MM:SS.mmm
    const date = new Date(timestamp);
    const time = date.toISOString().substring(11, 23);

    // Build the log message string with placeholders and collect values
    const msg = message.map((m, i) => (i % 2 === 0 ? m : "%o")).join("");
    const values = message.filter((_, i) => i % 2 !== 0);

    // Format the log record for console output
    return [
      `%c${time} %c${levelAbbreviations[level]}%c %c${
        category.join("\xb7")
      } %c${msg}`,
      "color: gray;",
      logLevelStyles[level],
      "background-color: default;",
      "color: gray;",
      "color: default;",
      ...values,
      shouldPrintProperties(record) && properties ? properties : "",
    ];
  };
}
