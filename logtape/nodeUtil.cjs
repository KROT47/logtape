let util = null;
if (
  "process" in globalThis && "versions" in globalThis.process &&
    "node" in globalThis.process.versions &&
    typeof globalThis.caches === "undefined" &&
    typeof globalThis.addEventListener !== "function" ||
  "Bun" in globalThis
) {
  try {
    // Intentionally confuse static analysis of bundlers:
    util = require(`${["node", "util"].join(":")}`);
  } catch (_) {
    util = null;
  }
}

module.exports = util;