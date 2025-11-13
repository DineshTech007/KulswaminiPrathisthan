import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import FamilyTreeNode from './FamilyTreeNode.jsx';
import MemberDetailModal from './MemberDetailModal.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import { useLanguage, useTranslation } from '../context/LanguageContext.jsx';
import { apiFetch, resolveImageUrl, uploadImageFile } from '../utils/apiClient.js';
import '../styles/family-tree.css';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 200;
const HORIZONTAL_GAP = 90;
const VERTICAL_GAP = 150;
const CANVAS_PADDING = 400;
const INITIAL_SCALE = 0.85;
const MIN_SCALE = 0.15;
const MAX_SCALE = 2.1;
const MIN_LOADING_DURATION_MS = 750;
const MAX_CANVAS_DIMENSION = 12000;
const BATCH_SIZE = 60;

const DEFAULT_LAYOUT = { nodes: [], lines: [], width: 400, height: 400 };

const computeLayout = (members) => {
  if (!Array.isArray(members) || members.length === 0) {
    return DEFAULT_LAYOUT;
  }

  const membersMap = new Map();
  members.forEach((member) => {
    if (member && member.id) {
      membersMap.set(member.id, member);
    }
  });

  if (membersMap.size === 0) {
    return DEFAULT_LAYOUT;
  }

  const memberList = Array.from(membersMap.values());
  const minGeneration = Math.min(...memberList.map((member) => member.generation ?? 1));

  const positions = {};
  let nextX = 0;
  const visited = new Set();
  const visiting = new Set();

  const roots = memberList.filter((member) => !member.parentIds || member.parentIds.length === 0);
  const fallbackRoots = memberList.filter(
    (member) => (member.generation ?? minGeneration) === minGeneration
  );
  const startNodes = roots.length > 0 ? roots : fallbackRoots;

  const traverse = (member) => {
    if (!member) {
      return 0;
    }

    if (visited.has(member.id)) {
      return positions[member.id].x;
    }

    if (visiting.has(member.id)) {
      return positions[member.id]?.x ?? nextX;
    }

    visiting.add(member.id);

    const childIds = (member.childrenIds || []).filter((childId) => membersMap.has(childId));
    const childXs = [];

    childIds.forEach((childId) => {
      const childMember = membersMap.get(childId);
      if (!childMember) {
        return;
      }
      const childX = traverse(childMember);
      childXs.push(childX);
    });

    let x;
    if (childXs.length === 0) {
      x = nextX;
      nextX += 1;
    } else {
      const minChildX = Math.min(...childXs);
      const maxChildX = Math.max(...childXs);
      x = (minChildX + maxChildX) / 2;
    }

    const depth = (member.generation ?? minGeneration) - minGeneration;

    positions[member.id] = { x, depth };

    visiting.delete(member.id);
    visited.add(member.id);
    return x;
  };

  startNodes.forEach((root) => {
    traverse(root);
  });

  memberList.forEach((member) => {
    if (!positions[member.id]) {
      traverse(member);
    }
  });

  const positionValues = Object.values(positions);
  if (positionValues.length === 0) {
    return DEFAULT_LAYOUT;
  }

  const xs = positionValues.map((pos) => pos.x);
  const depths = positionValues.map((pos) => pos.depth);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minDepth = Math.min(...depths);
  const maxDepth = Math.max(...depths);

  const columnSize = NODE_WIDTH + HORIZONTAL_GAP;
  const rowSize = NODE_HEIGHT + VERTICAL_GAP;

  const contentWidth = (maxX - minX + 1) * columnSize + CANVAS_PADDING;
  const contentHeight = (maxDepth - minDepth + 1) * rowSize + CANVAS_PADDING;

  const nodes = memberList
    .map((member) => {
      const pos = positions[member.id];
      if (!pos) {
        return null;
      }
      const normalizedX = pos.x - minX;
      const normalizedDepth = pos.depth - minDepth;

      const left = normalizedX * columnSize + CANVAS_PADDING / 2;
      const top = normalizedDepth * rowSize + CANVAS_PADDING / 2;

      return {
        member,
        left,
        top,
        centerX: left + NODE_WIDTH / 2,
        centerY: top + NODE_HEIGHT / 2,
      };
    })
    .filter(Boolean);

  const nodeLookup = new Map(nodes.map((node) => [node.member.id, node]));
  const lines = [];

  nodes.forEach((node) => {
    const { member, centerX, centerY } = node;
    (member.childrenIds || []).forEach((childId) => {
      const childNode = nodeLookup.get(childId);
      if (!childNode) {
        return;
      }

      const startX = centerX;
      const startY = centerY + NODE_HEIGHT / 2;
      const endX = childNode.centerX;
      const endY = childNode.centerY - NODE_HEIGHT / 2;
      const midY = (startY + endY) / 2;

      lines.push({
        key: `${member.id}-${childId}`,
        path: `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`,
      });
    });
  });

  return {
    nodes,
    lines,
    width: contentWidth,
    height: contentHeight,
  };
};

const scalePathString = (path, factor) =>
  typeof path === 'string'
    ? path.replace(/-?\d*\.?\d+/g, (num) => String(parseFloat(num) * factor))
    : path;

const clampLayoutDimensions = (layout) => {
  if (!layout || !layout.width || !layout.height) return layout;
  const maxDim = Math.max(layout.width, layout.height);
  if (maxDim <= MAX_CANVAS_DIMENSION) return layout;
  const factor = MAX_CANVAS_DIMENSION / maxDim;
  const nodes = (layout.nodes || []).map((n) => ({
    member: n.member,
    left: n.left * factor,
    top: n.top * factor,
    centerX: n.centerX * factor,
    centerY: n.centerY * factor,
  }));
  const lines = (layout.lines || []).map((l) => ({
    key: l.key,
    path: scalePathString(l.path, factor),
  }));
  return {
    nodes,
    lines,
    width: layout.width * factor,
    height: layout.height * factor,
  };
};

const FamilyTree = ({ data, onDataUpdated, isAdmin = false, adminToken = '', onLoginSuccess, onLogout, siteTitle = 'कुलस्वामिनी प्रतिष्ठान,बार्शी ', siteFavicon = '', onSettingsUpdated, onToggleSidebar, role }) => {
  const containerRef = useRef(null);
  const canvasWrapperRef = useRef(null);
  const canvasRef = useRef(null);

  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [layoutReady, setLayoutReady] = useState(false);
  const [minWaitElapsed, setMinWaitElapsed] = useState(false);
  const [visibleNodes, setVisibleNodes] = useState([]);
  const [visibleLines, setVisibleLines] = useState([]);
  const [mountedCount, setMountedCount] = useState(0);
  const [mountDone, setMountDone] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [viewportSize, setViewportSize] = useState({ width: 1200, height: 800 });
  const [transform, setTransform] = useState({ scale: INITIAL_SCALE, x: 0, y: 0 });
  const transformRef = useRef(transform);
  const [initialViewApplied, setInitialViewApplied] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState(() => new Set());
  const [focusMemberId, setFocusMemberId] = useState(null);
  const [pendingFocusMemberId, setPendingFocusMemberId] = useState(null);
  const [focusedBranchMemberIds, setFocusedBranchMemberIds] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showSearchTooltip, setShowSearchTooltip] = useState(true);
  const { t } = useTranslation();
  const { language } = useLanguage();

  const pointerStateRef = useRef({
    active: false,
    pointerId: null,
    originX: 0,
    originY: 0,
    baseX: 0,
    baseY: 0,
    hasDragged: false,
  });

  // Auto-hide search tooltip after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSearchTooltip(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const relationMaps = useMemo(() => {
    if (!Array.isArray(data)) {
      return {
        memberMap: new Map(),
        childrenMap: new Map(),
        parentMap: new Map(),
        rootIds: [],
      };
    }

    const memberMap = new Map();
    const orderMap = new Map();
    data.forEach((member, index) => {
      if (member && member.id) {
        memberMap.set(member.id, member);
        orderMap.set(member.id, index);
      }
    });

    const childrenSetMap = new Map();
    const parentSetMap = new Map();

    const addRelation = (parentId, childId) => {
      if (!memberMap.has(parentId) || !memberMap.has(childId)) {
        return;
      }
      if (!childrenSetMap.has(parentId)) {
        childrenSetMap.set(parentId, new Set());
      }
      if (!parentSetMap.has(childId)) {
        parentSetMap.set(childId, new Set());
      }
      childrenSetMap.get(parentId).add(childId);
      parentSetMap.get(childId).add(parentId);
    };

    data.forEach((member) => {
      if (!member || !member.id) {
        return;
      }
      const childrenIds = Array.isArray(member.childrenIds) ? member.childrenIds : [];
      childrenIds.forEach((childId) => addRelation(member.id, childId));
    });

    data.forEach((member) => {
      if (!member || !member.id) {
        return;
      }
      const parentIds = Array.isArray(member.parentIds) ? member.parentIds : [];
      parentIds.forEach((parentId) => addRelation(parentId, member.id));
    });

    const childrenMap = new Map();
    childrenSetMap.forEach((set, parentId) => {
      childrenMap.set(
        parentId,
        Array.from(set).filter((childId) => memberMap.has(childId))
      );
    });

    const parentMap = new Map();
    parentSetMap.forEach((set, childId) => {
      parentMap.set(
        childId,
        Array.from(set).filter((parentId) => memberMap.has(parentId))
      );
    });

    const rootIds = [];
    memberMap.forEach((member, memberId) => {
      const parents = parentMap.get(memberId);
      if (!parents || parents.length === 0) {
        rootIds.push(memberId);
      }
    });

    return { memberMap, childrenMap, parentMap, rootIds, orderMap };
  }, [data]);

  const visibleMembers = useMemo(() => {
    const { memberMap, childrenMap, rootIds } = relationMaps;
    if (!memberMap || memberMap.size === 0) {
      return [];
    }

    const queue = [...(rootIds.length > 0 ? rootIds : Array.from(memberMap.keys()))];
    const visited = new Set();
    const visible = [];
    const restrictToBranch = focusedBranchMemberIds && focusedBranchMemberIds.size > 0;

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!memberMap.has(currentId) || visited.has(currentId)) {
        continue;
      }

      if (restrictToBranch && !focusedBranchMemberIds.has(currentId)) {
        continue;
      }

      visited.add(currentId);
      visible.push(memberMap.get(currentId));

      const shouldExpand = expandedNodes.has(currentId);
      if (!shouldExpand) {
        continue;
      }

      const children = childrenMap.get(currentId) || [];
      children.forEach((childId) => {
        if (!visited.has(childId)) {
          if (!restrictToBranch || focusedBranchMemberIds.has(childId)) {
            queue.push(childId);
          }
        }
      });
    }

    visible.sort((a, b) => {
      const aIndex = relationMaps.orderMap.get(a.id) ?? 0;
      const bIndex = relationMaps.orderMap.get(b.id) ?? 0;
      return aIndex - bIndex;
    });

    return visible;
  }, [relationMaps, expandedNodes, focusedBranchMemberIds]);

  useEffect(() => {
    setExpandedNodes((prev) => {
      const { memberMap } = relationMaps;
      const next = new Set();
      prev.forEach((id) => {
        if (memberMap.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
    setFocusedBranchMemberIds((prev) => {
      if (!prev) {
        return prev;
      }
      const { memberMap } = relationMaps;
      const next = new Set();
      prev.forEach((id) => {
        if (memberMap.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [relationMaps]);

  const visibleMemberIds = useMemo(() => (
    new Set(visibleMembers.map((member) => member?.id).filter(Boolean))
  ), [visibleMembers]);

  const activePointersRef = useRef(new Map());
  const pinchStateRef = useRef({
    active: false,
    initialDistance: 0,
    initialScale: INITIAL_SCALE,
    centerX: 0,
    centerY: 0,
  });

  const isInteractivePointerTarget = (target) => {
    if (!target) {
      return false;
    }
    return Boolean(
      target.closest(
        '.tree-node-card, .node-toggle, .search-container, .zoom-control-panel, .menu-button, .header-actions, .language-switcher'
      )
    );
  };

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const clampScale = useCallback((value) => (
    Math.max(MIN_SCALE, Math.min(MAX_SCALE, value))
  ), []);

  const zoomAroundPoint = useCallback((desiredScale, viewportX, viewportY) => {
    setTransform((prev) => {
      const nextScale = clampScale(desiredScale);
      if (nextScale === prev.scale) {
        return prev;
      }
      const anchorX = (viewportX - prev.x) / prev.scale;
      const anchorY = (viewportY - prev.y) / prev.scale;
      const nextX = viewportX - anchorX * nextScale;
      const nextY = viewportY - anchorY * nextScale;
      return { scale: nextScale, x: nextX, y: nextY };
    });
  }, [clampScale]);

  const zoomAroundViewportCenter = useCallback((desiredScale) => {
    const wrapperRect = canvasWrapperRef.current?.getBoundingClientRect();
    if (!wrapperRect) {
      return;
    }
    zoomAroundPoint(desiredScale, wrapperRect.width / 2, wrapperRect.height / 2);
  }, [zoomAroundPoint]);

  const handleZoomIn = useCallback(() => {
    const currentScale = transformRef.current.scale;
    zoomAroundViewportCenter(currentScale * 1.15);
  }, [zoomAroundViewportCenter]);

  const handleZoomOut = useCallback(() => {
    const currentScale = transformRef.current.scale;
    zoomAroundViewportCenter(currentScale * 0.85);
  }, [zoomAroundViewportCenter]);

  const handleResetView = useCallback(() => {
    const initialScale = INITIAL_SCALE;
    const wrapper = canvasWrapperRef.current;
    const viewportWidth = wrapper ? wrapper.clientWidth : viewportSize.width;
    const viewportHeight = wrapper ? wrapper.clientHeight : viewportSize.height;
    const nextX = viewportWidth / 2 - (layout.width * initialScale) / 2;
    const nextY = viewportHeight / 2 - (layout.height * initialScale) / 2;
    setTransform({ scale: initialScale, x: nextX, y: nextY });
  }, [layout.height, layout.width, viewportSize.height, viewportSize.width]);

  const handleZoomReset = useCallback(() => {
    handleResetView();
  }, [handleResetView]);

  const toggleNodeExpansion = useCallback((memberId) => {
    if (!memberId) {
      return;
    }
    // Don't reset focusedBranchMemberIds when toggling - just expand/collapse
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  }, []);

  const buildBranchForMember = useCallback((memberId) => {
    const { parentMap, childrenMap, memberMap } = relationMaps;
    const branch = new Set();
    if (!memberId || !memberMap.has(memberId)) {
      return branch;
    }

    const visitAncestors = (currentId) => {
      if (!currentId || branch.has(currentId)) {
        return;
      }
      branch.add(currentId);
      const parents = parentMap.get(currentId) || [];
      parents.forEach(visitAncestors);
    };

    const visitDescendants = (currentId) => {
      const children = childrenMap.get(currentId) || [];
      children.forEach((childId) => {
        if (!branch.has(childId)) {
          branch.add(childId);
          visitDescendants(childId);
        }
      });
    };

    visitAncestors(memberId);
    visitDescendants(memberId);
    return branch;
  }, [relationMaps]);

  const focusMemberById = useCallback((memberId) => {
    if (!memberId || !relationMaps.memberMap.has(memberId)) {
      return;
    }
    const branch = buildBranchForMember(memberId);
    setFocusedBranchMemberIds(branch);
    setExpandedNodes(new Set(branch));
    setPendingFocusMemberId(memberId);
    setFocusMemberId(memberId);
  }, [buildBranchForMember, relationMaps]);

  const summary = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return { totalMembers: 0, minGeneration: 1, maxGeneration: 1, totalGenerations: 0 };
    }
    const generations = data
      .map((member) => (member && Number.isFinite(member.generation) ? member.generation : 1))
      .filter((value) => Number.isFinite(value));
    if (generations.length === 0) {
      return { totalMembers: data.length, minGeneration: 1, maxGeneration: 1, totalGenerations: 1 };
    }
    const minGeneration = Math.min(...generations);
    const maxGeneration = Math.max(...generations);
    return {
      totalMembers: data.length,
      minGeneration,
      maxGeneration,
      totalGenerations: maxGeneration - minGeneration + 1,
    };
  }, [data]);

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setViewportSize({ width, height });
      }
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => setMinWaitElapsed(true), MIN_LOADING_DURATION_MS);
    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!Array.isArray(visibleMembers) || visibleMembers.length === 0) {
      setLayout(DEFAULT_LAYOUT);
      setLayoutReady(true);
      setInitialViewApplied(false);
      return () => {
        cancelled = true;
      };
    }

    setLayoutReady(false);
    // Don't reset initialViewApplied when expanding/collapsing - keep user's current zoom/pan

    const frameId = window.requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }
      try {
        const computed = clampLayoutDimensions(computeLayout(visibleMembers));
        setLayout(computed);
        setLayoutReady(true);
      } catch (error) {
        console.error('Failed to compute layout', error);
        setLayout(DEFAULT_LAYOUT);
        setLayoutReady(true);
      }
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [visibleMembers]);

  useEffect(() => {
    if (!layoutReady) {
      return;
    }

    const nodes = layout.nodes || [];
    const lines = layout.lines || [];
    let index = 0;
    let rafId = null;

    setVisibleNodes([]);
    setVisibleLines([]);
    setMountedCount(0);
    setMountDone(false);

    const mountBatch = () => {
      index = Math.min(index + BATCH_SIZE, nodes.length);
      setVisibleNodes(nodes.slice(0, index));
      if (index >= nodes.length) {
        setVisibleLines(lines);
        setMountedCount(nodes.length);
        setMountDone(true);
        return;
      }
      const proportion = index / nodes.length;
      const linesCount = Math.ceil(lines.length * proportion);
      setVisibleLines(lines.slice(0, linesCount));
      setMountedCount(index);
      rafId = window.requestAnimationFrame(mountBatch);
    };

    rafId = window.requestAnimationFrame(mountBatch);

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [layoutReady, layout]);

  useEffect(() => {
    if (!layoutReady || !mountDone || initialViewApplied) {
      return;
    }

    const initialScale = INITIAL_SCALE;
    const nextX = viewportSize.width / 2 - (layout.width * initialScale) / 2;
    const nextY = viewportSize.height / 2 - (layout.height * initialScale) / 2;
    setTransform({ scale: initialScale, x: nextX, y: nextY });
    setInitialViewApplied(true);
  }, [layoutReady, mountDone, layout.width, layout.height, viewportSize, initialViewApplied]);

  useEffect(() => {
    if (!pendingFocusMemberId || !layoutReady) {
      return;
    }

    const nodes = layout.nodes || [];
    const targetNode = nodes.find((node) => node.member?.id === pendingFocusMemberId);
    if (!targetNode) {
      return;
    }

  const targetScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, 1.15));
  const wrapper = canvasWrapperRef.current;
  const centerX = wrapper ? wrapper.clientWidth / 2 : viewportSize.width / 2;
  const centerY = wrapper ? wrapper.clientHeight / 2 : viewportSize.height / 2;
    const nextX = centerX - targetNode.centerX * targetScale;
    const nextY = centerY - targetNode.centerY * targetScale;

    window.requestAnimationFrame(() => {
      setTransform({ scale: targetScale, x: nextX, y: nextY });
    });

    setPendingFocusMemberId(null);
  }, [pendingFocusMemberId, layout, layoutReady, viewportSize]);

  useEffect(() => {
    if (!focusMemberId) {
      return undefined;
    }
    const timeoutId = window.setTimeout(() => setFocusMemberId(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [focusMemberId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSearchResults && !event.target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSearchResults]);

  const handlePointerDown = (event) => {
    if (event.pointerType !== 'touch' && isInteractivePointerTarget(event.target)) {
      pointerStateRef.current.active = false;
      return;
    }

    if (event.pointerType === 'touch') {
      activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (activePointersRef.current.size === 1) {
        const currentTransform = transformRef.current;
        pointerStateRef.current = {
          active: true,
          pointerId: event.pointerId,
          originX: event.clientX,
          originY: event.clientY,
          baseX: currentTransform.x,
          baseY: currentTransform.y,
          hasDragged: false,
        };
      } else if (activePointersRef.current.size === 2) {
        const currentTransform = transformRef.current;
        const points = Array.from(activePointersRef.current.values());
        const dx = points[1].x - points[0].x;
        const dy = points[1].y - points[0].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const centerX = (points[0].x + points[1].x) / 2;
        const centerY = (points[0].y + points[1].y) / 2;

        pinchStateRef.current = {
          active: true,
          initialDistance: distance || 1,
          initialScale: currentTransform.scale,
          centerX,
          centerY,
        };
        pointerStateRef.current.active = false;
      }
      return;
    }

    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    const currentTransform = transformRef.current;
    pointerStateRef.current = {
      active: true,
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      baseX: currentTransform.x,
      baseY: currentTransform.y,
      hasDragged: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (event.pointerType === 'touch') {
      if (!activePointersRef.current.has(event.pointerId)) {
        return;
      }

      activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pinchStateRef.current.active && activePointersRef.current.size >= 2) {
        const points = Array.from(activePointersRef.current.values()).slice(0, 2);
        const dx = points[1].x - points[0].x;
        const dy = points[1].y - points[0].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const pinchState = pinchStateRef.current;

        if (pinchState.initialDistance === 0) {
          return;
        }

        const wrapperRect = canvasWrapperRef.current?.getBoundingClientRect();
        if (!wrapperRect) {
          return;
        }

        event.preventDefault();

        const scaleChange = distance / pinchState.initialDistance;
        const desiredScale = pinchState.initialScale * scaleChange;

        const centerViewportX = ((points[0].x + points[1].x) / 2) - wrapperRect.left;
        const centerViewportY = ((points[0].y + points[1].y) / 2) - wrapperRect.top;

        zoomAroundPoint(desiredScale, centerViewportX, centerViewportY);
        return;
      }

      const state = pointerStateRef.current;
      if (!state.active || state.pointerId !== event.pointerId) {
        return;
      }

      const dx = event.clientX - state.originX;
      const dy = event.clientY - state.originY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        state.hasDragged = true;
        event.preventDefault();
        setTransform((prev) => ({ ...prev, x: state.baseX + dx, y: state.baseY + dy }));
      }
      return;
    }

    const state = pointerStateRef.current;
    if (!state.active || state.pointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - state.originX;
    const dy = event.clientY - state.originY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
      state.hasDragged = true;
      event.preventDefault();
      setTransform((prev) => ({ ...prev, x: state.baseX + dx, y: state.baseY + dy }));
    }
  };

  const stopPointer = (event) => {
    if (event.pointerType === 'touch') {
      activePointersRef.current.delete(event.pointerId);

      if (pinchStateRef.current.active && activePointersRef.current.size < 2) {
        pinchStateRef.current.active = false;
      }

      if (activePointersRef.current.size === 1) {
        const [remainingId, point] = Array.from(activePointersRef.current.entries())[0];
        const currentTransform = transformRef.current;
        pointerStateRef.current = {
          active: true,
          pointerId: remainingId,
          originX: point.x,
          originY: point.y,
          baseX: currentTransform.x,
          baseY: currentTransform.y,
          hasDragged: false,
        };
      } else if (activePointersRef.current.size === 0) {
        pointerStateRef.current.active = false;
      }
      return;
    }

    const state = pointerStateRef.current;
    if (state.pointerId !== event.pointerId) {
      return;
    }
    state.active = false;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event) => {
    const wrapperRect = canvasWrapperRef.current?.getBoundingClientRect();
    if (!wrapperRect) {
      return;
    }
    event.preventDefault();
    const pointerX = event.clientX - wrapperRect.left;
    const pointerY = event.clientY - wrapperRect.top;
    const scaleFactor = event.deltaY < 0 ? 1.1 : 0.9;
    const desiredScale = transformRef.current.scale * scaleFactor;
    zoomAroundPoint(desiredScale, pointerX, pointerY);
  };

  const handleNodePress = (member) => {
    setSelectedMember(member);
  };

  const handleCloseModal = () => {
    setSelectedMember(null);
  };

  const handleAddChild = async (parentMember, childData) => {
    if (!isAdmin) { alert('Admin login required to add child'); return; }
    try {
      const response = await apiFetch('/api/add-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
        body: JSON.stringify({ parentId: parentMember.id, childData }),
      });
      if (response.ok) {
        alert('Child added');
        if (typeof onDataUpdated === 'function') {
          await onDataUpdated();
        } else {
          window.location.reload();
        }
      } else if (response.status === 403) {
        alert('Not authorized. Please login as admin.');
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to add child');
      }
    } catch (error) {
      console.error('Failed to add child:', error);
      alert('Failed to add child. Please try again.');
    }
  };

  const handleRemoveChild = async (parentId, childId) => {
    if (!isAdmin) { alert('Admin login required to remove child'); return; }
    if (!confirm('Are you sure you want to remove this child?')) return;
    try {
      const response = await apiFetch('/api/remove-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
        body: JSON.stringify({ parentId, childId }),
      });
      if (response.ok) {
        alert('Child removed');
        if (typeof onDataUpdated === 'function') {
          await onDataUpdated();
        } else {
          window.location.reload();
        }
      } else if (response.status === 403) {
        alert('Not authorized. Please login as admin.');
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to remove child');
      }
    } catch (error) {
      console.error('Failed to remove child:', error);
      alert('Failed to remove child. Please try again.');
    }
  };

  const handleUpdateMember = async (memberId, updatedData) => {
    if (!isAdmin) { alert('Admin login required to edit'); return; }
    try {
      console.log('Sending update to API:', { memberId, updatedData });
      const response = await apiFetch('/api/update-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
        body: JSON.stringify({ memberId, updatedData }),
      });
      const result = await response.json();
      console.log('API response:', result);
      if (response.ok) {
        alert('Member updated successfully!');
        if (result?.member) {
          setSelectedMember((prev) => (prev && prev.id === memberId ? { ...prev, ...result.member } : prev));
        }
        if (typeof onDataUpdated === 'function') {
          await onDataUpdated();
        } else {
          window.location.reload();
        }
      } else if (response.status === 403) {
        alert('Not authorized. Please login as admin.');
      } else {
        alert(`Failed to update: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to update member:', error);
      alert('Failed to update member. Please try again.');
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      setExpandedNodes(new Set());
      setFocusMemberId(null);
      setPendingFocusMemberId(null);
      setFocusedBranchMemberIds(null);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results = data.filter(member => {
      const nameMatch = member.name && member.name.toLowerCase().includes(lowerQuery);
      const englishNameMatch = member.englishName && member.englishName.toLowerCase().includes(lowerQuery);
      return nameMatch || englishNameMatch;
    });
    
    setSearchResults(results);
    setShowSearchResults(true);
  };

  const navigateToMember = (member) => {
    if (!member || !member.id) {
      return;
    }

    focusMemberById(member.id);
    setShowSearchResults(false);
    setSearchQuery('');
    setSearchResults([]);

    window.setTimeout(() => {
      setSelectedMember(member);
    }, 300);
  };

  const readyToRender = layoutReady && minWaitElapsed && mountDone;
  const siteIconSrc = siteFavicon ? resolveImageUrl(siteFavicon) : '/site-icon.png';

  return (  
    <div className="tree-container relative" ref={containerRef}>
      <motion.header
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="tree-header relative flex w-full flex-wrap items-center justify-between gap-6 rounded-b-4xl border-b border-white/60 bg-white/80 px-6 py-6 shadow-soft-xl backdrop-blur-xl lg:px-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at -5% -20%, rgba(251, 191, 36, 0.28), transparent 45%), radial-gradient(circle at 110% 0%, rgba(244, 114, 182, 0.22), transparent 48%), linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.74) 100%)',
        }}
      >
        <div className="flex flex-wrap items-center gap-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
            className="relative flex h-16 w-16 items-center justify-center rounded-3xl border border-white/70 bg-white/85 shadow-glow-amber ring-4 ring-white/45"
          >
            <img
              src={siteIconSrc}
              alt={siteTitle}
              className="h-full w-full rounded-2xl object-cover"
              loading="lazy"
            />
            <span className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/65 via-transparent to-primary-100/35" aria-hidden="true" />
          </motion.div>
          <div className="flex flex-col gap-2">
            <h1 className="text-[clamp(1.75rem,3.5vw,2.45rem)] font-display font-semibold leading-snug text-slate-900">
              {siteTitle}
            </h1>
            <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
              <span>कुटुंबाचा इतिहास जपूया</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">Preserve Our Family — Together</span>
            </p>
            <p className="text-sm font-medium text-slate-600">
              {t('family.summary', { totalMembers: summary.totalMembers, totalGenerations: summary.totalGenerations })}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-brand-600">सदस्य • Members: {summary.totalMembers}</span>
              <span className="rounded-full bg-primary-50 px-3 py-1 text-primary-700">पिढ्या • Generations: {summary.totalGenerations}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center md:justify-end">
          <LanguageSwitcher className="bg-white/75 shadow-none ring-1 ring-white/60" />
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary-200 bg-primary-500 text-lg font-semibold text-white shadow-soft transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
              onClick={onToggleSidebar}
              title={t('family.menu')}
              aria-label={t('family.menu')}
            >
              ☰
            </button>
            {isAdmin ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white shadow-soft transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200"
                  title={t('family.editTitle')}
                  onClick={() => {
                    const newTitle = prompt('Enter site title', siteTitle) || siteTitle;
                    apiFetch('/api/settings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
                      body: JSON.stringify({ title: newTitle, faviconDataUrl: siteFavicon })
                    }).then(async (res) => {
                      const json = await res.json();
                      if (res.ok) {
                        alert('Title updated');
                        if (typeof onSettingsUpdated === 'function') onSettingsUpdated();
                      } else {
                        alert(json.error || 'Failed to update title');
                      }
                    }).catch(() => alert('Failed to update title'));
                  }}
                >
                  {t('family.editTitle')}
                </button>
                <label
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-primary-100 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary-600 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:text-primary-800 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-200"
                  title={t('family.changeIcon')}
                >
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) {
                        e.target.value = '';
                        return;
                      }
                      const uploadIcon = async () => {
                        try {
                          const formData = new FormData();
                          formData.append('image', file);
                          formData.append('folder', 'site/icons');
                          const response = await fetch('/api/upload', {
                            method: 'POST',
                            headers: { 'x-admin-token': adminToken },
                            body: formData,
                          });
                          if (!response.ok) {
                            const err = await response.json();
                            alert(`❌ Failed to upload site icon: ${err.error || 'Unknown error'}`);
                            e.target.value = '';
                            return;
                          }
                          const result = await response.json();
                          alert('✅ Site icon uploaded successfully! Refreshing...');
                          console.log('Upload successful:', result);
                          window.location.reload();
                        } catch (error) {
                          console.error('Icon upload failed:', error);
                          alert(`❌ Failed to upload site icon: ${error.message}`);
                          e.target.value = '';
                        }
                      };
                      uploadIcon();
                    }}
                  />
                  {t('family.changeIcon')}
                </label>
              </div>
            ) : null}
          </div>
        </div>
      </motion.header>

      <div className="tree-canvas-wrapper" ref={canvasWrapperRef}>
        {!readyToRender ? (
          <div className="loading-state">
            <div className="spinner" aria-hidden="true" />
            <p>
              {t('family.loading', { count: mountedCount, total: summary.totalMembers })}
            </p>
          </div>
        ) : visibleNodes.length > 0 ? (
          <div
            ref={canvasRef}
            className="tree-canvas"
            style={{
              width: Math.max(layout.width, viewportSize.width),
              height: Math.max(layout.height, viewportSize.height),
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: '0 0',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopPointer}
            onPointerCancel={stopPointer}
            onWheel={handleWheel}
            role="presentation"
          >
            <svg
              className="tree-links"
              width={Math.max(layout.width, viewportSize.width)}
              height={Math.max(layout.height, viewportSize.height)}
            >
              {visibleLines.map((line) => (
                <path key={line.key} d={line.path} />
              ))}
            </svg>

            {visibleNodes.map((node) => {
              const memberId = node.member.id;
              const childIds = relationMaps.childrenMap.get(memberId) || [];
              const visibleChildCount = childIds.filter((childId) => visibleMemberIds.has(childId)).length;
              const hiddenChildrenCount = Math.max(0, childIds.length - visibleChildCount);
              const hasChildren = childIds.length > 0;
              return (
                <FamilyTreeNode
                  key={memberId}
                  member={node.member}
                  onPress={handleNodePress}
                  left={node.left}
                  top={node.top}
                  hasChildren={hasChildren}
                  isExpanded={expandedNodes.has(memberId)}
                  onToggleExpand={hasChildren ? () => toggleNodeExpansion(memberId) : undefined}
                  hiddenChildrenCount={hiddenChildrenCount}
                  isFocused={focusMemberId === memberId}
                />
              );
            })}
          </div>
        ) : (
          <div className="loading-state">
            <p>{t('family.noMembers')}</p>
          </div>
        )}
        {readyToRender ? (
          <>
            <div className="floating-search-panel">
              <div className="search-container relative w-full max-w-xs sm:max-w-sm">
                <input
                  type="text"
                  className="search-input w-full rounded-3xl border border-white/60 bg-white/80 px-5 py-3 pr-12 text-sm font-medium text-slate-700 shadow-soft backdrop-blur focus:border-primary-300 focus:ring-4 focus:ring-primary-200/60 focus:outline-none"
                  placeholder={`${t('family.searchPlaceholder')} | Search family`}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => {
                    setShowSearchTooltip(false);
                    if (searchResults.length > 0) setShowSearchResults(true);
                  }}
                  lang={language}
                  autoComplete="off"
                />
                <span className="search-icon pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg">🔍</span>
                <AnimatePresence>
                  {showSearchTooltip ? (
                    <motion.div
                      key="search-tip"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="search-tooltip mt-3 rounded-2xl bg-slate-900/90 px-4 py-2 text-xs font-semibold text-white shadow-soft"
                    >
                      {t('family.searchTip')}
                      <span className="ml-2 text-[10px] font-normal text-white/70">Find your roots • आपल्या माणसांना शोधा</span>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <AnimatePresence>
                  {showSearchResults && searchResults.length > 0 ? (
                    <motion.div
                      key="search-results"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="search-results mt-3 overflow-hidden rounded-3xl border border-white/60 bg-white/90 shadow-soft-xl backdrop-blur-xl"
                    >
                      {searchResults.map((member) => (
                        <motion.button
                          key={member.id}
                          type="button"
                          className="search-result-item group flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-primary-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200"
                          onClick={() => navigateToMember(member)}
                          whileHover={{ translateX: 3 }}
                        >
                          <div className="result-names flex flex-col items-start gap-1">
                            <span className="result-name text-sm font-semibold text-slate-800">
                              {member.name}
                            </span>
                            {member.englishName ? (
                              <span className="result-english-name text-xs italic text-slate-500">{member.englishName}</span>
                            ) : null}
                          </div>
                          <span className="result-gen rounded-full bg-primary-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-700">
                            Gen {member.generation}
                          </span>
                        </motion.button>
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
            <div className="zoom-control-panel" aria-hidden="false">
              <button
                type="button"
                className="zoom-btn"
                onClick={handleZoomOut}
                aria-label={t('family.zoomOut')}
              >
                −
              </button>
            <div className="zoom-indicator">{Math.round(transform.scale * 100)}%</div>
            <button
              type="button"
              className="zoom-btn"
              onClick={handleZoomIn}
              aria-label={t('family.zoomIn')}
            >
              +
            </button>
            <button
              type="button"
              className="zoom-reset-btn"
              onClick={handleZoomReset}
            >
              {t('family.resetView')}
            </button>
          </div>
          </>
        ) : null}
      </div>

      <MemberDetailModal
        member={selectedMember}
        onClose={handleCloseModal}
        visible={Boolean(selectedMember)}
        onAddChild={handleAddChild}
        onRemoveChild={handleRemoveChild}
        onUpdateMember={handleUpdateMember}
        allMembers={data}
        isAdmin={isAdmin}
        adminToken={adminToken}
      />
    </div>
  );
};

export default FamilyTree;
