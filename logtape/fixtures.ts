import type { LogRecord } from "./record.ts";

export const info: LogRecord<object> = {
  level: "info",
  category: ["my-app", "junk"],
  message: ["Hello, ", 123, " & ", 456, "!"],
  rawMessage: "Hello, {a} & {b}!",
  timestamp: 1700000000000,
  properties: {},
};

export const debug: LogRecord<object> = {
  ...info,
  level: "debug",
};

export const warning: LogRecord<object> = {
  ...info,
  level: "warning",
};

export const error: LogRecord<object> = {
  ...info,
  level: "error",
};

export const critical: LogRecord = {
  ...info,
  level: "critical",
};

export const fatal: LogRecord = {
  ...info,
  level: "fatal",
};
