import {
  type Category,
  type CategoryList,
  getCategoryList,
  type MaybeCategory,
} from "./category.ts";
import { metaLoggerCategory } from "./constants.ts";
import type { Filter } from "./filter.ts";
import type { LogLevel } from "./level.ts";
import type {
  PropertiesTransformer,
  RawLogRecord,
} from "./propertiesTransformer.ts";
import type { LogRecord } from "./record.ts";
import type { Sink } from "./sink.ts";

/**
 * A logger interface.  It provides methods to log messages at different
 * severity levels.
 *
 * ```typescript
 * const logger = getLogger("category");
 * logger.debug `A debug message with ${value}.`;
 * logger.info `An info message with ${value}.`;
 * logger.warn `A warning message with ${value}.`;
 * logger.error `An error message with ${value}.`;
 * logger.critical `A critical error message with ${value}.`;
 * logger.fatal `A fatal error message with ${value}.`;
 * ```
 */
export interface Logger {
  /**
   * The category of the logger.  It is an array of strings.
   */
  readonly category: CategoryList;

  /**
   * The logger with the supercategory of the current logger.  If the current
   * logger is the root logger, this is `null`.
   */
  readonly parent: Logger | null;

  /**
   * Get a child logger with the given subcategory.
   *
   * ```typescript
   * const logger = getLogger("category");
   * const logger2 = logger.getChild("");
   * const logger3 = logger.getChild([""]);
   * const logger4 = logger.getChild(null);
   * const logger5 = logger.getChild(undefined);
   * const subLogger = logger.getChild("sub-category");
   * const subLogger2 = logger.getChild(['', "sub-category"]);
   * ```
   *
   * The above code is equivalent to:
   *
   * ```typescript
   * const logger = getLogger("category");
   * const logger2 = getLogger("category");
   * const logger3 = getLogger("category");
   * const logger4 = getLogger("category");
   * const logger5 = getLogger("category");
   * const subLogger = getLogger(["category", "sub-category"]);
   * const subLogger2 = getLogger(["category", "sub-category"]);
   * ```
   *
   * @param subcategory The subcategory.
   * @returns The child logger.
   */
  getChild(subcategory: MaybeCategory): Logger;

  /**
   * Get a logger with contextual properties.  This is useful for
   * log multiple messages with the shared set of properties.
   *
   * ```typescript
   * const logger = getLogger("category");
   * const ctx = logger.with({ foo: 123, bar: "abc" });
   * ctx.info("A message with {foo} and {bar}.");
   * ctx.warn("Another message with {foo}, {bar}, and {baz}.", { baz: true });
   * ```
   *
   * The above code is equivalent to:
   *
   * ```typescript
   * const logger = getLogger("category");
   * logger.info("A message with {foo} and {bar}.", { foo: 123, bar: "abc" });
   * logger.warn(
   *   "Another message with {foo}, {bar}, and {baz}.",
   *   { foo: 123, bar: "abc", baz: true },
   * );
   * ```
   *
   * @param properties
   * @returns
   * @since 0.5.0
   */
  with(properties: Record<string, unknown>): Logger;

  /**
   * Log a log message with properties.
   *
   * ```typescript
   * logger.log('info', 'A log message with {value}.', { value });
   * ```
   *
   * If the properties are expensive to compute, you can pass a callback that
   * returns the properties:
   *
   * ```typescript
   * logger.log(
   *   'info',
   *   'A log message with {value}.',
   *   () => ({ value: expensiveComputation() })
   * );
   * ```
   *
   * @param level The log level.
   * @param message The message template.  Placeholders to be replaced with
   *                `values` are indicated by keys in curly braces (e.g.,
   *                `{value}`).
   * @param properties The values to replace placeholders with.  For lazy
   *                   evaluation, this can be a callback that returns the
   *                   properties.
   */
  log(
    level: LogLevel,
    message: string,
    properties?: Record<string, unknown> | (() => Record<string, unknown>),
  ): void;

  /**
   * Lazily log a message.  Use this when the message values are expensive
   * to compute and should only be computed if the message is actually logged.
   *
   * ```typescript
   * logger.log('info', l => l`A log message with ${expensiveValue()}.`);
   * ```
   *
   * @param level The log level.
   * @param callback A callback that returns the message template prefix.
   * @throws {TypeError} If no log record was made inside the callback.
   */
  log(level: LogLevel, callback: LogCallback): void;

  /**
   * Log a debug message.  Use this as a template string prefix.
   *
   * ```typescript
   * logger.debug `A debug message with ${value}.`;
   * ```
   *
   * @param message The message template strings array.
   * @param values The message template values.
   */
  debug(message: TemplateStringsArray, ...values: readonly unknown[]): void;

  /**
   * Log a debug message with properties.
   *
   * ```typescript
   * logger.debug('A debug message with {value}.', { value });
   * ```
   *
   * If the properties are expensive to compute, you can pass a callback that
   * returns the properties:
   *
   * ```typescript
   * logger.debug(
   *   'A debug message with {value}.',
   *   () => ({ value: expensiveComputation() })
   * );
   * ```
   *
   * @param message The message template.  Placeholders to be replaced with
   *                `values` are indicated by keys in curly braces (e.g.,
   *                `{value}`).
   * @param properties The values to replace placeholders with.  For lazy
   *                   evaluation, this can be a callback that returns the
   *                   properties.
   */
  debug(
    message: string,
    properties?: Record<string, unknown> | (() => Record<string, unknown>),
  ): void;

  /**
   * Lazily log a debug message.  Use this when the message values are expensive
   * to compute and should only be computed if the message is actually logged.
   *
   * ```typescript
   * logger.debug(l => l`A debug message with ${expensiveValue()}.`);
   * ```
   *
   * @param callback A callback that returns the message template prefix.
   * @throws {TypeError} If no log record was made inside the callback.
   */
  debug(callback: LogCallback): void;

  /**
   * Log an informational message.  Use this as a template string prefix.
   *
   * ```typescript
   * logger.info `An info message with ${value}.`;
   * ```
   *
   * @param message The message template strings array.
   * @param values The message template values.
   */
  info(message: TemplateStringsArray, ...values: readonly unknown[]): void;

  /**
   * Log an informational message with properties.
   *
   * ```typescript
   * logger.info('An info message with {value}.', { value });
   * ```
   *
   * If the properties are expensive to compute, you can pass a callback that
   * returns the properties:
   *
   * ```typescript
   * logger.info(
   *   'An info message with {value}.',
   *   () => ({ value: expensiveComputation() })
   * );
   * ```
   *
   * @param message The message template.  Placeholders to be replaced with
   *                `values` are indicated by keys in curly braces (e.g.,
   *                `{value}`).
   * @param properties The values to replace placeholders with.  For lazy
   *                   evaluation, this can be a callback that returns the
   *                   properties.
   */
  info(
    message: string,
    properties?: Record<string, unknown> | (() => Record<string, unknown>),
  ): void;

  /**
   * Lazily log an informational message.  Use this when the message values are
   * expensive to compute and should only be computed if the message is actually
   * logged.
   *
   * ```typescript
   * logger.info(l => l`An info message with ${expensiveValue()}.`);
   * ```
   *
   * @param callback A callback that returns the message template prefix.
   * @throws {TypeError} If no log record was made inside the callback.
   */
  info(callback: LogCallback): void;

  /**
   * Log a warning message.  Use this as a template string prefix.
   *
   * ```typescript
   * logger.warn `A warning message with ${value}.`;
   * ```
   *
   * @param message The message template strings array.
   * @param values The message template values.
   */
  warn(message: TemplateStringsArray, ...values: readonly unknown[]): void;

  /**
   * Log a warning message with properties.
   *
   * ```typescript
   * logger.warn('A warning message with {value}.', { value });
   * ```
   *
   * If the properties are expensive to compute, you can pass a callback that
   * returns the properties:
   *
   * ```typescript
   * logger.warn(
   *   'A warning message with {value}.',
   *   () => ({ value: expensiveComputation() })
   * );
   * ```
   *
   * @param message The message template.  Placeholders to be replaced with
   *                `values` are indicated by keys in curly braces (e.g.,
   *                `{value}`).
   * @param properties The values to replace placeholders with.  For lazy
   *                   evaluation, this can be a callback that returns the
   *                   properties.
   */
  warn(
    message: string,
    properties?: Record<string, unknown> | (() => Record<string, unknown>),
  ): void;

  /**
   * Lazily log a warning message.  Use this when the message values are
   * expensive to compute and should only be computed if the message is actually
   * logged.
   *
   * ```typescript
   * logger.warn(l => l`A warning message with ${expensiveValue()}.`);
   * ```
   *
   * @param callback A callback that returns the message template prefix.
   * @throws {TypeError} If no log record was made inside the callback.
   */
  warn(callback: LogCallback): void;

  /**
   * Log an error message.  Use this as a template string prefix.
   *
   * ```typescript
   * logger.error `An error message with ${value}.`;
   * ```
   *
   * @param message The message template strings array.
   * @param values The message template values.
   */
  error(message: TemplateStringsArray, ...values: readonly unknown[]): void;

  /**
   * Log an error message with properties.
   *
   * ```typescript
   * logger.warn('An error message with {value}.', { value });
   * ```
   *
   * If the properties are expensive to compute, you can pass a callback that
   * returns the properties:
   *
   * ```typescript
   * logger.error(
   *   'An error message with {value}.',
   *   () => ({ value: expensiveComputation() })
   * );
   * ```
   *
   * @param message The message template.  Placeholders to be replaced with
   *                `values` are indicated by keys in curly braces (e.g.,
   *                `{value}`).
   * @param properties The values to replace placeholders with.  For lazy
   *                   evaluation, this can be a callback that returns the
   *                   properties.
   */
  error(
    message: string,
    properties?: Record<string, unknown> | (() => Record<string, unknown>),
  ): void;

  /**
   * Lazily log an error message.  Use this when the message values are
   * expensive to compute and should only be computed if the message is actually
   * logged.
   *
   * ```typescript
   * logger.error(l => l`An error message with ${expensiveValue()}.`);
   * ```
   *
   * @param callback A callback that returns the message template prefix.
   * @throws {TypeError} If no log record was made inside the callback.
   */
  error(callback: LogCallback): void;

  /**
   * Log a critical error message.  Use this as a template string prefix.
   *
   * ```typescript
   * logger.critical `A critical error message with ${value}.`;
   * ```
   *
   * @param message The message template strings array.
   * @param values The message template values.
   */
  critical(message: TemplateStringsArray, ...values: readonly unknown[]): void;

  /**
   * Log a critical error message with properties.
   *
   * ```typescript
   * logger.warn('A critical error message with {value}.', { value });
   * ```
   *
   * If the properties are expensive to compute, you can pass a callback that
   * returns the properties:
   *
   * ```typescript
   * logger.critical(
   *   'A critical error message with {value}.',
   *   () => ({ value: expensiveComputation() })
   * );
   * ```
   *
   * @param message The message template.  Placeholders to be replaced with
   *                `values` are indicated by keys in curly braces (e.g.,
   *                `{value}`).
   * @param properties The values to replace placeholders with.  For lazy
   *                   evaluation, this can be a callback that returns the
   *                   properties.
   */
  critical(
    message: string,
    properties?: Record<string, unknown> | (() => Record<string, unknown>),
  ): void;

  /**
   * Lazily log a critical error message.  Use this when the message values are
   * expensive to compute and should only be computed if the message is actually
   * logged.
   *
   * ```typescript
   * logger.critical(l => l`A critical error message with ${expensiveValue()}.`);
   * ```
   *
   * @param callback A callback that returns the message template prefix.
   * @throws {TypeError} If no log record was made inside the callback.
   */
  critical(callback: LogCallback): void;

  /**
   * Log a fatal error message.  Use this as a template string prefix.
   *
   * ```typescript
   * logger.fatal `A fatal error message with ${value}.`;
   * ```
   *
   * @param message The message template strings array.
   * @param values The message template values.
   */
  fatal(message: TemplateStringsArray, ...values: readonly unknown[]): void;

  /**
   * Log a fatal error message with properties.
   *
   * ```typescript
   * logger.warn('A fatal error message with {value}.', { value });
   * ```
   *
   * If the properties are expensive to compute, you can pass a callback that
   * returns the properties:
   *
   * ```typescript
   * logger.fatal(
   *   'A fatal error message with {value}.',
   *   () => ({ value: expensiveComputation() })
   * );
   * ```
   *
   * @param message The message template.  Placeholders to be replaced with
   *                `values` are indicated by keys in curly braces (e.g.,
   *                `{value}`).
   * @param properties The values to replace placeholders with.  For lazy
   *                   evaluation, this can be a callback that returns the
   *                   properties.
   */
  fatal(
    message: string,
    properties?: Record<string, unknown> | (() => Record<string, unknown>),
  ): void;

  /**
   * Lazily log a fatal error message.  Use this when the message values are
   * expensive to compute and should only be computed if the message is actually
   * logged.
   *
   * ```typescript
   * logger.fatal(l => l`A fatal error message with ${expensiveValue()}.`);
   * ```
   *
   * @param callback A callback that returns the message template prefix.
   * @throws {TypeError} If no log record was made inside the callback.
   */
  fatal(callback: LogCallback): void;
}

/**
 * A logging callback function.  It is used to defer the computation of a
 * message template until it is actually logged.
 * @param prefix The message template prefix.
 * @returns The rendered message array.
 */
export type LogCallback = (prefix: LogTemplatePrefix) => unknown[];

/**
 * A logging template prefix function.  It is used to log a message in
 * a {@link LogCallback} function.
 * @param message The message template strings array.
 * @param values The message template values.
 * @returns The rendered message array.
 */
export type LogTemplatePrefix = (
  message: TemplateStringsArray,
  ...values: unknown[]
) => unknown[];

/**
 * Get a logger with the given category.
 *
 * ```typescript
 * const logger = getLogger(["my-app"]);
 * ```
 *
 * @param category The category of the logger.  It can be a string or an array
 *                 of strings.  If it is a string, it is equivalent to an array
 *                 with a single element.
 * @returns The logger.
 */
export function getLogger(category: Category = []): Logger {
  return LoggerImpl.getLogger(category);
}

/**
 * The symbol for the global root logger.
 */
const globalRootLoggerSymbol = Symbol.for("logtape.rootLogger");

/**
 * The global root logger registry.
 */
interface GlobalRootLoggerRegistry {
  [globalRootLoggerSymbol]?: LoggerImpl;
}

/**
 * A logger implementation.  Do not use this directly; use {@link getLogger}
 * instead.  This class is exported for testing purposes.
 */
export class LoggerImpl implements Logger {
  readonly children: Record<string, LoggerImpl | WeakRef<LoggerImpl>> = {};
  readonly sinks: Sink[] = [];
  parentSinks: "inherit" | "override" = "inherit";
  readonly filters: Filter[] = [];
  readonly propTransformers: PropertiesTransformer[] = [];
  readonly properties?: Record<string, unknown> | undefined;

  static getLogger(category: Category = []): LoggerImpl {
    let rootLogger: LoggerImpl | null = globalRootLoggerSymbol in globalThis
      ? ((globalThis as GlobalRootLoggerRegistry)[globalRootLoggerSymbol] ??
        null)
      : null;
    if (rootLogger == null) {
      rootLogger = new LoggerImpl(null, []);
      (globalThis as GlobalRootLoggerRegistry)[globalRootLoggerSymbol] =
        rootLogger;
    }
    if (category.length === 0) return rootLogger;
    return rootLogger.getChild(category);
  }

  constructor(
    readonly parent: LoggerImpl | null,
    readonly category: CategoryList,
    properties?: Record<string, unknown>,
  ) {
    this.properties = mergeProperties(
      parent?.properties,
      properties,
    );
  }

  getChild(
    subcategory: MaybeCategory,
    properties?: Record<string, unknown>,
  ): LoggerImpl {
    if (!subcategory) {
      return properties ? this.with(properties) : this;
    }
    const subcategoryList = getCategoryList(subcategory);
    const name = subcategoryList[0];
    const childRef = name ? this.children[name] : undefined;
    let child: LoggerImpl | undefined = childRef instanceof LoggerImpl
      ? childRef
      : childRef?.deref();
    if (!name) {
      child = this;
    } else if (child == null) {
      child = new LoggerImpl(this, [...this.category, name]);
      this.children[name] = "WeakRef" in globalThis
        ? new WeakRef(child)
        : child;
    }
    if (subcategoryList.length === 1) {
      return child;
    }
    return child.getChild(subcategoryList.slice(1));
  }

  /**
   * Reset the logger.  This removes all sinks and filters from the logger.
   */
  reset(): void {
    while (this.sinks.length > 0) this.sinks.shift();
    this.parentSinks = "inherit";
    while (this.filters.length > 0) this.filters.shift();
    while (this.propTransformers.length > 0) this.propTransformers.shift();
  }

  /**
   * Reset the logger and all its descendants.  This removes all sinks and
   * filters from the logger and all its descendants.
   */
  resetDescendants(): void {
    for (const child of Object.values(this.children)) {
      const logger = child instanceof LoggerImpl ? child : child.deref();
      if (logger != null) logger.resetDescendants();
    }
    this.reset();
  }

  with(properties: Record<string, unknown>): LoggerImpl {
    return new LoggerImpl(this, this.category, properties);
  }

  filter(record: LogRecord): boolean {
    for (const filter of this.filters) {
      if (!filter(record)) return false;
    }
    if (this.filters.length < 1) return this.parent?.filter(record) ?? true;
    return true;
  }

  propTransform(rawRecord: RawLogRecord): LogRecord["properties"] {
    if (this.propTransformers.length < 1) {
      return this.parent?.propTransform(rawRecord) ?? rawRecord.properties;
    }
    let resultRecord = rawRecord;
    for (const propTransform of this.propTransformers) {
      resultRecord = {
        ...resultRecord,
        properties: propTransform(resultRecord),
      };
    }
    return resultRecord.properties;
  }

  *getSinks(): Iterable<Sink> {
    if (this.parent != null && this.parentSinks === "inherit") {
      for (const sink of this.parent.getSinks()) yield sink;
    }
    for (const sink of this.sinks) yield sink;
  }

  emit(record: LogRecord, bypassSinks?: Set<Sink>): void {
    if (!this.filter(record)) return;
    for (const sink of this.getSinks()) {
      if (bypassSinks?.has(sink)) continue;
      try {
        sink(record);
      } catch (error) {
        const bypassSinks2 = new Set(bypassSinks);
        bypassSinks2.add(sink);
        metaLogger._log(
          "fatal",
          "Failed to emit a log record to sink",
          { sink, error, record },
          bypassSinks2,
        );
      }
    }
  }

  _log(
    level: LogLevel,
    rawMessage: string,
    properties:
      | Record<string, unknown>
      | (() => Record<string, unknown>)
      | undefined,
    bypassSinks?: Set<Sink>,
  ): void {
    const baseRecord = {
      category: this.category,
      level,
      timestamp: Date.now(),
      rawMessage,
      message: [rawMessage],
    };
    const getProperties = () => {
      return (
        this.propTransform({
          ...baseRecord,
          properties: mergeProperties(
            this.properties,
            typeof properties === "function" ? properties() : properties,
          ),
        })
      );
    };
    const record: LogRecord = {
      ...baseRecord,
      get properties() {
        const value = getProperties();
        Object.defineProperty(this, "properties", { value });
        return value;
      },
    };
    this.emit(record, bypassSinks);
  }

  logLazily(
    level: LogLevel,
    callback: LogCallback,
    properties: Record<string, unknown> = {},
  ): void {
    function realizeMessage(
      this: LogRecord,
    ): [unknown[], TemplateStringsArray] {
      let rawMessage: TemplateStringsArray | undefined = undefined;
      const msg = callback((tpl, ...values) => {
        rawMessage = tpl;
        return renderMessage(tpl, values);
      });
      if (rawMessage == null) throw new TypeError("No log record was made.");

      Object.defineProperties(this, {
        message: { value: msg },
        rawMessage: { value: rawMessage },
      });

      return [msg, rawMessage];
    }
    this.emit({
      category: this.category,
      level,
      get message() {
        return realizeMessage.call(this)[0];
      },
      get rawMessage() {
        return realizeMessage.call(this)[1];
      },
      timestamp: Date.now(),
      properties: mergeProperties(this.properties, properties),
    });
  }

  logTemplate(
    level: LogLevel,
    messageTemplate: TemplateStringsArray,
    values: unknown[],
    properties: Record<string, unknown> = {},
  ): void {
    this.emit({
      category: this.category,
      level,
      message: renderMessage(messageTemplate, values),
      rawMessage: messageTemplate,
      timestamp: Date.now(),
      properties: mergeProperties(this.properties, properties),
    });
  }

  log(
    level: LogLevel,
    message: TemplateStringsArray | string | LogCallback,
    ...values: unknown[]
  ): void {
    if (typeof message === "string") {
      this._log(level, message, values[0] as Record<string, unknown>);
    } else if (typeof message === "function") {
      this.logLazily(level, message);
    } else {
      this.logTemplate(level, message, values);
    }
  }

  debug(
    message: TemplateStringsArray | string | LogCallback,
    ...values: unknown[]
  ): void {
    this.log("debug", message, ...values);
  }

  info(
    message: TemplateStringsArray | string | LogCallback,
    ...values: unknown[]
  ): void {
    this.log("info", message, ...values);
  }

  warn(
    message: TemplateStringsArray | string | LogCallback,
    ...values: unknown[]
  ): void {
    this.log("warning", message, ...values);
  }

  error(
    message: TemplateStringsArray | string | LogCallback,
    ...values: unknown[]
  ): void {
    this.log("error", message, ...values);
  }

  critical(
    message: TemplateStringsArray | string | LogCallback,
    ...values: unknown[]
  ): void {
    this.log("critical", message, ...values);
  }

  fatal(
    message: TemplateStringsArray | string | LogCallback,
    ...values: unknown[]
  ): void {
    this.log("fatal", message, ...values);
  }
}

/**
 * The meta logger.  It is a logger with the category `["logtape", "meta"]`.
 */
const metaLogger = LoggerImpl.getLogger(metaLoggerCategory);

/**
 * Render a message template with values.
 * @param template The message template.
 * @param values The message template values.
 * @returns The message template values interleaved between the substitution
 *          values.
 */
export function renderMessage(
  template: TemplateStringsArray,
  values: readonly unknown[],
): unknown[] {
  const args = [];
  for (let i = 0; i < template.length; i++) {
    args.push(template[i]);
    if (i < values.length) args.push(values[i]);
  }
  return args;
}

export function isLogger(obj: unknown): obj is Logger {
  return !!obj && obj?.constructor.name === LoggerImpl.name;
}

function mergeProperties(
  defaultProperties: Record<string, unknown> | undefined,
  properties: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  return defaultProperties && properties
    ? { ...defaultProperties, ...properties }
    : (defaultProperties ?? properties);
}
