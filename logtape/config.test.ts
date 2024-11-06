import { assertEquals } from "@std/assert/assert-equals";
import { assertRejects } from "@std/assert/assert-rejects";
import { assertStrictEquals } from "@std/assert/assert-strict-equals";
import {
  type Config,
  ConfigError,
  configure,
  getConfig,
  reset,
} from "./config.ts";
import { type Filter, type FilterLike, toFilter } from "./filter.ts";
import { LoggerImpl } from "./logger.ts";
import type { PropertiesTransformer } from "./propertiesTransformer.ts";
import type { LogRecord } from "./record.ts";
import type { Sink } from "./sink.ts";

Deno.test("configure()", async (t) => {
  let disposed = 0;

  await t.step("test", async () => {
    const aLogs: LogRecord[] = [];
    const a: Sink & AsyncDisposable = (record) => aLogs.push(record);
    a[Symbol.asyncDispose] = () => {
      ++disposed;
      return Promise.resolve();
    };
    const bLogs: LogRecord[] = [];
    const b: Sink & Disposable = (record) => bLogs.push(record);
    b[Symbol.dispose] = () => ++disposed;
    const cLogs: LogRecord[] = [];
    const c: Sink = cLogs.push.bind(cLogs);
    const dLogs: LogRecord[] = [];
    const d: Sink = dLogs.push.bind(dLogs);
    const eLogs: LogRecord[] = [];
    const e: Sink = eLogs.push.bind(eLogs);
    const x: Filter & AsyncDisposable = () => true;
    const tr: PropertiesTransformer = ({ properties }) => ({
      ...properties,
      tr: true,
    });
    x[Symbol.asyncDispose] = () => {
      ++disposed;
      return Promise.resolve();
    };
    const y: Filter & Disposable = () => true;
    y[Symbol.dispose] = () => ++disposed;
    const sinks = { a, b, c, d, e };
    const filters: Record<string, FilterLike> = {
      x,
      y,
      debug: "debug",
      warning: "warning",
    };
    const propTransformers = { tr };
    const config: Config<
      keyof typeof sinks,
      keyof typeof filters,
      keyof typeof propTransformers
    > = {
      sinks,
      filters,
      propTransformers,
      loggers: [
        {
          category: "my-app",
          sinks: ["a"],
          filters: ["x"],
        },
        {
          category: ["my-app", "foo"],
          sinks: ["b"],
          parentSinks: "override",
          filters: ["y"],
        },
        {
          category: ["my-app", "bar"],
          sinks: ["c"],
          filters: ["debug"],
          level: "info",
        },
        {
          category: ["my-app", "test"],
          sinks: ["d"],
          level: "debug",
          filters: ["warning"],
        },
        {
          category: ["my-app", "test", "no_level"],
        },
        {
          category: ["my-app", "tr"],
          sinks: ["e"],
          filters: ["debug"],
          propTransformers: ["tr"],
          level: "info",
        },
        {
          category: ["my-app", "tr", "no_tr"],
          level: "info",
        },
      ],
    };
    await configure(config);
    const getFiltersExpectedString = (filters: Filter[]) =>
      [...filters, toFilter("debug")].toString();

    const logger = LoggerImpl.getLogger("my-app");
    assertEquals(logger.sinks, [a]);
    assertEquals(logger.filters.toString(), getFiltersExpectedString([x]));
    const foo = LoggerImpl.getLogger(["my-app", "foo"]);
    assertEquals(foo.sinks, [b]);
    assertEquals(foo.filters.toString(), getFiltersExpectedString([y]));
    const bar = LoggerImpl.getLogger(["my-app", "bar"]);
    assertEquals(bar.sinks, [c]);
    bar.debug("ignored");
    assertEquals(aLogs, []);
    assertEquals(bLogs, []);
    assertEquals(cLogs, []);
    foo.warn("logged");
    assertEquals(aLogs, []);
    assertEquals(bLogs, [
      {
        level: "warning",
        category: ["my-app", "foo"],
        message: ["logged"],
        rawMessage: "logged",
        properties: undefined,
        timestamp: bLogs[0].timestamp,
      },
    ]);
    assertEquals(cLogs, []);
    bar.info("logged");
    assertEquals(aLogs, [
      {
        level: "info",
        category: ["my-app", "bar"],
        message: ["logged"],
        rawMessage: "logged",
        properties: undefined,
        timestamp: cLogs[0].timestamp,
      },
    ]);
    assertEquals(bLogs, [
      {
        level: "warning",
        category: ["my-app", "foo"],
        message: ["logged"],
        rawMessage: "logged",
        properties: undefined,
        timestamp: bLogs[0].timestamp,
      },
    ]);
    assertEquals(cLogs, [
      {
        level: "info",
        category: ["my-app", "bar"],
        message: ["logged"],
        rawMessage: "logged",
        properties: undefined,
        timestamp: cLogs[0].timestamp,
      },
    ]);
    const test = LoggerImpl.getLogger(["my-app", "test", "no_level"]);
    assertEquals(test.filters.toString(), getFiltersExpectedString([]));
    test.debug("logged");
    assertEquals(dLogs, [{
      level: "debug",
      category: ["my-app", "test", "no_level"],
      message: ["logged"],
      rawMessage: "logged",
      properties: undefined,
      timestamp: dLogs[0].timestamp,
    }]);

    const trLogger1 = LoggerImpl.getLogger(["my-app", "tr"]);
    assertEquals(trLogger1.sinks, [e]);
    trLogger1.info("logged");
    const trLogger1_record: LogRecord = {
      level: "info",
      category: ["my-app", "tr"],
      message: ["logged"],
      rawMessage: "logged",
      properties: { tr: true },
      timestamp: eLogs[0].timestamp,
    };
    assertEquals(eLogs, [
      trLogger1_record,
    ]);
    while (eLogs.length) eLogs.shift();
    const trLogger2 = trLogger1.getChild("tr2");
    trLogger2.info("logged");
    const trLogger2_record: LogRecord = {
      ...trLogger1_record,
      category: [...trLogger1_record.category, "tr2"],
    };
    assertEquals(eLogs, [
      { ...trLogger2_record, timestamp: eLogs[0].timestamp },
    ]);
    while (eLogs.length) eLogs.shift();
    trLogger2.info("{tr}", { tr: false });
    assertEquals(eLogs, [
      {
        level: "info",
        category: ["my-app", "tr", "tr2"],
        message: ["", true, ""],
        rawMessage: "{tr}",
        properties: { tr: true },
        timestamp: eLogs[0].timestamp,
      },
    ]);
    while (eLogs.length) eLogs.shift();
    const no_tr = LoggerImpl.getLogger(["my-app", "tr", "no_tr"]);
    assertEquals(no_tr.sinks, []);
    assertEquals(no_tr.parent?.sinks, [e]);
    no_tr.info("logged");
    const no_tr_record: LogRecord = {
      level: "info",
      category: ["my-app", "tr", "no_tr"],
      message: ["logged"],
      rawMessage: "logged",
      properties: undefined,
      timestamp: eLogs[0].timestamp,
    };
    assertEquals(eLogs, [
      no_tr_record,
    ]);
    assertStrictEquals(getConfig(), config);
  });

  await t.step("reconfigure", async () => {
    await assertRejects(
      () =>
        configure({
          sinks: {},
          loggers: [{ category: "my-app" }],
        }),
      ConfigError,
      "Already configured",
    );
    assertEquals(disposed, 0);

    // No exception if reset is true:
    const config = {
      sinks: {},
      loggers: [{ category: "my-app" }],
      reset: true,
    };
    await configure(config);
    assertEquals(disposed, 4);
    assertStrictEquals(getConfig(), config);
  });

  await t.step("tear down", async () => {
    await reset();
    assertStrictEquals(getConfig(), null);
  });

  await t.step("misconfiguration", async () => {
    await assertRejects(
      () =>
        configure({
          // deno-lint-ignore no-explicit-any
          sinks: {} as any,
          loggers: [
            {
              category: "my-app",
              sinks: ["invalid"],
            },
          ],
          reset: true,
        }),
      ConfigError,
      "Sink not found: invalid",
    );
    assertStrictEquals(getConfig(), null);

    await assertRejects(
      () =>
        configure({
          sinks: {},
          // deno-lint-ignore no-explicit-any
          filters: {} as any,
          loggers: [
            {
              category: "my-app",
              filters: ["invalid"],
            },
          ],
          reset: true,
        }),
      ConfigError,
      "Filter not found: invalid",
    );
    assertStrictEquals(getConfig(), null);
  });

  const metaCategories = [[], ["logtape"], ["logtape", "meta"]];
  for (const metaCategory of metaCategories) {
    await t.step(
      "meta configuration: " + JSON.stringify(metaCategory),
      async () => {
        const config = {
          sinks: {},
          loggers: [
            {
              category: metaCategory,
              sinks: [],
              filters: [],
            },
          ],
        };
        await configure(config);

        assertEquals(LoggerImpl.getLogger(["logger", "meta"]).sinks, []);
        assertStrictEquals(getConfig(), config);
      },
    );

    await t.step("tear down", async () => {
      await reset();
      assertStrictEquals(getConfig(), null);
    });
  }
});
