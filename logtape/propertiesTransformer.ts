import type { LogRecord } from "./record.ts";

export type RawLogRecord<P> = Pick<
  LogRecord<P>,
  "category" | "level" | "rawMessage" | "timestamp" | "properties"
>;

/**
 * A properties transformer returns updated properties of a {@link RawLogRecord}.
 * @param rawRecord The raw log record to use for transformation.
 * @returns The transformed properties.
 */
export type PropertiesTransformer<P> = (
  rawRecord: RawLogRecord<P>,
) => P;
