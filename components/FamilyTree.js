import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  StatusBar,
  ActivityIndicator,
  InteractionManager,
  Animated,
  PanResponder,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import FamilyTreeNode from './FamilyTreeNode';
import MemberDetailModal from './MemberDetailModal';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 200;
const HORIZONTAL_GAP = 90;
const VERTICAL_GAP = 150;
const CANVAS_PADDING = 400;
const INITIAL_SCALE = 0.85;
const MIN_SCALE = 0.45;
const MAX_SCALE = 2.1;
const MIN_LOADING_DURATION_MS = 16000;
const MAX_CANVAS_DIMENSION = 12000; // clamp to avoid oversized surfaces that can crash on Android

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

// Scale down a path string by a factor (scales all numeric tokens)
const scalePathString = (path, factor) =>
  typeof path === 'string'
    ? path.replace(/-?\d*\.?\d+/g, (num) => String(parseFloat(num) * factor))
    : path;

// Clamp the layout width/height to MAX_CANVAS_DIMENSION by uniformly scaling coordinates
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

const FamilyTree = ({ data }) => {
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [layoutReady, setLayoutReady] = useState(false);
  const [minWaitElapsed, setMinWaitElapsed] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

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

  const dimensions = useWindowDimensions();
  const windowWidth = dimensions?.width || 375;
  const windowHeight = dimensions?.height || 667;
  const [viewportSize, setViewportSize] = useState({ width: windowWidth, height: windowHeight });

  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(INITIAL_SCALE)).current;
  const panOffset = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(INITIAL_SCALE);
  const initialPinchDistance = useRef(null);
  const scaleSnapshot = useRef(INITIAL_SCALE);
  const isPinching = useRef(false);

  // Progressive mount state
  const [mountedCount, setMountedCount] = useState(0);
  const [mountDone, setMountDone] = useState(false);
  const stagedNodesRef = useRef([]);
  const stagedLinesRef = useRef([]);
  const [visibleNodes, setVisibleNodes] = useState([]);
  const [visibleLines, setVisibleLines] = useState([]);
  const rafIdRef = useRef(null);

  useEffect(() => {
    setViewportSize({ width: windowWidth, height: windowHeight });
  }, [windowWidth, windowHeight]);

  useEffect(() => {
    const waitTimer = setTimeout(() => {
      setMinWaitElapsed(true);
    }, MIN_LOADING_DURATION_MS);

    return () => {
      clearTimeout(waitTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let frameId = null;
    let timeoutId = null;

    if (!Array.isArray(data) || data.length === 0) {
      setLayout(DEFAULT_LAYOUT);
      setLayoutReady(true);
      return () => {
        cancelled = true;
      };
    }

    setLayoutReady(false);

    const runComputation = () => {
      try {
        const computed = computeLayout(data);
        const nextLayout = clampLayoutDimensions(computed);
        if (!cancelled) {
          setLayout(nextLayout);
          setLayoutReady(true);
        }
      } catch (_error) {
        if (!cancelled) {
          setLayout(DEFAULT_LAYOUT);
          setLayoutReady(true);
        }
      }
    };

    InteractionManager.runAfterInteractions(() => {
      if (typeof global.requestAnimationFrame === 'function') {
        frameId = requestAnimationFrame(runComputation);
      } else {
        timeoutId = setTimeout(runComputation, 0);
      }
    });

    return () => {
      cancelled = true;
      if (frameId && typeof global.cancelAnimationFrame === 'function') {
        cancelAnimationFrame(frameId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [data]);

  useEffect(() => {
    if (!layoutReady) return;
    if (!layout || !layout.nodes || layout.nodes.length === 0) return;

    // Reset progressive mount
    if (rafIdRef.current && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setMountedCount(0);
    setMountDone(false);
    stagedNodesRef.current = layout.nodes;
    stagedLinesRef.current = layout.lines;
    setVisibleNodes([]);
    setVisibleLines([]);

    const batchSize = 60; // minimalist, safe batch size
    const total = stagedNodesRef.current.length;
    const linesTotal = stagedLinesRef.current.length;
    let index = 0;

    const mountBatch = () => {
      const next = Math.min(index + batchSize, total);
      const nodesSlice = stagedNodesRef.current.slice(0, next);
      // mount lines proportionally to nodes mounted; on final batch, mount all lines
      const proportionalLines = index + batchSize >= total
        ? stagedLinesRef.current
        : stagedLinesRef.current.slice(0, Math.min(linesTotal, Math.ceil((next / total) * linesTotal)));
      setVisibleNodes(nodesSlice);
      setVisibleLines(proportionalLines);
      setMountedCount(next);
      index = next;
      if (next >= total) {
        setMountDone(true);
        return;
      }
      rafIdRef.current = requestAnimationFrame(mountBatch);
    };

    // Start progressive mounting
    rafIdRef.current = requestAnimationFrame(mountBatch);

    // Center after first chunk mounted for a smooth transition
    const centerAfterFirst = setTimeout(() => {
      scaleRef.current = INITIAL_SCALE;
      scale.setValue(INITIAL_SCALE);
      const centeredX = viewportSize.width / 2 - (layout.width * scaleRef.current) / 2;
      const centeredY = viewportSize.height / 2 - (layout.height * scaleRef.current) / 2;
      pan.setValue({ x: centeredX, y: centeredY });
      panOffset.current = { x: centeredX, y: centeredY };
    }, 0);

    return () => {
      if (rafIdRef.current && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      clearTimeout(centerAfterFirst);
    };
  }, [layoutReady, layout, viewportSize.width, viewportSize.height, pan, scale]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          if (gestureState.numberActiveTouches === 2) {
            return true;
          }
          const dx = Math.abs(gestureState.dx);
          const dy = Math.abs(gestureState.dy);
          return dx > 6 || dy > 6;
        },
        onPanResponderGrant: () => {
          initialPinchDistance.current = null;
          scaleSnapshot.current = scaleRef.current;
          isPinching.current = false;
        },
        onPanResponderMove: (evt, gestureState) => {
          if (gestureState.numberActiveTouches === 2) {
            isPinching.current = true;
            const touches = evt.nativeEvent.touches;
            if (touches.length < 2) {
              return;
            }
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (!initialPinchDistance.current) {
              initialPinchDistance.current = distance;
              return;
            }
            let nextScale = scaleSnapshot.current * (distance / initialPinchDistance.current);
            nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));
            scale.setValue(nextScale);
            scaleRef.current = nextScale;
            return;
          }

          isPinching.current = false;
          const newX = panOffset.current.x + gestureState.dx;
          const newY = panOffset.current.y + gestureState.dy;
          pan.setValue({ x: newX, y: newY });
        },
        onPanResponderRelease: (evt, gestureState) => {
          if (!isPinching.current) {
            panOffset.current = {
              x: panOffset.current.x + gestureState.dx,
              y: panOffset.current.y + gestureState.dy,
            };
          }
          initialPinchDistance.current = null;
          isPinching.current = false;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderTerminate: () => {
          initialPinchDistance.current = null;
          isPinching.current = false;
        },
      }),
    [pan, scale]
  );

  const handleNodePress = (member) => {
    setSelectedMember(member);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setTimeout(() => setSelectedMember(null), 250);
  };

  const handleResetView = () => {
    scaleRef.current = INITIAL_SCALE;
    scale.setValue(INITIAL_SCALE);

    if (layout.width === 0 || layout.height === 0) {
      pan.setValue({ x: 0, y: 0 });
      panOffset.current = { x: 0, y: 0 };
      return;
    }

    const centeredX = viewportSize.width / 2 - (layout.width * scaleRef.current) / 2;
    const centeredY = viewportSize.height / 2 - (layout.height * scaleRef.current) / 2;
    pan.setValue({ x: centeredX, y: centeredY });
    panOffset.current = { x: centeredX, y: centeredY };
  };

  return (
    <View style={styles.container} onLayout={(event) => {
      const { width, height } = event.nativeEvent.layout;
      setViewportSize({ width, height });
    }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Family Tree</Text>
          <Text style={styles.headerSubtitle}>
            • {summary.totalMembers} members • {summary.totalGenerations} generations
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Text style={styles.helperText}>Drag to move • Pinch to zoom</Text>
          <TouchableOpacity style={styles.resetButton} onPress={handleResetView}>
            <Text style={styles.resetButtonText}>Reset View</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.canvasWrapper}>
        {!layoutReady || !minWaitElapsed || !mountDone ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.loadingText}>Rendering family tree… {mountedCount}/{summary.totalMembers}</Text>
          </View>
        ) : visibleNodes && visibleNodes.length > 0 ? (
          <Animated.View
            style={[
              styles.canvas,
              {
                width: Math.max(layout.width, viewportSize.width),
                height: Math.max(layout.height, viewportSize.height),
              },
              {
                transform: [
                  { translateX: pan.x },
                  { translateY: pan.y },
                  { scale },
                ],
              },
            ]}
            {...panResponder.panHandlers}
          >
            <Svg
              style={StyleSheet.absoluteFill}
              width={Math.max(layout.width, viewportSize.width)}
              height={Math.max(layout.height, viewportSize.height)}
              pointerEvents="none"
            >
              {(visibleLines || []).map((line) => (
                <Path
                  key={line.key}
                  d={line.path}
                  stroke="#c7d2fe"
                  strokeWidth={3}
                  fill="none"
                />
              ))}
            </Svg>

            {(visibleNodes || []).map((node) => (
              <FamilyTreeNode
                key={node.member.id}
                member={node.member}
                onPress={handleNodePress}
                style={{ left: node.left, top: node.top }}
              />
            ))}
          </Animated.View>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>No family members found</Text>
          </View>
        )}
      </View>

      <MemberDetailModal
        visible={modalVisible}
        member={selectedMember}
        onClose={handleCloseModal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  helperText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4338ca',
  },
  resetButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    shadowColor: '#4338ca',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  resetButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  canvasWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
});

export default FamilyTree;
