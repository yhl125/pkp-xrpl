type ValueOf<T> = T[keyof T]

/**
 * Creates an object composed of the own and inherited enumerable string keyed properties of object that
 * predicate doesn't return truthy for.
 *
 * @param obj - Object to have properties removed.
 * @param predicate - function that returns whether the property should be removed from the obj.
 *
 * @returns object
 */
export function omitBy<T extends object>(
  obj: T,
  predicate: (objElement: ValueOf<T>, k: string | number | symbol) => boolean,
): Partial<T> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- We know the keys are properties of T
  const keys: Array<keyof T> = Object.keys(obj) as Array<keyof T>
  const keysToKeep = keys.filter((kb) => !predicate(obj[kb], kb))
  return keysToKeep.reduce((acc: Partial<T>, key: keyof T) => {
    acc[key] = obj[key]
    return acc
  }, {})
}
