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

const FamilyTreeNode = ({ member, onPress, left, top }) => {
  const imageUrl = member.notes?.match(/Image:\s*(.*?)(?:\s*\||$)/)?.[1]?.trim();

  const handleClick = (event) => {
    event.stopPropagation();
    if (onPress) {
      onPress(member);
    }
  };

  const handlePointerDown = (event) => {
    event.stopPropagation();
  };

  return (
    <div
      className="tree-node"
      style={{ left, top, width: CARD_WIDTH }}
      role="presentation"
    >
      <button 
        type="button" 
        className="tree-node-card" 
        onClick={handleClick}
        onPointerDown={handlePointerDown}
      >
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
      </button>
    </div>
  );
};

export default FamilyTreeNode;
