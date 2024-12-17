import { configure } from "./config.ts";
import { getLogger } from "./logger.ts";
import { getConsoleSink } from "./sink.ts";

await configure({
  sinks: {
    console: getConsoleSink(),
  },
  loggers: [
    {
      category: "app",
      sinks: ["console"],
    },
  ],
});

const ctx = {
  str: "lorem ipsum",
  num: 123,
  obj: { foo: "bar", obj: { foo: "bar" } },
  arr: [1, 2, 3],
  fn: () => "foo",
};

const logger = getLogger("app");
logger.debug("debug", ctx);
logger.info("info", ctx);
logger.warn("warn", ctx);
logger.error("error", ctx);
logger.critical("critical", ctx);
logger.fatal("fatal", ctx);
