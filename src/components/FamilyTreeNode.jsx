import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../context/LanguageContext.jsx';
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

// Track which nodes have already shown the tooltip
const shownTooltips = new Set();

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
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(false);
  const hasShownRef = useRef(false);
  
  useEffect(() => {
    // Only show tooltip once per node, and only if not expanded and has children
    if (!hasChildren || isExpanded || hasShownRef.current || shownTooltips.has(member.id)) {
      return;
    }
    
    hasShownRef.current = true;
    shownTooltips.add(member.id);
    setShowTooltip(true);
    
    // Auto-hide tooltip after 4 seconds
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 4000);
    
    return () => clearTimeout(timer);
  }, [hasChildren, isExpanded, member.id]);
  
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
    setShowTooltip(false);
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
      {/* Animated node card delivers a gentle pop-in when the branch is revealed. */}
      <motion.article
        className={`tree-node-card group relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-soft backdrop-blur transition duration-200 ease-soft-spring ${
          isFocused ? 'focused ring-2 ring-brand-400 shadow-glow-amber' : 'hover:-translate-y-1 hover:shadow-soft-xl'
        }`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDoubleClick={handleDoubleClick}
        role="button"
        tabIndex={0}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {hasChildren ? (
          <div className="node-toggle-wrapper" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)} onTouchStart={() => setShowTooltip(false)}>
            <button
              type="button"
              className={`node-toggle ${isExpanded ? 'expanded' : 'collapsed'}`}
              onClick={handleToggle}
              aria-label={toggleLabel}
            >
              {isExpanded ? '-' : '+'}
            </button>
            {showTooltip && (
              <div className="node-toggle-tooltip">
                {t('family.expandTip')}
              </div>
            )}
          </div>
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
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/55 via-transparent to-primary-100/30 opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
      </motion.article>
    </div>
  );
};

export default FamilyTreeNode;
