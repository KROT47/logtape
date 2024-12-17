import { assert } from "@std/assert/assert";
import { assertFalse } from "@std/assert/assert-false";
import { assertStrictEquals } from "@std/assert/assert-strict-equals";
import { assertThrows } from "@std/assert/assert-throws";
import { type Filter, getLevelFilter, toFilter } from "./filter.ts";
import { critical, debug, error, fatal, info, warning } from "./fixtures.ts";
import type { LogLevel } from "./level.ts";

Deno.test("getLevelFilter()", () => {
  const noneFilter = getLevelFilter(null);
  assertFalse(noneFilter(fatal));
  assertFalse(noneFilter(critical));
  assertFalse(noneFilter(error));
  assertFalse(noneFilter(warning));
  assertFalse(noneFilter(info));
  assertFalse(noneFilter(debug));

  const fatalFilter = getLevelFilter("fatal");
  assert(fatalFilter(fatal));
  assertFalse(fatalFilter(critical));
  assertFalse(fatalFilter(error));
  assertFalse(fatalFilter(warning));
  assertFalse(fatalFilter(info));
  assertFalse(fatalFilter(debug));

  const criticalFilter = getLevelFilter("critical");
  assert(criticalFilter(fatal));
  assert(criticalFilter(critical));
  assertFalse(criticalFilter(error));
  assertFalse(criticalFilter(warning));
  assertFalse(criticalFilter(info));
  assertFalse(criticalFilter(debug));

  const errorFilter = getLevelFilter("error");
  assert(errorFilter(fatal));
  assert(errorFilter(critical));
  assert(errorFilter(error));
  assertFalse(errorFilter(warning));
  assertFalse(errorFilter(info));
  assertFalse(errorFilter(debug));

  const warningFilter = getLevelFilter("warning");
  assert(warningFilter(fatal));
  assert(warningFilter(critical));
  assert(warningFilter(error));
  assert(warningFilter(warning));
  assertFalse(warningFilter(info));
  assertFalse(warningFilter(debug));

  const infoFilter = getLevelFilter("info");
  assert(infoFilter(fatal));
  assert(infoFilter(critical));
  assert(infoFilter(error));
  assert(infoFilter(warning));
  assert(infoFilter(info));
  assertFalse(infoFilter(debug));

  const debugFilter = getLevelFilter("debug");
  assert(debugFilter(fatal));
  assert(debugFilter(critical));
  assert(debugFilter(error));
  assert(debugFilter(warning));
  assert(debugFilter(info));
  assert(debugFilter(debug));

  assertThrows(
    () => getLevelFilter("invalid" as LogLevel),
    TypeError,
    "Invalid log level: invalid.",
  );
});

Deno.test("toFilter()", () => {
  const hasJunk: Filter = (record) => record.category.includes("junk");
  assertStrictEquals(toFilter(hasJunk), hasJunk);

  const infoFilter = toFilter("info");
  assertFalse(infoFilter(debug));
  assert(infoFilter(info));
  assert(infoFilter(warning));
});
