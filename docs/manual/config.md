Configuration
=============

> [!WARNING]
> If you are authoring a library, you should not set up LogTape in the library
> itself.  It is up to the application to set up LogTape.
>
> See also [*Using in libraries*](./library.md).

Setting up LogTape for your application is a crucial step in implementing
effective logging.  The `configure()` function is your main tool for this task.
Let's explore how to use it to tailor LogTape to your specific needs.

At its core, configuring LogTape involves three main components:

 -  [*Sinks*](./sinks.md): Where your logs will be sent
 -  [*Filters*](./filters.md): Rules for which logs should be processed
 -  *Loggers*: The logging instances for different parts of your application

Here's a simple configuration to get you started:

~~~~ typescript
import { configure, getConsoleSink } from "@logtape/logtape";

await configure({
  sinks: {
    console: getConsoleSink(),
  },
  loggers: [
    {
      category: "my-app",
      level: "info",
      sinks: ["console"],
    },
  ],
});
~~~~

This setup will log all `"info"` level and above messages from the `["my-app"]`
&nbsp;[category](./categories.md) to the console.


Crafting your configuration
---------------------------

> [!NOTE]
> The `configure()` is an asynchronous function.  Always use `await` or handle
> the returned `Promise` appropriately.


### Setting up sinks

[Sinks](./sinks.md) determine where your logs end up. You can have multiple
sinks for different purposes:

~~~~ typescript
import { configure, getConsoleSink, getFileSink } from "@logtape/logtape";

await configure({
  sinks: {
    console: getConsoleSink(),
    file: getFileSink("app.log"),
    errorFile: getFileSink("error.log"),
  },
  // ... rest of configuration
});
~~~~

### Defining Filters

[Filters](./filters.md) allow you to fine-tune which logs are processed. They
can be based on log levels, content, or custom logic:

~~~~ typescript
await configure({
  // ... sinks configuration
  filters: {
    noDebug(record) {
      return record.level !== "debug";
    },
    onlyErrors(record) {
      return record.level === "error" || record.level === "fatal";
    },
    containsUserData(record) {
      return record.message.some(part => part.includes("user"));
    },
  },
  // ... loggers configuration
});
~~~~

### Configuring Loggers

Loggers are where you bring everything together.  You can set up different
loggers for different parts of your application:

~~~~ typescript
await configure({
  // ... sinks and filters configuration
  loggers: [
    {
      category: "my-app",
      level: "info",
      sinks: ["console", "file"],
    },
    {
      category: ["my-app", "database"],
      level: "debug",
      sinks: ["file"],
      filters: ["noDebug"],
    },
    {
      category: ["my-app", "user-service"],
      level: "info",
      sinks: ["console", "file"],
      filters: ["containsUserData"],
    },
  ],
});
~~~~

For severity levels,
see [*Configuring severity levels*](./levels.md#configuring-severity-levels).

### Disposal of resources

If sinks or filters implement the `Disposal` or `AsyncDisposal` interface,
they will be properly disposed when
[resetting the configuration](#reconfiguration) or when the application exits.


Advanced configuration techniques
---------------------------------

### Using environment variables

It's often useful to change your logging configuration based on the environment.
Here's how you might do that:

::: code-group

~~~~ typescript [Deno]
const isDevelopment = Deno.env.get("DENO_DEPLOYMENT_ID") == null;

await configure({
  sinks: {
    console: getConsoleSink(),
    file: getFileSink(isDevelopment ? "dev.log" : "prod.log"),
  },
  loggers: [
    {
      category: "my-app",
      level: isDevelopment ? "debug" : "info",
      sinks: isDevelopment ? ["console", "file"] : ["file"],
    },
  ],
});
~~~~

~~~~ typescript [Node]
const isDevelopment = process.env.NODE_ENV === "development";

await configure({
  sinks: {
    console: getConsoleSink(),
    file: getFileSink(isDevelopment ? "dev.log" : "prod.log"),
  },
  loggers: [
    {
      category: "my-app",
      level: isDevelopment ? "debug" : "info",
      sinks: isDevelopment ? ["console", "file"] : ["file"],
    },
  ],
});
~~~~

:::

### Reconfiguration

Remember that calling `configure()` will reset any existing configuration.
If you need to change the configuration at runtime, you can call `configure()`
again with the new settings.

~~~~ typescript
// Initial configuration
await configure(initialConfig);

// Later in your application...
await configure({
  ...existingConfig,
  loggers: [
    ...existingConfig.loggers,
    {
      category: "new-feature",
      level: "debug",
      sinks: ["console"],
    },
  ],
});
~~~~

Or you can explicitly call `reset()` to clear the existing configuration:

~~~~ typescript
import { configure, reset } from "@logtape/logtape";

await configure(initialConfig);

// Later in your application...

reset();
~~~~


Best practices
--------------

 1. *Configure early*: Set up your LogTape configuration early in your
    application's lifecycle, ideally before any logging calls are made.
 2. [*Use categories wisely*](./categories.md): Create a logical hierarchy with
    your categories to make filtering and management easier.
 3. *Configure for different environments*: Have different configurations for
    development, testing, and production.
 4. *Don't overuse filters*: While powerful, too many filters can make
    your logging system complex and hard to maintain.
 5. *Monitor performance*: Be mindful of the performance impact of your logging,
    especially in production environments.