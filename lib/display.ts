const seededIds = [
  "n-plus-one",
  "connection-pool",
  "external-timeout",
  "memory-leak",
  "cache-invalidation",
  "cpu-saturation",
  "bad-env",
  "deployment-config",
];
export function incidentReference(id: string) {
  const index = seededIds.findIndex((s) => id === `inc-${s}`);
  return index >= 0
    ? `INC-${1042 + index}`
    : `INC-${id.slice(-6).toUpperCase()}`;
}
