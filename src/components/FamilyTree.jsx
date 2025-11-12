import { useEffect, useMemo, useRef, useState } from 'react';
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
const MIN_SCALE = 0.45;
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
      const controlY = (startY + endY) / 2;

      lines.push({
        key: `${member.id}-${childId}`,
        path: `M ${startX} ${startY} C ${startX} ${controlY}, ${endX} ${controlY}, ${endX} ${endY}`,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
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

  const activePointersRef = useRef(new Map());
  const pinchStateRef = useRef({
    active: false,
    initialDistance: 0,
    initialScale: INITIAL_SCALE,
    centerX: 0,
    centerY: 0,
  });

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

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

    if (!Array.isArray(data) || data.length === 0) {
      setLayout(DEFAULT_LAYOUT);
      setLayoutReady(true);
      setInitialViewApplied(false);
      return () => {
        cancelled = true;
      };
    }

    setLayoutReady(false);
    setInitialViewApplied(false);

    const frameId = window.requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }
      try {
        const computed = clampLayoutDimensions(computeLayout(data));
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
  }, [data]);

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
    const handleClickOutside = (event) => {
      if (showSearchResults && !event.target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSearchResults]);

  const handlePointerDown = (event) => {
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

        if (!canvasRef.current || pinchState.initialDistance === 0) {
          return;
        }

        event.preventDefault();

        const scaleChange = distance / pinchState.initialDistance;
        const newScale = Math.max(
          MIN_SCALE,
          Math.min(MAX_SCALE, pinchState.initialScale * scaleChange)
        );

        const centerX = (points[0].x + points[1].x) / 2;
        const centerY = (points[0].y + points[1].y) / 2;

        setTransform((prev) => {
          const rect = canvasRef.current.getBoundingClientRect();
          const pointerX = centerX - rect.left;
          const pointerY = centerY - rect.top;
          const scaleRatio = newScale / prev.scale;
          const nextX = pointerX - (pointerX - prev.x) * scaleRatio;
          const nextY = pointerY - (pointerY - prev.y) * scaleRatio;
          return { scale: newScale, x: nextX, y: nextY };
        });
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
    if (!canvasRef.current) {
      return;
    }
    event.preventDefault();
    const scaleFactor = event.deltaY < 0 ? 1.1 : 0.9;
    setTransform((prev) => {
      const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * scaleFactor));
      if (nextScale === prev.scale) {
        return prev;
      }
      const rect = canvasRef.current.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const scaleRatio = nextScale / prev.scale;
      const nextX = pointerX - (pointerX - prev.x) * scaleRatio;
      const nextY = pointerY - (pointerY - prev.y) * scaleRatio;
      return { scale: nextScale, x: nextX, y: nextY };
    });
  };

  const handleResetView = () => {
    const initialScale = INITIAL_SCALE;
    const nextX = viewportSize.width / 2 - (layout.width * initialScale) / 2;
    const nextY = viewportSize.height / 2 - (layout.height * initialScale) / 2;
    setTransform({ scale: initialScale, x: nextX, y: nextY });
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
    const node = layout.nodes.find(n => n.member.id === member.id);
    if (!node) return;

    const targetScale = 1.2;
    const centerX = viewportSize.width / 2;
    const centerY = viewportSize.height / 2;
    
    const targetX = centerX - (node.centerX * targetScale);
    const targetY = centerY - (node.centerY * targetScale);

    setTransform({ scale: targetScale, x: targetX, y: targetY });
    setShowSearchResults(false);
    setSearchQuery('');
    
    // Highlight the member by opening their modal after a short delay
    setTimeout(() => {
      setSelectedMember(member);
    }, 300);
  };

  const readyToRender = layoutReady && minWaitElapsed && mountDone;

  return (  
    <div className="tree-container" ref={containerRef}>
  <header className="tree-header">
        <div>
          <h1>
            {siteFavicon ? (
              <img
                src={resolveImageUrl(siteFavicon)}
                alt="icon"
                style={{
                  width: 48,
                  height: 48,
                  verticalAlign: 'middle',
                  marginRight: 10,
                  borderRadius: 10,
                  objectFit: 'cover',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}
              />
            ) : null}
            {siteTitle}
          </h1>
          <p>
            {t('family.summary', { totalMembers: summary.totalMembers, totalGenerations: summary.totalGenerations })}
          </p>
        </div>
        <div className="header-search-actions">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder={t('family.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
              lang={language}
              autoComplete="off"
            />
            <span className="search-icon">🔍</span>
            {showSearchResults && searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    className="search-result-item"
                    onClick={() => navigateToMember(member)}
                  >
                    <div className="result-names">
                      <span className="result-name">{member.name}</span>
                      {member.englishName && (
                        <span className="result-english-name">({member.englishName})</span>
                      )}
                    </div>
                    <span className="result-gen">Gen {member.generation}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="header-actions top-right-actions">
              <LanguageSwitcher />
              <button type="button" className="menu-button" onClick={onToggleSidebar} title={t('family.menu')} aria-label={t('family.menu')}>☰</button>
            {isAdmin && (
              <>
                <button
                  type="button"
                  className="reset-button"
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
                >{t('family.editTitle')}</button>
                <label className="reset-button" title={t('family.changeIcon')} style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const iconUrl = await uploadImageFile(file, { token: adminToken, folder: 'site' });
                      const res = await apiFetch('/api/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
                        body: JSON.stringify({ title: siteTitle, faviconDataUrl: iconUrl }),
                      });
                      const json = await res.json();
                      if (res.ok) {
                        alert('Icon updated');
                        if (typeof onSettingsUpdated === 'function') onSettingsUpdated();
                      } else {
                        alert(json.error || 'Failed to update icon');
                      }
                    } catch (err) {
                      console.error('Icon upload failed:', err);
                      alert(err.message || 'Failed to upload icon');
                    }
                    e.target.value = '';
                  }} />
                  {t('family.changeIcon')}
                </label>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="tree-canvas-wrapper">
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

            {visibleNodes.map((node) => (
              <FamilyTreeNode
                key={node.member.id}
                member={node.member}
                onPress={handleNodePress}
                left={node.left}
                top={node.top}
              />
            ))}
          </div>
        ) : (
          <div className="loading-state">
            <p>{t('family.noMembers')}</p>
          </div>
        )}
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
