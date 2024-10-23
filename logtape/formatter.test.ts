import { assertEquals } from "@std/assert/assert-equals";
import { fatal, info } from "./fixtures.ts";
import {
  ansiColorFormatter,
  defaultConsoleFormatter,
  defaultTextFormatter,
  type FormattedValues,
  getAnsiColorFormatter,
  getTextFormatter,
  tzOffset,
} from "./formatter.ts";

Deno.test(`getTextFormatter()`, () => {
  assertEquals(
    getTextFormatter()(info),
    `2023-11-14 22:13:20.000 ${tzOffset}:00 [INF] my-app·junk: Hello, 123 & 456!\n`,
  );
  assertEquals(
    getTextFormatter({ timestamp: `date` })(info),
    `2023-11-14 [INF] my-app·junk: Hello, 123 & 456!\n`,
  );
  assertEquals(
    getTextFormatter({ timestamp: `date-time` })(info),
    `2023-11-14 22:13:20.000 [INF] my-app·junk: Hello, 123 & 456!\n`,
  );
  assertEquals(
    getTextFormatter({ timestamp: `date-time-timezone` })(info),
    `2023-11-14 22:13:20.000 ${tzOffset}:00 [INF] my-app·junk: Hello, 123 & 456!\n`,
  );
  assertEquals(
    getTextFormatter({ timestamp: `date-time-tz` })(info),
    `2023-11-14 22:13:20.000 ${tzOffset} [INF] my-app·junk: Hello, 123 & 456!\n`,
  );
  assertEquals(
    getTextFormatter({ timestamp: `rfc3339` })(info),
    `2023-11-14T22:13:20.000Z [INF] my-app·junk: Hello, 123 & 456!\n`,
  );
  assertEquals(
    getTextFormatter({ timestamp: `time` })(info),
    `22:13:20.000 [INF] my-app·junk: Hello, 123 & 456!\n`,
  );
  assertEquals(
    getTextFormatter({ timestamp: `time-timezone` })(info),
    `22:13:20.000 ${tzOffset}:00 [INF] my-app·junk: Hello, 123 & 456!\n`,
  );
  assertEquals(
    getTextFormatter({ timestamp: `time-tz` })(info),
    `22:13:20.000 ${tzOffset} [INF] my-app·junk: Hello, 123 & 456!\n`,
  );
  assertEquals(
    getTextFormatter({
      timestamp(ts) {
        const t = new Date(ts);
        return t.toUTCString();
      },
    })(info),
    `Tue, 14 Nov 2023 22:13:20 GMT [INF] my-app·junk: Hello, 123 & 456!\n`,
  );

  assertEquals(
    getTextFormatter({ level: `ABBR` })(info),
    `2023-11-14 22:13:20.000 ${tzOffset}:00 [INF] my-app·junk: Hello, 123 & 456!\n`,
  );
  assertEquals(
    getTextFormatter({ level: `FULL` })(info),
    `2023-11-14 22:13:20.000 ${tzOffset}:00 [INFO] my-app·junk: Hello, 123 & 456!\n`,
  );
  assertEquals(
    getTextFormatter({ level: `L` })(info),
    `2023-11-14 22:13:20.000 ${tzOffset}:00 [I] my-app·junk: Hello, 123 & 456!\n`,
  );
  assertEquals(
    getTextFormatter({ level: `abbr` })(info),
    `2023-11-14 22:13:20.000 ${tzOffset}:00 [inf] my-app·junk: Hello, 123 & 456!\n`,
  );
  assertEquals(
    getTextFormatter({ level: `full` })(info),
    `2023-11-14 22:13:20.000 ${tzOffset}:00 [info] my-app·junk: Hello, 123 & 456!\n`,
  );
  assertEquals(
    getTextFormatter({ level: `l` })(info),
    `2023-11-14 22:13:20.000 ${tzOffset}:00 [i] my-app·junk: Hello, 123 & 456!\n`,
  );
  assertEquals(
    getTextFormatter({
      level(level) {
        return level.at(-1) ?? "";
      },
    })(info),
    `2023-11-14 22:13:20.000 ${tzOffset}:00 [o] my-app·junk: Hello, 123 & 456!\n`,
  );

  assertEquals(
    getTextFormatter({ category: `.` })(info),
    `2023-11-14 22:13:20.000 ${tzOffset}:00 [INF] my-app.junk: Hello, 123 & 456!\n`,
  );
  assertEquals(
    getTextFormatter({
      category(category) {
        return `<${category.join(`/`)}>`;
      },
    })(info),
    `2023-11-14 22:13:20.000 ${tzOffset}:00 [INF] <my-app/junk>: Hello, 123 & 456!\n`,
  );

  assertEquals(
    getTextFormatter({
      value(value) {
        return typeof value;
      },
    })(info),
    `2023-11-14 22:13:20.000 ${tzOffset}:00 [INF] my-app·junk: Hello, number & number!\n`,
  );

  let recordedValues: FormattedValues | null = null;
  assertEquals(
    getTextFormatter({
      format(values) {
        recordedValues = values;
        const { timestamp, level, category, message } = values;
        return `${level} <${category}> ${message} ${timestamp}`;
      },
    })(info),
    `INF <my-app·junk> Hello, 123 & 456! 2023-11-14 22:13:20.000 ${tzOffset}:00\n`,
  );
  assertEquals(
    recordedValues,
    {
      timestamp: `2023-11-14 22:13:20.000 ${tzOffset}:00`,
      level: `INF`,
      category: `my-app·junk`,
      message: `Hello, 123 & 456!`,
      record: info,
    },
  );
});

Deno.test(`defaultTextFormatter()`, () => {
  assertEquals(
    defaultTextFormatter(info),
    `2023-11-14 22:13:20.000 ${tzOffset}:00 [INF] my-app·junk: Hello, 123 & 456!\n`,
  );
  assertEquals(
    defaultTextFormatter(fatal),
    `2023-11-14 22:13:20.000 ${tzOffset}:00 [FTL] my-app·junk: Hello, 123 & 456!\n`,
  );
});

Deno.test(`getAnsiColorFormatter()`, () => {
  assertEquals(
    getAnsiColorFormatter()(info),
    `\x1b[2m2023-11-14 22:13:20.000 ${tzOffset}\x1b[0m ` +
      `\x1b[1m\x1b[32mINF\x1b[0m ` +
      `\x1b[2mmy-app·junk:\x1b[0m ` +
      `Hello, \x1b[33m123\x1b[39m & \x1b[33m456\x1b[39m!\n`,
  );
  assertEquals(
    getAnsiColorFormatter({ timestampStyle: `bold` })(info),
    `\x1b[1m2023-11-14 22:13:20.000 ${tzOffset}\x1b[0m ` +
      `\x1b[1m\x1b[32mINF\x1b[0m ` +
      `\x1b[2mmy-app·junk:\x1b[0m ` +
      `Hello, \x1b[33m123\x1b[39m & \x1b[33m456\x1b[39m!\n`,
  );
  assertEquals(
    getAnsiColorFormatter({ timestampStyle: null })(info),
    `2023-11-14 22:13:20.000 ${tzOffset} ` +
      `\x1b[1m\x1b[32mINF\x1b[0m ` +
      `\x1b[2mmy-app·junk:\x1b[0m ` +
      `Hello, \x1b[33m123\x1b[39m & \x1b[33m456\x1b[39m!\n`,
  );

  assertEquals(
    getAnsiColorFormatter({ timestampColor: `cyan` })(info),
    `\x1b[2m\x1b[36m2023-11-14 22:13:20.000 ${tzOffset}\x1b[0m ` +
      `\x1b[1m\x1b[32mINF\x1b[0m ` +
      `\x1b[2mmy-app·junk:\x1b[0m ` +
      `Hello, \x1b[33m123\x1b[39m & \x1b[33m456\x1b[39m!\n`,
  );
  assertEquals(
    getAnsiColorFormatter({ timestampColor: null })(info),
    `\x1b[2m2023-11-14 22:13:20.000 ${tzOffset}\x1b[0m ` +
      `\x1b[1m\x1b[32mINF\x1b[0m ` +
      `\x1b[2mmy-app·junk:\x1b[0m ` +
      `Hello, \x1b[33m123\x1b[39m & \x1b[33m456\x1b[39m!\n`,
  );
  assertEquals(
    getAnsiColorFormatter({ timestampStyle: null, timestampColor: `cyan` })(
      info,
    ),
    `\x1b[36m2023-11-14 22:13:20.000 ${tzOffset}\x1b[0m ` +
      `\x1b[1m\x1b[32mINF\x1b[0m ` +
      `\x1b[2mmy-app·junk:\x1b[0m ` +
      `Hello, \x1b[33m123\x1b[39m & \x1b[33m456\x1b[39m!\n`,
  );
  assertEquals(
    getAnsiColorFormatter({ timestampStyle: null, timestampColor: null })(info),
    `2023-11-14 22:13:20.000 ${tzOffset} ` +
      `\x1b[1m\x1b[32mINF\x1b[0m ` +
      `\x1b[2mmy-app·junk:\x1b[0m ` +
      `Hello, \x1b[33m123\x1b[39m & \x1b[33m456\x1b[39m!\n`,
  );

  assertEquals(
    getAnsiColorFormatter({ levelStyle: null })(info),
    `\x1b[2m2023-11-14 22:13:20.000 ${tzOffset}\x1b[0m ` +
      `\x1b[32mINF\x1b[0m ` +
      `\x1b[2mmy-app·junk:\x1b[0m ` +
      `Hello, \x1b[33m123\x1b[39m & \x1b[33m456\x1b[39m!\n`,
  );
  assertEquals(
    getAnsiColorFormatter({ levelStyle: `dim` })(info),
    `\x1b[2m2023-11-14 22:13:20.000 ${tzOffset}\x1b[0m ` +
      `\x1b[2m\x1b[32mINF\x1b[0m ` +
      `\x1b[2mmy-app·junk:\x1b[0m ` +
      `Hello, \x1b[33m123\x1b[39m & \x1b[33m456\x1b[39m!\n`,
  );

  assertEquals(
    getAnsiColorFormatter({
      levelColors: {
        debug: `blue`,
        info: `cyan`,
        warning: `yellow`,
        error: `red`,
        fatal: `magenta`,
      },
    })(info),
    `\x1b[2m2023-11-14 22:13:20.000 ${tzOffset}\x1b[0m ` +
      `\x1b[1m\x1b[36mINF\x1b[0m ` +
      `\x1b[2mmy-app·junk:\x1b[0m ` +
      `Hello, \x1b[33m123\x1b[39m & \x1b[33m456\x1b[39m!\n`,
  );
  assertEquals(
    getAnsiColorFormatter({
      levelColors: {
        debug: `blue`,
        info: null,
        warning: `yellow`,
        error: `red`,
        fatal: `magenta`,
      },
      levelStyle: null,
    })(info),
    `\x1b[2m2023-11-14 22:13:20.000 ${tzOffset}\x1b[0m INF ` +
      `\x1b[2mmy-app·junk:\x1b[0m ` +
      `Hello, \x1b[33m123\x1b[39m & \x1b[33m456\x1b[39m!\n`,
  );

  assertEquals(
    getAnsiColorFormatter({ categoryStyle: `bold` })(info),
    `\x1b[2m2023-11-14 22:13:20.000 ${tzOffset}\x1b[0m ` +
      `\x1b[1m\x1b[32mINF\x1b[0m ` +
      `\x1b[1mmy-app·junk:\x1b[0m ` +
      `Hello, \x1b[33m123\x1b[39m & \x1b[33m456\x1b[39m!\n`,
  );
  assertEquals(
    getAnsiColorFormatter({ categoryStyle: null })(info),
    `\x1b[2m2023-11-14 22:13:20.000 ${tzOffset}\x1b[0m ` +
      `\x1b[1m\x1b[32mINF\x1b[0m ` +
      `my-app·junk: ` +
      `Hello, \x1b[33m123\x1b[39m & \x1b[33m456\x1b[39m!\n`,
  );

  assertEquals(
    getAnsiColorFormatter({ categoryColor: `cyan` })(info),
    `\x1b[2m2023-11-14 22:13:20.000 ${tzOffset}\x1b[0m ` +
      `\x1b[1m\x1b[32mINF\x1b[0m ` +
      `\x1b[2m\x1b[36mmy-app·junk:\x1b[0m ` +
      `Hello, \x1b[33m123\x1b[39m & \x1b[33m456\x1b[39m!\n`,
  );

  let recordedValues: FormattedValues | null = null;
  assertEquals(
    getAnsiColorFormatter({
      format(values) {
        recordedValues = values;
        const { timestamp, level, category, message } = values;
        return `${level} <${category}> ${message} ${timestamp}`;
      },
    })(info),
    `\x1b[1m\x1b[32mINF\x1b[0m ` +
      `<\x1b[2mmy-app·junk\x1b[0m> ` +
      `Hello, \x1b[33m123\x1b[39m & \x1b[33m456\x1b[39m! ` +
      `\x1b[2m2023-11-14 22:13:20.000 ${tzOffset}\x1b[0m\n`,
  );
  assertEquals(
    recordedValues,
    {
      timestamp: `\x1b[2m2023-11-14 22:13:20.000 ${tzOffset}\x1b[0m`,
      level: `\x1b[1m\x1b[32mINF\x1b[0m`,
      category: `\x1b[2mmy-app·junk\x1b[0m`,
      message: `Hello, \x1b[33m123\x1b[39m & \x1b[33m456\x1b[39m!`,
      record: info,
    },
  );
});

Deno.test(`ansiColorFormatter()`, () => {
  assertEquals(
    ansiColorFormatter(info),
    `\x1b[2m2023-11-14 22:13:20.000 ${tzOffset}\x1b[0m ` +
      `\x1b[1m\x1b[32mINF\x1b[0m ` +
      `\x1b[2mmy-app·junk:\x1b[0m ` +
      `Hello, \x1b[33m123\x1b[39m & \x1b[33m456\x1b[39m!\n`,
  );
  assertEquals(
    ansiColorFormatter(fatal),
    `\x1b[2m2023-11-14 22:13:20.000 ${tzOffset}\x1b[0m ` +
      `\x1b[1m\x1b[35mFTL\x1b[0m ` +
      `\x1b[2mmy-app·junk:\x1b[0m ` +
      `Hello, \x1b[33m123\x1b[39m & \x1b[33m456\x1b[39m!\n`,
  );
});

Deno.test(`defaultConsoleFormatter()`, () => {
  assertEquals(
    defaultConsoleFormatter(info),
    [
      `%c22:13:20.000 %cINF%c %cmy-app·junk %cHello, %o & %o!`,
      `color: gray;`,
      `background-color: white; color: black;`,
      `background-color: default;`,
      `color: gray;`,
      `color: default;`,
      123,
      456,
    ],
  );
});
