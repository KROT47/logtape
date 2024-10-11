type PlainObject = { [key: string]: unknown };

type Colors = {
  string: string;
  number: string;
  boolean: string;
  function: string;
  reset: string;
};

const baseColors: Colors = {
  string: "\x1b[32m", // Green for strings
  number: "\x1b[33m", // Yellow for numbers
  boolean: "\x1b[35m", // Magenta for booleans
  function: "\x1b[34m", // Blue for functions
  reset: "\x1b[39m", // Reset color
};

function tryAddColors(
  value: string,
  colors: Colors | false,
  type: keyof Colors,
): string {
  return colors ? `${colors[type]}${value}${colors.reset}` : value;
}

export function inspect(value: unknown, options: {
  depth?: number;
  showHidden?: boolean;
  colors?: boolean | Partial<Colors>;
} = {}): string {
  const { depth = 5, showHidden = false, colors: withColors = false } = options;
  const colors = withColors
    ? {
      ...baseColors,
      ...(typeof withColors === "object" ? withColors : {}),
    }
    : false;

  const seen = new WeakSet<PlainObject>();

  const formatValue = (val: unknown, currentDepth: number): string => {
    if (currentDepth > depth) {
      return "[Object]"; // Prevent deep nesting
    }

    if (val === null) {
      return "null";
    }

    if (typeof val === "undefined") {
      return "undefined";
    }

    if (typeof val === "function") {
      return tryAddColors(`[Function: ${val.name}]`, colors, "function");
    }

    if (typeof val === "string") {
      return tryAddColors(`"${val}"`, colors, "string");
    }

    if (typeof val === "number") {
      return tryAddColors(String(val), colors, "number");
    }

    if (typeof val === "boolean") {
      return tryAddColors(String(val), colors, "boolean");
    }

    if (seen.has(val as PlainObject)) {
      return "[Circular]";
    }

    seen.add(val as PlainObject);

    if (Array.isArray(val)) {
      const items = val.map((item) => formatValue(item, currentDepth + 1));
      return `[${items.join(", ")}]`;
    }

    const props = Object.entries(val)
      .filter(([key]) => showHidden || !key.startsWith("_")) // Filter hidden properties
      .map(([key, value]) => `${key}: ${formatValue(value, currentDepth + 1)}`);

    return `{ ${props.join(", ")} }`;
  };

  return formatValue(value, 0);
}
