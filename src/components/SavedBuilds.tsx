import { useState, useEffect } from 'react';
import { getSavedBuilds, deleteBuild, type SavedBuild } from '../lib/buildStorage';

interface SavedBuildsProps {
  onSelectBuild: (code: string) => void;
}

export function SavedBuilds({ onSelectBuild }: SavedBuildsProps) {
  const [builds, setBuilds] = useState<SavedBuild[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setBuilds(getSavedBuilds());
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteBuild(id);
    setBuilds(getSavedBuilds());
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (builds.length === 0) {
    return null;
  }

  return (
    <div className="saved-builds">
      <button
        type="button"
        className="saved-builds-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? '▼' : '▶'} Saved Builds ({builds.length})
      </button>

      {isExpanded && (
        <div className="saved-builds-list">
          {builds.map((build) => (
            <div
              key={build.id}
              className="saved-build-item"
              onClick={() => onSelectBuild(build.code)}
            >
              <div className="saved-build-info">
                <span className="saved-build-name">{build.name}</span>
                {build.ascendancyName && (
                  <span className="saved-build-class">
                    {build.ascendancyName}
                    {build.level && ` (${build.level})`}
                  </span>
                )}
                <span className="saved-build-date">{formatDate(build.savedAt)}</span>
              </div>
              <button
                type="button"
                className="saved-build-delete"
                onClick={(e) => handleDelete(build.id, e)}
                title="Delete build"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
