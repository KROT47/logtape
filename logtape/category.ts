export type Category = string | readonly Category[];

export type MaybeCategory =
  | string
  | null
  | undefined
  | readonly MaybeCategory[];

export type CategoryList = readonly string[];

export type MaybeCategoryList = readonly (string | null | undefined)[];

export function getCategoryList<T extends Category | MaybeCategory>(
  category: T,
): T extends Category ? CategoryList : MaybeCategoryList {
  return deepFlatten(category);
}

function deepFlatten(arr: Category | MaybeCategory): string[] {
  if (typeof arr === "string") return [arr];
  if (!arr) return [];
  return arr.flatMap((item) => (
    typeof item === "string" ? [item] : deepFlatten(item)
  ));
}
