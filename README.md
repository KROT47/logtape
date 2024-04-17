<!-- deno-fmt-ignore-file -->

LogTape
=======

[![GitHub Actions][GitHub Actions badge]][GitHub Actions]
[![Codecov][Codecov badge]][Codecov]

> [!NOTE]
> LogTape is still in the early stage of development.  The API is not stable
> yet.  Please be careful when using it in production.

LogTape is a simple logging library for Deno/Node.js/Bun/browsers.  It is
designed to be used for both applications and libraries.

Currently, LogTape provides only few sinks, but you can easily add your own
sinks.

![](./screenshots/web-console.png)
![](./screenshots/terminal-console.png)

[GitHub Actions]: https://github.com/dahlia/logtape/actions/workflows/main.yaml
[GitHub Actions badge]: https://github.com/dahlia/logtape/actions/workflows/main.yaml/badge.svg
[Codecov]: https://codecov.io/gh/dahlia/logtape
[Codecov badge]: https://codecov.io/gh/dahlia/logtape/graph/badge.svg?token=yOejfcuX7r


Installation
------------

### Deno

~~~~ sh
deno add @logtape/logtape
~~~~

### Node.js

~~~~ sh
npm add @logtape/logtape
~~~~

### Bun

~~~~ sh
bun add @logtape/logtape
~~~~


Quick start
-----------

Set up LogTape in the entry point of your application (if you are composing
a library, you should not set up LogTape in the library itself; it is up to
the application to set up LogTape):

~~~~ typescript
import { configure, getConsoleSink } from "@logtape/logtape";

configure({
  sinks: { console: getConsoleSink() },
  filters: {},
  loggers: [
    { category: "my-app", level: "debug", sinks: ["console"] }
  ]
});
~~~~

And then you can use LogTape in your application or library:

~~~~ typescript
import { getLogger } from "@logtape/logtape";

const logger = getLogger(["my-app", "my-module"]);

export function myFunc(value: number): void {
  logger.debug `Hello, ${value}!`;
}
~~~~


How to log
----------

There are total 5 log levels: `debug`, `info`, `warning`, `error`, `fatal` (in
the order of verbosity).  You can log messages with the following syntax:

~~~~ typescript
logger.debug `This is a debug message with ${value}.`;
logger.info  `This is an info message with ${value}.`;
logger.warn  `This is a warning message with ${value}.`;
logger.error `This is an error message with ${value}.`;
logger.fatal `This is a fatal message with ${value}.`;
~~~~

You can also log messages with a function call:

~~~~ typescript
logger.debug("This is a debug message with {value}.", { value });
logger.info("This is an info message with {value}.", { value });
logger.warn("This is a warning message with {value}.", { value });
logger.error("This is an error message with {value}.", { value });
logger.fatal("This is a fatal message with {value}.", { value });
~~~~

Sometimes, values to be logged are expensive to compute.  In such cases, you
can use a function to defer the computation so that it is only computed when
the log message is actually logged:

~~~~ typescript
logger.debug(l => l`This is a debug message with ${computeValue()}.`);
logger.debug("Or you can use a function call: {value}.", () => {
  return { value: computeValue() };
});
~~~~


Categories
----------

LogTape uses a hierarchical category system to manage loggers.  A category is
a list of strings.  For example, `["my-app", "my-module"]` is a category.

When you log a message, it is dispatched to all loggers whose categories are
prefixes of the category of the logger.  For example, if you log a message
with the category `["my-app", "my-module", "my-submodule"]`, it is dispatched
to loggers whose categories are `["my-app", "my-module"]` and `["my-app"]`.

This behavior allows you to control the verbosity of log messages by setting
the log level of loggers at different levels of the category hierarchy.


Sinks
-----

A sink is a destination of log messages.  LogTape currently provides a few
sinks: console and stream.  However, you can easily add your own sinks.
The signature of a sink is:

~~~~ typescript
export type Sink = (record: LogRecord) => void;
~~~~

Here's a simple example of a sink that writes log messages to console:

~~~~ typescript
import { configure } from "@logtape/logtape";

configure({
  sinks: {
    console(record) {
      console.log(record.message);
    }
  },
  // Omitted for brevity
});
~~~~

Of course, you don't have to implement your own console sink because LogTape
provides a console sink:

~~~~ typescript
import { configure, getConsoleSink } from "@logtape/logtape";

configure({
  sinks: {
    console: getConsoleSink(),
  },
  // Omitted for brevity
});
~~~~

Another built-in sink is a stream sink.  It writes log messages to
a [`WritableStream`].  Here's an example of a stream sink that writes log
messages to the standard error:

~~~~ typescript
// Deno:
const stderrSink = getStreamSink(Deno.stderr.writable);
~~~~

~~~~ typescript
// Node.js:
import stream from "node:stream";
const stderrSink = getStreamSink(stream.Writable.toWeb(process.stderr));
~~~~

> [!NOTE]
> Here we use `WritableStream` from the Web Streams API.  If you are using
> Node.js, you cannot directly pass `process.stderr` to `getStreamSink` because
> `process.stderr` is not a `WritableStream` but a [`Writable`], which is a
> Node.js stream.  You can use [`Writable.toWeb()`] method to convert a Node.js
> stream to a `WritableStream`.

[`WritableStream`]: https://developer.mozilla.org/en-US/docs/Web/API/WritableStream
[`Writable`]: https://nodejs.org/api/stream.html#class-streamwritable
[`Writable.toWeb()`]: https://nodejs.org/api/stream.html#streamwritabletowebstreamwritable
