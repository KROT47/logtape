export function getFunction<T>(
  value: T,
  // deno-lint-ignore ban-types
): T extends undefined ? undefined : (T extends Function ? T : () => T) {
  if (value === undefined) {
    // deno-lint-ignore ban-ts-comment
    // @ts-ignore
    return undefined;
  }
  // deno-lint-ignore ban-ts-comment
  // @ts-ignore
  return typeof value === "function" ? value : () => value;
}
