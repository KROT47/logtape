let fs = null;
if (
  isDefined(globalThis, "process") &&
    isDefined(globalThis.process, "versions") &&
    isDefined(globalThis.process.versions, 'node') &&
    typeof globalThis.caches === "undefined" &&
    typeof globalThis.addEventListener !== "function" ||
  "Bun" in globalThis
) {
  try {
    // Intentionally confuse static analysis of bundlers:
    const $require = [require];
    fs = $require[0](`${["node", "fs"].join(":")}`);
  } catch {
    fs = null;
  }
}

module.exports = fs;

function isDefined(obj, key) {
  return !!obj && (key in obj) && !!obj[key];
}
