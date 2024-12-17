import type { CategoryList, MaybeCategory } from "../category.ts";
import type { globalRootLoggerSymbol } from "../constants.ts";
import type { LogLevel } from "../level.ts";
import type { LoggerImpl } from "./LoggerImpl.ts";

/**
 * The global root logger registry.
 */
export interface GlobalRootLoggerRegistry {
  [globalRootLoggerSymbol]?: LoggerImpl<unknown>;
}

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
export interface Logger<P> {
  /**
   * The category of the logger.  It is an array of strings.
   */
  readonly category: CategoryList;

  /**
   * The logger with the supercategory of the current logger.  If the current
   * logger is the root logger, this is `null`.
   */
  readonly parent: Logger<P> | null;

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
  getChild(subcategory: MaybeCategory): Logger<P>;

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
  with(properties: P): Logger<P>;

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
    properties?: P | (() => P),
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
    properties?: P | (() => P),
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
    properties?: P | (() => P),
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
    properties?: P | (() => P),
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
    properties?: P | (() => P),
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
    properties?: P | (() => P),
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
    properties?: P | (() => P),
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
