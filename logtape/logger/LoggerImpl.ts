import {
  type Category,
  type CategoryList,
  getCategoryList,
  type MaybeCategory,
} from "../category.ts";
import { globalRootLoggerSymbol, metaLoggerCategory } from "../constants.ts";
import type { Filter } from "../filter.ts";
import type { LogLevel } from "../level.ts";
import type {
  PropertiesTransformer,
  RawLogRecord,
} from "../propertiesTransformer.ts";
import type { LogRecord } from "../record.ts";
import type { Sink } from "../sink.ts";
import type { GlobalRootLoggerRegistry, LogCallback, Logger } from "./types.ts";

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
