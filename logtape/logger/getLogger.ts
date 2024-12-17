import type { Category } from "../category.ts";
import type { Logger } from "./index.ts";
import { LoggerImpl } from "./LoggerImpl.ts";

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

export function getLogger<P>(category: Category = []): Logger<P> {
  return LoggerImpl.getLogger(category);
}
