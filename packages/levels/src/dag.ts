/**
 * Lightweight curriculum prerequisite DAG & progression order.
 * Kept separate from level bundle contents so WorldMapLayout and router
 * never pull level markdown/manifests into the initial shell bundle.
 */
export const LEVEL_PREREQUISITES: Record<string, string[]> = {
  'w1-robot-farm-1.1': [],
  'w1-robot-farm-1.2': ['w1-robot-farm-1.1'],
  'w1-robot-farm-1.3': ['w1-robot-farm-1.2'],
  'w1-robot-farm-1.4': ['w1-robot-farm-1.3'],
  'w1-robot-farm-1.5': ['w1-robot-farm-1.4'],
};

const LEVEL_ORDER: readonly string[] = Object.keys(LEVEL_PREREQUISITES);

/**
 * Returns the next level ID in the progression sequence, or undefined if at the end or unknown.
 */
export function getNextLevelId(id: string): string | undefined {
  const index = LEVEL_ORDER.indexOf(id);
  if (index === -1 || index + 1 >= LEVEL_ORDER.length) {
    return undefined;
  }
  return LEVEL_ORDER[index + 1];
}

/**
 * Returns true if the given levelId exists in the prerequisite DAG and all of its
 * prerequisites are present in completedLevelIds.
 */
export function isLevelUnlocked(levelId: string, completedLevelIds: Set<string>): boolean {
  const prerequisites = LEVEL_PREREQUISITES[levelId];
  if (!prerequisites) {
    return false;
  }
  return prerequisites.every((prereqId) => completedLevelIds.has(prereqId));
}
