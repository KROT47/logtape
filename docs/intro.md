# What is LogTape?

LogTape is a logging library for JavaScript and TypeScript. It provides a
simple and flexible logging system that is easy to use and easy to extend.
The highlights of LogTape are:

- _Zero dependencies_: LogTape has zero dependencies. You can use LogTape
  without worrying about the dependencies of LogTape.

- [_Library support_](./manual/library.md): LogTape is designed to be used
  in libraries as well as applications. You can use LogTape in libraries
  to provide logging capabilities to users of the libraries.

- [_Runtime diversity_](./manual/install.md): LogTape supports [Deno],
  [Node.js], [Bun], edge functions, and browsers. You can use LogTape in
  various environments without changing the code.

- [_Hierarchical categories_](./manual/categories.md): LogTape uses
  a hierarchical category system to manage loggers. You can control
  the verbosity of log messages by setting the log level of loggers at
  different levels of the category hierarchy.

- [_Template literals_](./manual/start.md#how-to-log): LogTape supports
  template literals for log messages. You can use template literals to log
  messages with placeholders and values.

- [_Dead simple sinks_](./manual/sinks.md): You can easily add your own sinks
  to LogTape.

![](./screenshots/web-console.png)
![](./screenshots/terminal-console.png)

[Deno]: https://deno.com/
[Node.js]: https://nodejs.org/
[Bun]: https://bun.sh/
