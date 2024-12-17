import { configure } from "./config.ts";
import { getLogger } from "./logger/index.ts";
import { getAnsiColorFormatter } from "./mod.ts";
import { getConsoleSink } from "./sink.ts";

await configure({
  sinks: {
    defaultConsole: getConsoleSink(),
    configuredConsole: getConsoleSink({
      formatter: getAnsiColorFormatter({
        inspectConfig: {
          printFunctions: true,
        },
      }),
    }),
  },
  loggers: [
    {
      category: "app",
      sinks: ["configuredConsole", "defaultConsole"],
    },
  ],
});

const logger = getLogger("app");

// Expect to log an error to logtape meta
// deno-lint-ignore ban-ts-comment
// @ts-expect-error
logger.fatal(() => null);

console.log("----------------------------------------");

logger.debug("debug");
logger.info("info");
logger.warn("warn");
logger.error("error");
logger.critical("critical");
logger.fatal("fatal");

console.log("----------------------------------------");

logger.error((l) => l`hello ${(() => "lazy")()}`);

console.log("----------------------------------------");

const expensiveCalc = () => ["calc", "done"];
logger.error((l) => {
  const [a, b] = expensiveCalc();
  return l`hello ${a} is ${b}`;
});

console.log("----------------------------------------");

logger.error("test context", {
  str: "lorem ipsum",
  num: 123,
  obj: { foo: "bar", obj: { foo: "bar" } },
  arr: [1, 2, 3],
  fn: () => "foo",
});
