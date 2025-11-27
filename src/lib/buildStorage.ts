/**
 * Saved build storage utility using localStorage
 */

export interface SavedBuild {
  id: string;
  name: string;
  code: string;
  className?: string;
  ascendancyName?: string;
  level?: number;
  savedAt: number;
}

const STORAGE_KEY = 'pob-trade-saved-builds';

/**
 * Generate a unique ID for a saved build
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get all saved builds from localStorage
 */
export function getSavedBuilds(): SavedBuild[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as SavedBuild[];
  } catch {
    console.error('Failed to load saved builds');
    return [];
  }
}

/**
 * Save a build to localStorage
 */
export function saveBuild(
  name: string,
  code: string,
  buildInfo?: { className?: string; ascendancyName?: string; level?: number }
): SavedBuild {
  const builds = getSavedBuilds();

  const newBuild: SavedBuild = {
    id: generateId(),
    name,
    code,
    className: buildInfo?.className,
    ascendancyName: buildInfo?.ascendancyName,
    level: buildInfo?.level,
    savedAt: Date.now(),
  };

  builds.unshift(newBuild); // Add to beginning

  // Keep only the last 20 builds
  const trimmedBuilds = builds.slice(0, 20);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedBuilds));
  } catch {
    console.error('Failed to save build');
  }

  return newBuild;
}

/**
 * Delete a saved build by ID
 */
export function deleteBuild(id: string): void {
  const builds = getSavedBuilds();
  const filtered = builds.filter((b) => b.id !== id);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    console.error('Failed to delete build');
  }
}

/**
 * Get a saved build by ID
 */
export function getBuildById(id: string): SavedBuild | undefined {
  const builds = getSavedBuilds();
  return builds.find((b) => b.id === id);
}
