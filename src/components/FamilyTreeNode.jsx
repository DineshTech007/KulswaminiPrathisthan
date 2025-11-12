import { resolveImageUrl } from '../utils/apiClient.js';

const CARD_WIDTH = 160;

const getInitials = (name) => {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const FamilyTreeNode = ({
  member,
  onPress,
  left,
  top,
  hasChildren = false,
  isExpanded = false,
  onToggleExpand,
  hiddenChildrenCount = 0,
  isFocused = false,
}) => {
  const imageUrl = member.notes?.match(/Image:\s*(.*?)(?:\s*\||$)/)?.[1]?.trim();

  const handleClick = (event) => {
    event.stopPropagation();
    if (onPress) {
      onPress(member);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick(event);
    }
  };

  const handleToggle = (event) => {
    event.stopPropagation();
    if (onToggleExpand) {
      onToggleExpand();
    }
  };

  const handleDoubleClick = (event) => {
    if (!hasChildren || !onToggleExpand) {
      return;
    }
    event.stopPropagation();
    onToggleExpand();
  };

  const toggleLabel = isExpanded
    ? 'Collapse branch'
    : hiddenChildrenCount > 0
      ? `Expand branch (${hiddenChildrenCount} hidden)`
      : 'Expand branch';

  return (
    <div
      className="tree-node"
      style={{ left, top, width: CARD_WIDTH }}
      role="presentation"
    >
      <div
        className={`tree-node-card${isFocused ? ' focused' : ''}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDoubleClick={handleDoubleClick}
        role="button"
        tabIndex={0}
      >
        {hasChildren ? (
          <button
            type="button"
            className={`node-toggle ${isExpanded ? 'expanded' : 'collapsed'}`}
            onClick={handleToggle}
            aria-label={toggleLabel}
          >
            {isExpanded ? '-' : '+'}
          </button>
        ) : null}
        <div className="node-avatar">
          {imageUrl ? (
            <img src={resolveImageUrl(imageUrl)} alt="Member" />
          ) : (
            <span>{getInitials(member.name)}</span>
          )}
        </div>
        <div className="node-name" title={member.name}>
          {member.name || 'Unknown'}
        </div>
        <div className="node-badge">Gen {member.generation}</div>
        {hasChildren && !isExpanded && hiddenChildrenCount > 0 ? (
          <div className="node-collapsed-count" aria-hidden="true">+{hiddenChildrenCount}</div>
        ) : null}
      </div>
    </div>
  );
};

export default FamilyTreeNode;
