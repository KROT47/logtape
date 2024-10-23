import { assertEquals } from "@std/assert/assert-equals";
import { join } from "@std/path/join";
import { getFileSink, getRotatingFileSink } from "./filesink.deno.ts";
import { debug, error, fatal, info, warning } from "./fixtures.ts";
import { tzOffset } from "./formatter.ts";
import type { Sink } from "./sink.ts";

Deno.test("getFileSink()", () => {
  const path = Deno.makeTempFileSync();
  const sink: Sink & Disposable = getFileSink(path);
  sink(debug);
  sink(info);
  sink(warning);
  sink(error);
  sink(fatal);
  sink[Symbol.dispose]();
  assertEquals(
    Deno.readTextFileSync(path),
    `\
2023-11-14 22:13:20.000 ${tzOffset}:00 [DBG] my-app·junk: Hello, 123 & 456!
2023-11-14 22:13:20.000 ${tzOffset}:00 [INF] my-app·junk: Hello, 123 & 456!
2023-11-14 22:13:20.000 ${tzOffset}:00 [WRN] my-app·junk: Hello, 123 & 456!
2023-11-14 22:13:20.000 ${tzOffset}:00 [ERR] my-app·junk: Hello, 123 & 456!
2023-11-14 22:13:20.000 ${tzOffset}:00 [FTL] my-app·junk: Hello, 123 & 456!
`,
  );
});

Deno.test("getRotatingFileSink()", () => {
  const path = Deno.makeTempFileSync();
  const sink: Sink & Disposable = getRotatingFileSink(path, {
    maxSize: 150,
  });
  sink(debug);
  assertEquals(
    Deno.readTextFileSync(path),
    `2023-11-14 22:13:20.000 ${tzOffset}:00 [DBG] my-app·junk: Hello, 123 & 456!\n`,
  );
  sink(info);
  assertEquals(
    Deno.readTextFileSync(path),
    `\
2023-11-14 22:13:20.000 ${tzOffset}:00 [DBG] my-app·junk: Hello, 123 & 456!
2023-11-14 22:13:20.000 ${tzOffset}:00 [INF] my-app·junk: Hello, 123 & 456!
`,
  );
  sink(warning);
  assertEquals(
    Deno.readTextFileSync(path),
    `2023-11-14 22:13:20.000 ${tzOffset}:00 [WRN] my-app·junk: Hello, 123 & 456!\n`,
  );
  assertEquals(
    Deno.readTextFileSync(`${path}.1`),
    `\
2023-11-14 22:13:20.000 ${tzOffset}:00 [DBG] my-app·junk: Hello, 123 & 456!
2023-11-14 22:13:20.000 ${tzOffset}:00 [INF] my-app·junk: Hello, 123 & 456!
`,
  );
  sink(error);
  assertEquals(
    Deno.readTextFileSync(path),
    `\
2023-11-14 22:13:20.000 ${tzOffset}:00 [WRN] my-app·junk: Hello, 123 & 456!
2023-11-14 22:13:20.000 ${tzOffset}:00 [ERR] my-app·junk: Hello, 123 & 456!
`,
  );
  assertEquals(
    Deno.readTextFileSync(`${path}.1`),
    `\
2023-11-14 22:13:20.000 ${tzOffset}:00 [DBG] my-app·junk: Hello, 123 & 456!
2023-11-14 22:13:20.000 ${tzOffset}:00 [INF] my-app·junk: Hello, 123 & 456!
`,
  );
  sink(fatal);
  sink[Symbol.dispose]();
  assertEquals(
    Deno.readTextFileSync(path),
    `2023-11-14 22:13:20.000 ${tzOffset}:00 [FTL] my-app·junk: Hello, 123 & 456!\n`,
  );
  assertEquals(
    Deno.readTextFileSync(`${path}.1`),
    `\
2023-11-14 22:13:20.000 ${tzOffset}:00 [WRN] my-app·junk: Hello, 123 & 456!
2023-11-14 22:13:20.000 ${tzOffset}:00 [ERR] my-app·junk: Hello, 123 & 456!
`,
  );
  assertEquals(
    Deno.readTextFileSync(`${path}.2`),
    `\
2023-11-14 22:13:20.000 ${tzOffset}:00 [DBG] my-app·junk: Hello, 123 & 456!
2023-11-14 22:13:20.000 ${tzOffset}:00 [INF] my-app·junk: Hello, 123 & 456!
`,
  );

  const dirPath = Deno.makeTempDirSync();
  const path2 = join(dirPath, "log");
  const sink2: Sink & Disposable = getRotatingFileSink(path2, {
    maxSize: 150,
  });
  sink2(debug);
  assertEquals(
    Deno.readTextFileSync(path2),
    `2023-11-14 22:13:20.000 ${tzOffset}:00 [DBG] my-app·junk: Hello, 123 & 456!\n`,
  );
  sink2[Symbol.dispose]();
});

// cSpell: ignore filesink
