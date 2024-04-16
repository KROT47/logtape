import { type FilterLike, toFilter } from "./filter.ts";
import { LoggerImpl } from "./logger.ts";
import type { LogLevel } from "./record.ts";
import { getConsoleSink, type Sink } from "./sink.ts";

/**
 * A configuration for the loggers.
 */
export interface Config<TSinkId extends string, TFilterId extends string> {
  /**
   * The sinks to use.  The keys are the sink identifiers, and the values are
   * {@link Sink}s.
   */
  sinks: Record<TSinkId, Sink>;
  /**
   * The filters to use.  The keys are the filter identifiers, and the values
   * are either {@link Filter}s or {@link LogLevel}s.
   */
  filters: Record<TFilterId, FilterLike>;

  /**
   * The loggers to configure.
   */
  loggers: LoggerConfig<TSinkId, TFilterId>[];

  /**
   * Whether to reset the configuration before applying this one.
   */
  reset?: boolean;
}

/**
 * A logger configuration.
 */
export interface LoggerConfig<
  TSinkId extends string,
  TFilterId extends string,
> {
  /**
   * The category of the logger.  If a string, it is equivalent to an array
   * with one element.
   */
  category: string | string[];

  /**
   * The sink identifiers to use.
   */
  sinks?: TSinkId[];

  /**
   * The filter identifiers to use.
   */
  filters?: TFilterId[];

  /**
   * The log level to filter by.  If `null`, the logger will reject all
   * records.
   */
  level?: LogLevel | null;
}

let configured = false;

/**
 * Configure the loggers with the specified configuration.
 *
 * @example
 * ```typescript
 * configure({
 *   sinks: {
 *     console: getConsoleSink(),
 *   },
 *   filters: {
 *     slow: (log) =>
 *       "duration" in log.properties &&
 *       log.properties.duration as number > 1000,
 *   },
 *   loggers: [
 *     {
 *       category: "my-app",
 *       sinks: ["console"],
 *       level: "info",
 *     },
 *     {
 *       category: ["my-app", "sql"],
 *       filters: ["slow"],
 *       level: "debug",
 *     },
 *     {
 *       category: "logtape",
 *       sinks: ["console"],
 *       level: "error",
 *     },
 *   ],
 * });
 * ```
 *
 * @param config The configuration.
 */
export function configure<TSinkId extends string, TFilterId extends string>(
  config: Config<TSinkId, TFilterId>,
) {
  if (configured && !config.reset) {
    throw new ConfigError(
      "Already configured; if you want to reset, turn on the reset flag.",
    );
  }
  configured = true;
  LoggerImpl.getLogger([]).resetDescendants();

  let metaConfigured = false;

  for (const cfg of config.loggers) {
    if (
      cfg.category.length === 0 ||
      (cfg.category.length === 1 && cfg.category[0] === "logtape") ||
      (cfg.category.length === 2 &&
        cfg.category[0] === "logtape" &&
        cfg.category[1] === "meta")
    ) {
      metaConfigured = true;
    }
    const logger = LoggerImpl.getLogger(cfg.category);
    for (const sinkId of cfg.sinks ?? []) {
      const sink = config.sinks[sinkId];
      if (!sink) {
        reset();
        throw new ConfigError(`Sink not found: ${sinkId}.`);
      }
      logger.sinks.push(sink);
    }
    if (cfg.level !== undefined) logger.filters.push(toFilter(cfg.level));
    for (const filterId of cfg.filters ?? []) {
      const filter = config.filters[filterId];
      if (filter === undefined) {
        reset();
        throw new ConfigError(`Filter not found: ${filterId}.`);
      }
      logger.filters.push(toFilter(filter));
    }
  }

  const meta = LoggerImpl.getLogger(["logtape", "meta"]);
  if (!metaConfigured) {
    meta.sinks.push(getConsoleSink());
  }

  meta.info(
    "LogTape loggers are configured.  Note that LogTape itself uses the meta " +
      "logger, which has category {metaLoggerCategory}.  The meta logger " +
      "purposes to log internal errors such as sink exceptions.  If you " +
      "are seeing this message, the meta logger is somehow configured.  " +
      "It's recommended to configure the meta logger with a separate sink " +
      "so that you can easily notice if logging itself fails or is " +
      "misconfigured.  To turn off this message, configure the meta logger " +
      "with higher log levels than {dismissLevel}.",
    { metaLoggerCategory: ["logtape", "meta"], dismissLevel: "info" },
  );
}

/**
 * Reset the configuration.  Mostly for testing purposes.
 */
export function reset() {
  LoggerImpl.getLogger([]).resetDescendants();
  configured = false;
}

/**
 * A configuration error.
 */
export class ConfigError extends Error {
  /**
   * Constructs a new configuration error.
   * @param message The error message.
   */
  constructor(message: string) {
    super(message);
    this.name = "ConfigureError";
  }
}
