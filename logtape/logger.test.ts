import { assert } from "@std/assert/assert";
import { assertEquals } from "@std/assert/assert-equals";
import { assertFalse } from "@std/assert/assert-false";
import { assertGreaterOrEqual } from "@std/assert/assert-greater-or-equal";
import { assertLessOrEqual } from "@std/assert/assert-less-or-equal";
import { assertStrictEquals } from "@std/assert/assert-strict-equals";
import { toFilter } from "./filter.ts";
import { debug, error, info, warning } from "./fixtures.ts";
import { getLogger, LoggerImpl, renderMessage } from "./logger/index.ts";
import type { LogRecord } from "./record.ts";
import type { Sink } from "./sink.ts";

function templateLiteral(tpl: TemplateStringsArray, ..._: unknown[]) {
  return tpl;
}

Deno.test("getLogger()", () => {
  assertEquals(getLogger().category, []);
  assertStrictEquals(getLogger(), getLogger());
  assertStrictEquals(getLogger([]), getLogger());
  assertEquals(getLogger("foo").category, ["foo"]);
  assertStrictEquals(getLogger("foo"), getLogger("foo"));
  assertStrictEquals(getLogger("foo"), getLogger(["foo"]));
  assertStrictEquals(getLogger("foo"), getLogger().getChild("foo"));
  assertEquals(getLogger(["foo", "bar"]).category, ["foo", "bar"]);
  assertStrictEquals(
    getLogger(["foo", "bar"]),
    getLogger().getChild(["foo", "bar"]),
  );
  assertStrictEquals(
    getLogger(["foo"]),
    getLogger(["foo"]).getChild(""),
  );
  assertStrictEquals(
    getLogger(["foo"]),
    getLogger(["foo"]).getChild([""]),
  );
  assertStrictEquals(
    getLogger(["foo"]),
    getLogger(["foo"]).getChild(null),
  );
  assertStrictEquals(
    getLogger(["foo"]),
    getLogger(["foo"]).getChild(undefined),
  );
  assertStrictEquals(
    getLogger(["foo", "bar"]),
    getLogger(["foo"]).getChild(["", "bar"]),
  );
  assertStrictEquals(
    getLogger(["foo", "bar"]),
    getLogger(["foo"]).getChild([null, "bar"]),
  );
  assertStrictEquals(
    getLogger(["foo", "bar"]),
    getLogger().getChild("foo").getChild("bar"),
  );
  assertStrictEquals(
    getLogger(["foo", ["bar", ["baz", ["qux"]]]]),
    getLogger().getChild("foo").getChild("bar").getChild("baz").getChild("qux"),
  );
});

Deno.test("Logger.getChild()", () => {
  const foo = getLogger("foo");
  const fooBar = foo.getChild("bar");
  assertEquals(fooBar.category, ["foo", "bar"]);
  assertStrictEquals(fooBar.parent, foo);
  const fooBarBaz = foo.getChild(["bar", "baz"]);
  assertEquals(fooBarBaz.category, ["foo", "bar", "baz"]);
  assertEquals(fooBarBaz.parent, fooBar);

  const fooChild = foo.with({ a: 1, b: 2 });
  const fooBarChild = fooChild.getChild("bar");
  assertEquals(fooBarChild.category, ["foo", "bar"]);
  // @ts-ignore: internal attribute:
  assertEquals(fooBarChild.properties, { a: 1, b: 2 });
});

Deno.test("Logger.with()", () => {
  const foo = getLogger("foo");
  const childLogger = foo.with({ a: 1, b: 2 });
  assertEquals(childLogger.parent, foo);
  assertEquals(childLogger.category, ["foo"]);
  // @ts-ignore: internal attribute:
  assertEquals(childLogger.properties, { a: 1, b: 2 });
  // @ts-ignore: internal attribute:
  assertEquals(childLogger.with({ c: 3 }).properties, { a: 1, b: 2, c: 3 });
});

Deno.test("LoggerImpl.filter()", async (t) => {
  const root = LoggerImpl.getLogger([]);
  const foo = LoggerImpl.getLogger("foo");
  const fooBar = foo.getChild("bar");
  const fooBaz = foo.getChild("baz");
  const fooBarQux = fooBar.getChild("qux");
  const fooQuux = foo.getChild("quux");

  await t.step("test", () => {
    foo.filters.push((log) => log.level === "info");
    fooBar.filters.push((log) => log.message.includes("!"));
    fooBaz.filters.push((log) => log.message.includes("."));
    fooBarQux.filters.push(() => true);
    assert(root.filter(info));
    assert(foo.filter(info));
    assert(fooBar.filter(info));
    assertFalse(fooBaz.filter(info));
    assert(fooBarQux.filter(info));
    assert(fooQuux.filter(info));
    assert(root.filter(debug));
    assertFalse(foo.filter(debug));
    assert(fooBar.filter(debug));
    assertFalse(fooBaz.filter(debug));
    assert(fooBarQux.filter(debug));
    assertFalse(fooQuux.filter(debug));
  });

  await t.step("tear down", () => {
    root.resetDescendants();
  });
});

Deno.test("LoggerImpl.propTransform()", async (t) => {
  const root = LoggerImpl.getLogger([]);
  const foo = LoggerImpl.getLogger("foo");
  const fooBar = foo.getChild("bar");
  const fooBaz = foo.getChild("baz");
  const fooBarQux = fooBar.getChild("qux");
  const fooQuux = foo.getChild("quux");

  await t.step("test", () => {
    foo.propTransformers.push(({ properties = {} }) => ({
      ...properties,
      num: (properties.num ? Number(properties.num) : 0) + 1,
    }));
    fooBar.propTransformers.push(({ properties = {} }) => ({
      ...properties,
      num: (properties.num ? Number(properties.num) : 0) + 2,
    }));
    fooBaz.propTransformers.push(({ properties = {} }) => ({
      ...properties,
      num: (properties.num ? Number(properties.num) : 0) + 3,
    }));
    fooQuux.propTransformers.push(({ properties = {} }) => ({
      ...properties,
      num: (properties.num ? Number(properties.num) : 0) + 4,
    }), ({ properties = {} }) => ({
      ...properties,
      num: (properties.num ? Number(properties.num) : 0) + 5,
    }));

    assertEquals(root.propTransform(info), info.properties);
    assertEquals(foo.propTransform(info), {
      ...info.properties,
      num: 1,
    });
    assertEquals(fooBar.propTransform(info), {
      ...info.properties,
      num: 2,
    });
    assertEquals(fooBaz.propTransform(info), {
      ...info.properties,
      num: 3,
    });
    assertEquals(fooBarQux.propTransform(info), {
      ...info.properties,
      num: 2,
    });
    assertEquals(fooQuux.propTransform(info), {
      ...info.properties,
      num: 9,
    });
  });

  await t.step("tear down", () => {
    root.resetDescendants();
  });
});

Deno.test("LoggerImpl.getSinks()", async (t) => {
  const root = LoggerImpl.getLogger([]);
  const foo = LoggerImpl.getLogger("foo");
  const fooBar = foo.getChild("bar");
  const fooBaz = foo.getChild("baz");
  const fooBarQux = fooBar.getChild("qux");

  await t.step("test", () => {
    const sinkA: Sink = () => {};
    foo.sinks.push(sinkA);
    const sinkB: Sink = () => {};
    fooBar.sinks.push(sinkB);
    const sinkC: Sink = () => {};
    fooBaz.sinks.push(sinkC);
    const sinkD: Sink = () => {};
    fooBarQux.sinks.push(sinkD);
    assertEquals([...root.getSinks()], []);
    assertEquals([...foo.getSinks()], [sinkA]);
    assertEquals([...fooBar.getSinks()], [sinkA, sinkB]);
    assertEquals([...fooBaz.getSinks()], [sinkA, sinkC]);
    assertEquals([...fooBarQux.getSinks()], [sinkA, sinkB, sinkD]);
    fooBarQux.parentSinks = "override";
    assertEquals([...fooBarQux.getSinks()], [sinkD]);
  });

  await t.step("tear down", () => {
    root.resetDescendants();
  });
});

Deno.test("LoggerImpl.emit()", async (t) => {
  const root = LoggerImpl.getLogger([]);
  const foo = root.getChild("foo");
  const fooBar = foo.getChild("bar");
  const fooBarBaz = fooBar.getChild("baz");

  await t.step("test", () => {
    const rootRecords: LogRecord[] = [];
    root.sinks.push(rootRecords.push.bind(rootRecords));
    root.filters.push(toFilter("warning"));
    const fooRecords: LogRecord[] = [];
    foo.sinks.push(fooRecords.push.bind(fooRecords));
    foo.filters.push(toFilter("info"));
    const fooBarRecords: LogRecord[] = [];
    fooBar.sinks.push(fooBarRecords.push.bind(fooBarRecords));
    fooBar.filters.push(toFilter("error"));

    root.emit(info);
    assertEquals(rootRecords, []);
    assertEquals(fooRecords, []);
    assertEquals(fooBarRecords, []);
    root.emit(warning);
    assertEquals(rootRecords, [warning]);
    assertEquals(fooRecords, []);
    assertEquals(fooBarRecords, []);

    foo.emit(debug);
    assertEquals(rootRecords, [warning]);
    assertEquals(fooRecords, []);
    assertEquals(fooBarRecords, []);
    foo.emit(info);
    assertEquals(rootRecords, [warning, info]);
    assertEquals(fooRecords, [info]);
    assertEquals(fooBarRecords, []);

    fooBar.emit(warning);
    assertEquals(rootRecords, [warning, info]);
    assertEquals(fooRecords, [info]);
    assertEquals(fooBarRecords, []);
    fooBar.emit(error);
    assertEquals(rootRecords, [warning, info, error]);
    assertEquals(fooRecords, [info, error]);
    assertEquals(fooBarRecords, [error]);

    const errorSink: Sink = () => {
      throw new Error("This is an error");
    };
    fooBarBaz.sinks.push(errorSink);
    fooBarBaz.emit(error);
    assertEquals(rootRecords.length, 5);
    assertEquals(rootRecords.slice(0, 4), [warning, info, error, error]);
    assertEquals(fooRecords, [info, error, error]);
    assertEquals(fooBarRecords, [error, error]);
    assertEquals(rootRecords[4].category, ["logtape", "meta"]);
    assertEquals(rootRecords[4].level, "fatal");
    assertEquals(rootRecords[4].message, [
      "Failed to emit a log record to sink",
    ]);
    assertEquals(rootRecords[4].properties, {
      record: error,
      sink: errorSink,
      error: rootRecords[4].properties?.error,
    });

    root.sinks.push(errorSink);
    fooBarBaz.emit(error);
  });

  await t.step("tear down", () => {
    root.resetDescendants();
  });
});

Deno.test("LoggerImpl.log()", async (t) => {
  const logger = LoggerImpl.getLogger("foo");

  await t.step("test", () => {
    const logs: LogRecord[] = [];
    logger.sinks.push(logs.push.bind(logs));
    const before = Date.now();
    logger.log("info", "Hello, {foo}!", { foo: 123 });
    const after = Date.now();
    assertEquals(logs, [
      {
        category: ["foo"],
        level: "info",
        message: ["Hello, {foo}!"],
        rawMessage: "Hello, {foo}!",
        timestamp: logs[0].timestamp,
        properties: { foo: 123 },
      },
    ]);
    assertGreaterOrEqual(logs[0].timestamp, before);
    assertLessOrEqual(logs[0].timestamp, after);

    logs.shift();
    logger.filters.push(toFilter("error"));
    let called = 0;
    logger.log("warning", "Hello, {foo}!", () => {
      called++;
      return { foo: 123 };
    });
    assertEquals(logs, []);
    assertEquals(called, 0);

    logger.log("error", "Hello, {foo}!", () => {
      called++;
      return { foo: 123 };
    });
    assertEquals(logs, [
      {
        category: ["foo"],
        level: "error",
        message: ["Hello, {foo}!"],
        rawMessage: "Hello, {foo}!",
        timestamp: logs[0].timestamp,
        properties: { foo: 123 },
      },
    ]);
    assertEquals(called, 1);
  });

  await t.step("tear down", () => {
    logger.resetDescendants();
  });
});

Deno.test("LoggerImpl.logLazily()", async (t) => {
  const logger = LoggerImpl.getLogger("foo");

  await t.step("test", () => {
    let called = 0;
    function calc() {
      called++;
      return 123;
    }

    const logs: LogRecord[] = [];
    logger.sinks.push(logs.push.bind(logs));
    logger.filters.push(toFilter("error"));
    logger.logLazily("warning", (l) => l`Hello, ${calc()}!`);
    assertEquals(logs, []);
    assertEquals(called, 0);

    const before = Date.now();
    logger.logLazily("error", (l) => l`Hello, ${calc()}!`);
    const after = Date.now();
    assertEquals(logs, [
      {
        category: ["foo"],
        level: "error",
        message: ["Hello, ", 123, "!"],
        rawMessage: templateLiteral`Hello, ${null}!`,
        timestamp: logs[0].timestamp,
        properties: {},
      },
    ]);
    assertGreaterOrEqual(logs[0].timestamp, before);
    assertLessOrEqual(logs[0].timestamp, after);
    assertEquals(called, 1);
  });

  await t.step("tear down", () => {
    logger.resetDescendants();
  });
});

Deno.test("LoggerImpl.logTemplate()", async (t) => {
  const logger = LoggerImpl.getLogger("foo");

  await t.step("test", () => {
    function info(tpl: TemplateStringsArray, ...values: unknown[]) {
      logger.logTemplate("info", tpl, values);
    }
    const logs: LogRecord[] = [];
    logger.sinks.push(logs.push.bind(logs));

    const before = Date.now();
    info`Hello, ${123}!`;
    const after = Date.now();
    assertEquals(logs, [
      {
        category: ["foo"],
        level: "info",
        message: ["Hello, ", 123, "!"],
        rawMessage: templateLiteral`Hello, ${null}!`,
        timestamp: logs[0].timestamp,
        properties: {},
      },
    ]);
    assertGreaterOrEqual(logs[0].timestamp, before);
    assertLessOrEqual(logs[0].timestamp, after);
  });

  await t.step("tear down", () => {
    logger.resetDescendants();
  });
});

Deno.test("Logger.with().log()", async (t) => {
  const logger = LoggerImpl.getLogger("foo");
  const childLogger = logger.with({ a: 1, b: 2 });

  await t.step("test", () => {
    const logs: LogRecord[] = [];
    logger.sinks.push(logs.push.bind(logs));
    const before = Date.now();
    childLogger.log("info", "Hello, {a} {b} {c}!", { c: 3 });
    const after = Date.now();
    assertEquals(logs, [
      {
        category: ["foo"],
        level: "info",
        message: ["Hello, {a} {b} {c}!"],
        rawMessage: "Hello, {a} {b} {c}!",
        timestamp: logs[0].timestamp,
        properties: { a: 1, b: 2, c: 3 },
      },
    ]);
    assertGreaterOrEqual(logs[0].timestamp, before);
    assertLessOrEqual(logs[0].timestamp, after);

    logs.shift();
    logger.filters.push(toFilter("error"));
    let called = 0;
    childLogger.log("warning", "Hello, {a} {b} {c}!", () => {
      called++;
      return { c: 3 };
    });
    assertEquals(logs, []);
    assertEquals(called, 0);

    childLogger.log("error", "Hello, {a} {b} {c}!", () => {
      called++;
      return { c: 3 };
    });
    assertEquals(logs, [
      {
        category: ["foo"],
        level: "error",
        message: ["Hello, {a} {b} {c}!"],
        rawMessage: "Hello, {a} {b} {c}!",
        timestamp: logs[0].timestamp,
        properties: { a: 1, b: 2, c: 3 },
      },
    ]);
    assertEquals(called, 1);
  });

  await t.step("tear down", () => {
    logger.resetDescendants();
  });
});

Deno.test("Logger.with().logLazily()", async (t) => {
  const logger = LoggerImpl.getLogger("foo");
  const childLogger = logger.with({ a: 1, b: 2 });

  await t.step("test", () => {
    let called = 0;
    function calc() {
      called++;
      return 123;
    }

    const logs: LogRecord[] = [];
    logger.sinks.push(logs.push.bind(logs));
    logger.filters.push(toFilter("error"));
    logger.logLazily("warning", (l) => l`Hello, ${calc()}!`);
    assertEquals(logs, []);
    assertEquals(called, 0);

    const before = Date.now();
    childLogger.logLazily("error", (l) => l`Hello, ${calc()}!`);
    const after = Date.now();
    assertEquals(logs, [
      {
        category: ["foo"],
        level: "error",
        message: ["Hello, ", 123, "!"],
        rawMessage: templateLiteral`Hello, ${null}!`,
        timestamp: logs[0].timestamp,
        properties: { a: 1, b: 2 },
      },
    ]);
    assertGreaterOrEqual(logs[0].timestamp, before);
    assertLessOrEqual(logs[0].timestamp, after);
    assertEquals(called, 1);
  });

  await t.step("tear down", () => {
    logger.resetDescendants();
  });
});

Deno.test("Logger.with().logTemplate()", async (t) => {
  const logger = LoggerImpl.getLogger("foo");
  const childLogger = logger.with({ a: 1, b: 2 });

  await t.step("test", () => {
    function info(tpl: TemplateStringsArray, ...values: unknown[]) {
      childLogger.logTemplate("info", tpl, values);
    }
    const logs: LogRecord[] = [];
    logger.sinks.push(logs.push.bind(logs));

    const before = Date.now();
    info`Hello, ${123}!`;
    const after = Date.now();
    assertEquals(logs, [
      {
        category: ["foo"],
        level: "info",
        message: ["Hello, ", 123, "!"],
        rawMessage: templateLiteral`Hello, ${null}!`,
        timestamp: logs[0].timestamp,
        properties: { a: 1, b: 2 },
      },
    ]);
    assertGreaterOrEqual(logs[0].timestamp, before);
    assertLessOrEqual(logs[0].timestamp, after);
  });

  await t.step("tear down", () => {
    logger.resetDescendants();
  });
});

const methods = [
  "debug",
  "info",
  "warn",
  "error",
  "critical",
  "fatal",
] as const;
for (const method of methods) {
  Deno.test(`Logger.${method}()`, async (t) => {
    const logger = LoggerImpl.getLogger("foo");
    const childLogger = logger.with({ a: 1, b: 2 });

    await t.step("template", () => {
      function tpl(tpl: TemplateStringsArray, ...values: unknown[]) {
        logger[method](tpl, ...values);
      }

      const logs: LogRecord[] = [];
      logger.sinks.push(logs.push.bind(logs));
      let before = Date.now();
      tpl`Hello, ${123}!`;
      let after = Date.now();
      assertEquals(logs, [
        {
          category: ["foo"],
          level: method === "warn" ? "warning" : method,
          message: ["Hello, ", 123, "!"],
          rawMessage: templateLiteral`Hello, ${null}!`,
          timestamp: logs[0].timestamp,
          properties: {},
        },
      ]);
      assertGreaterOrEqual(logs[0].timestamp, before);
      assertLessOrEqual(logs[0].timestamp, after);

      function childLoggerTpl(tpl: TemplateStringsArray, ...values: unknown[]) {
        childLogger[method](tpl, ...values);
      }

      logs.shift();
      before = Date.now();
      childLoggerTpl`Hello, ${123}!`;
      after = Date.now();
      assertEquals(logs, [
        {
          category: ["foo"],
          level: method === "warn" ? "warning" : method,
          message: ["Hello, ", 123, "!"],
          rawMessage: templateLiteral`Hello, ${null}!`,
          timestamp: logs[0].timestamp,
          properties: { a: 1, b: 2 },
        },
      ]);
      assertGreaterOrEqual(logs[0].timestamp, before);
      assertLessOrEqual(logs[0].timestamp, after);
    });

    await t.step("tear down", () => {
      logger.resetDescendants();
    });

    await t.step("lazy template", () => {
      const logs: LogRecord[] = [];
      logger.sinks.push(logs.push.bind(logs));
      let before = Date.now();
      logger[method]((l) => l`Hello, ${123}!`);
      let after = Date.now();
      assertEquals(logs, [
        {
          category: ["foo"],
          level: method === "warn" ? "warning" : method,
          message: ["Hello, ", 123, "!"],
          rawMessage: templateLiteral`Hello, ${null}!`,
          timestamp: logs[0].timestamp,
          properties: {},
        },
      ]);
      assertGreaterOrEqual(logs[0].timestamp, before);
      assertLessOrEqual(logs[0].timestamp, after);

      logs.shift();
      before = Date.now();
      childLogger[method]((l) => l`Hello, ${123}!`);
      after = Date.now();
      assertEquals(logs, [
        {
          category: ["foo"],
          level: method === "warn" ? "warning" : method,
          message: ["Hello, ", 123, "!"],
          rawMessage: templateLiteral`Hello, ${null}!`,
          timestamp: logs[0].timestamp,
          properties: { a: 1, b: 2 },
        },
      ]);
      assertGreaterOrEqual(logs[0].timestamp, before);
      assertLessOrEqual(logs[0].timestamp, after);
    });

    await t.step("tear down", () => {
      logger.resetDescendants();
    });

    await t.step("eager", () => {
      const logs: LogRecord[] = [];
      logger.sinks.push(logs.push.bind(logs));
      let before = Date.now();
      logger[method]("Hello, {foo}!", { foo: 123 });
      let after = Date.now();
      assertEquals(logs, [
        {
          category: ["foo"],
          level: method === "warn" ? "warning" : method,
          message: ["Hello, {foo}!"],
          rawMessage: "Hello, {foo}!",
          timestamp: logs[0].timestamp,
          properties: { foo: 123 },
        },
      ]);
      assertGreaterOrEqual(logs[0].timestamp, before);
      assertLessOrEqual(logs[0].timestamp, after);

      logs.shift();
      logger[method]("Hello, world!");
      assertEquals(logs, [
        {
          category: ["foo"],
          level: method === "warn" ? "warning" : method,
          message: ["Hello, world!"],
          rawMessage: "Hello, world!",
          timestamp: logs[0].timestamp,
          properties: undefined,
        },
      ]);

      logs.shift();
      before = Date.now();
      childLogger[method]("Hello, {a} {b} {c}!", { c: 3 });
      after = Date.now();
      assertEquals(logs, [
        {
          category: ["foo"],
          level: method === "warn" ? "warning" : method,
          message: ["Hello, {a} {b} {c}!"],
          rawMessage: "Hello, {a} {b} {c}!",
          timestamp: logs[0].timestamp,
          properties: { a: 1, b: 2, c: 3 },
        },
      ]);

      logs.shift();
      childLogger[method]("Hello, world!");
      assertEquals(logs, [
        {
          category: ["foo"],
          level: method === "warn" ? "warning" : method,
          message: ["Hello, world!"],
          rawMessage: "Hello, world!",
          timestamp: logs[0].timestamp,
          properties: { a: 1, b: 2 },
        },
      ]);
    });

    await t.step("tear down", () => {
      logger.resetDescendants();
    });

    await t.step("lazy", () => {
      const logs: LogRecord[] = [];
      logger.sinks.push(logs.push.bind(logs));
      let before = Date.now();
      logger[method]("Hello, {foo}!", () => ({ foo: 123 }));
      let after = Date.now();
      assertEquals(logs, [
        {
          category: ["foo"],
          level: method === "warn" ? "warning" : method,
          message: ["Hello, {foo}!"],
          rawMessage: "Hello, {foo}!",
          timestamp: logs[0].timestamp,
          properties: { foo: 123 },
        },
      ]);
      assertGreaterOrEqual(logs[0].timestamp, before);
      assertLessOrEqual(logs[0].timestamp, after);

      logs.shift();
      before = Date.now();
      childLogger[method]("Hello, {a} {b} {c}!", () => {
        return { c: 3 };
      });
      after = Date.now();
      assertEquals(logs, [
        {
          category: ["foo"],
          level: method === "warn" ? "warning" : method,
          message: ["Hello, {a} {b} {c}!"],
          rawMessage: "Hello, {a} {b} {c}!",
          timestamp: logs[0].timestamp,
          properties: { a: 1, b: 2, c: 3 },
        },
      ]);
      assertGreaterOrEqual(logs[0].timestamp, before);
      assertLessOrEqual(logs[0].timestamp, after);
    });

    await t.step("tear down", () => {
      logger.resetDescendants();
    });
  });
}

Deno.test("renderMessage()", () => {
  function rm(tpl: TemplateStringsArray, ...values: unknown[]) {
    return renderMessage(tpl, values);
  }
  assertEquals(rm`Hello, world!`, ["Hello, world!"]);
  assertEquals(rm`Hello, ${123}!`, ["Hello, ", 123, "!"]);
  assertEquals(rm`Hello, ${123}, ${456}!`, ["Hello, ", 123, ", ", 456, "!"]);
  assertEquals(rm`Hello, ${123}, ${456}`, ["Hello, ", 123, ", ", 456, ""]);
});
