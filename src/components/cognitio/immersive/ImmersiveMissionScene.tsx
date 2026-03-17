// ============================================================
// ImmersiveMissionScene — Top-level scene component that
// renders the complete escape game experience with rooms,
// objects, HUD, narrative overlay, adaptive rendering,
// cinematic camera transitions, and dynamic skybox.
// ============================================================

import { useState, useCallback, useMemo, useEffect, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  ImmersiveGameConfig,
  RenderMode,
  PedagogicalObject,
  DependencyNode,
} from "@/domain/cognitio/immersiveEngine.types";
import Adaptive3DScene from "./Adaptive3DScene";
import LearningRoom3D from "./LearningRoom3D";
import KnowledgeWorldMap from "./KnowledgeWorldMap";
import ObjectInspectPanel from "./ObjectInspectPanel";
import MissionProgressHUD from "./MissionProgressHUD";
import NarrativeOverlay from "./NarrativeOverlay";
import AdaptiveHintPanel from "./AdaptiveHintPanel";

const SceneCamera = lazy(() => import("./SceneCamera"));

interface ImmersiveMissionSceneProps {
  config: ImmersiveGameConfig;
  currentRoomIndex: number;
  completedRooms: string[];
  score: number;
  hintsUsed: number;
  narrativeMessage?: string;
  onRoomSelect: (clusterId: string) => void;
  onObjectInteract: (objectId: string, interaction: string) => void;
  onRequestHint: () => void;
}

export default function ImmersiveMissionScene({
  config,
  currentRoomIndex,
  completedRooms,
  score,
  hintsUsed,
  narrativeMessage,
  onRoomSelect,
  onObjectInteract,
  onRequestHint,
}: ImmersiveMissionSceneProps) {
  const [renderMode, setRenderMode] = useState<RenderMode>(config.performance_profile.render_mode);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showNarrative, setShowNarrative] = useState(!!narrativeMessage);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevRoomRef = useRef(currentRoomIndex);

  // Get cluster IDs for room mapping
  const clusterIds = useMemo(() =>
    [...new Set(
      config.dependency_graph.nodes
        .map(n => n.room_cluster_id)
        .filter((id): id is string => id !== null)
    )].sort(),
    [config.dependency_graph.nodes]
  );

  const currentClusterId = clusterIds[currentRoomIndex] ?? clusterIds[0];

  // Objects for current room
  const currentRoomObjects = useMemo(() =>
    config.pedagogical_objects.filter(o => o.room_id === currentClusterId),
    [config.pedagogical_objects, currentClusterId]
  );

  // Selected object details
  const selectedObject = useMemo(() =>
    selectedObjectId
      ? config.pedagogical_objects.find(o => o.id === selectedObjectId) ?? null
      : null,
    [selectedObjectId, config.pedagogical_objects]
  );

  // Concept nodes for current room
  const currentNodes = useMemo(() =>
    config.dependency_graph.nodes.filter(n => n.room_cluster_id === currentClusterId),
    [config.dependency_graph.nodes, currentClusterId]
  );

  const totalRooms = clusterIds.length;
  const totalObjects = config.pedagogical_objects.length;
  const discoveredObjects = config.pedagogical_objects.filter(
    o => o.state === "discovered" || o.state === "collected" || o.state === "used"
  ).length;

  // Show narrative on change
  // Cinematic room transition
  useEffect(() => {
    if (currentRoomIndex !== prevRoomRef.current) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        prevRoomRef.current = currentRoomIndex;
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentRoomIndex]);

  useEffect(() => {
    if (narrativeMessage) setShowNarrative(true);
  }, [narrativeMessage]);

  const handleObjectClick = useCallback((objectId: string) => {
    setSelectedObjectId(objectId);
  }, []);

  const handleObjectInteract = useCallback((interaction: string) => {
    if (selectedObjectId) {
      onObjectInteract(selectedObjectId, interaction);
    }
  }, [selectedObjectId, onObjectInteract]);

  // Build room data for 3D rendering
  const roomsData = useMemo(() =>
    clusterIds.map((clusterId, index) => {
      const nodesInRoom = config.dependency_graph.nodes.filter(n => n.room_cluster_id === clusterId);
      const template = config.universe_config.room_templates[index % config.universe_config.room_templates.length];
      const roomTitle = nodesInRoom.length > 0
        ? nodesInRoom.find(n => n.is_gate)?.label ?? nodesInRoom[0].label
        : `Salle ${index + 1}`;
      return {
        clusterId,
        index,
        title: roomTitle,
        purpose: template?.purpose ?? "exploration",
        template: template ?? { purpose: "exploration", geometry: "rectangular" as const, size: "medium" as const, aesthetic_tags: [], max_objects: 6 },
        objects: config.pedagogical_objects.filter(o => o.room_id === clusterId),
        isCurrent: index === currentRoomIndex,
        isCompleted: completedRooms.includes(clusterId),
        isLocked: index > currentRoomIndex && !completedRooms.includes(clusterId),
      };
    }),
    [clusterIds, config, currentRoomIndex, completedRooms]
  );

  // Camera target for current room (rooms laid out along negative Z)
  const currentRoomTarget = useMemo((): [number, number, number] => {
    const roomDim = roomsData[currentRoomIndex]?.template.size === "small" ? 8
      : roomsData[currentRoomIndex]?.template.size === "large" ? 16 : 12;
    const gap = 4;
    const z = currentRoomIndex * -(roomDim + gap);
    return [0, 2, z];
  }, [currentRoomIndex, roomsData]);

  // Dynamic progression tint (gets brighter as rooms are completed)
  const progressionOpacity = completedRooms.length / Math.max(totalRooms, 1);

  return (
    <div className="relative w-full h-full min-h-[500px]">
      {/* HUD */}
      <MissionProgressHUD
        currentRoom={currentRoomIndex + 1}
        totalRooms={totalRooms}
        score={score}
        hintsUsed={hintsUsed}
        objectsDiscovered={discoveredObjects}
        totalObjects={totalObjects}
        completedRooms={completedRooms.length}
        onToggleMap={() => setShowMap(!showMap)}
        renderMode={renderMode}
      />

      {/* Cinematic room transition — establishing shot for each new room */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          >
            {/* Depth of field blur overlay */}
            <motion.div
              className="absolute inset-0 bg-background/30 backdrop-blur-[3px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            />

            {/* Room announcement */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.1, opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-center space-y-3 relative z-10"
            >
              <motion.div
                className="w-16 h-px mx-auto bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              />
              <p className="text-xs text-primary font-semibold uppercase tracking-[0.2em]">
                Salle {currentRoomIndex + 1}
              </p>
              <p className="text-[10px] text-muted-foreground/50">
                {roomsData[currentRoomIndex]?.title ?? ""}
              </p>
              <motion.div
                className="w-16 h-px mx-auto bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progression glow overlay — subtle, non-blocking */}
      <div
        className="absolute inset-0 pointer-events-none z-[1] transition-opacity duration-1000"
        style={{
          background: `radial-gradient(ellipse at center bottom, hsl(var(--primary) / ${progressionOpacity * 0.04}), transparent 60%)`,
        }}
      />

      {/* Main 3D/2D scene area */}
      <div className="w-full h-full">
        {renderMode === "fallback_2d" ? (
          <Fallback2DScene
            nodes={currentNodes}
            objects={currentRoomObjects}
            onObjectClick={handleObjectClick}
            roomIndex={currentRoomIndex}
          />
        ) : (
          <Adaptive3DScene
            fallback2D={
              <Fallback2DScene
                nodes={currentNodes}
                objects={currentRoomObjects}
                onObjectClick={handleObjectClick}
                roomIndex={currentRoomIndex}
              />
            }
            onRenderModeChange={setRenderMode}
            className="w-full h-full"
          >
            {/* Camera with orbit controls and room transitions */}
            <Suspense fallback={null}>
              <SceneCamera
                roomTarget={currentRoomTarget}
                isTransitioning={isTransitioning}
                enableDrift={renderMode === "full_3d"}
                renderMode={renderMode}
              />
            </Suspense>

            {/* Scene lighting */}
            <ambientLight intensity={Math.max(config.universe_config.lighting.ambient_intensity, 0.3)} />
            <directionalLight
              position={[5, 12, 8]}
              intensity={Math.max(config.universe_config.lighting.directional_intensity, 0.6)}
              castShadow={config.performance_profile.shadows_enabled}
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
              shadow-camera-far={50}
              shadow-camera-near={1}
            />
            {/* Hemisphere fill light for ambient color */}
            <hemisphereLight
              args={[config.universe_config.color_palette.primary, config.universe_config.color_palette.background, 0.15]}
            />

            {/* Fog */}
            {config.universe_config.fog.enabled && (
              <fog
                attach="fog"
                args={[
                  config.universe_config.fog.color,
                  config.universe_config.fog.near,
                  config.universe_config.fog.far,
                ]}
              />
            )}

            {/* Render all rooms — visible rooms centered on current */}
            {roomsData.map((room) => (
              <LearningRoom3D
                key={room.clusterId}
                roomIndex={room.index}
                roomTitle={room.title}
                roomPurpose={room.purpose}
                template={room.template}
                lighting={config.universe_config.lighting}
                fog={config.universe_config.fog}
                objects={room.objects}
                colorPrimary={config.universe_config.color_palette.primary}
                colorAccent={config.universe_config.color_palette.accent}
                isCurrent={room.isCurrent}
                isCompleted={room.isCompleted}
                isLocked={room.isLocked}
                renderMode={renderMode}
                onObjectClick={handleObjectClick}
              />
            ))}
          </Adaptive3DScene>
        )}
      </div>

      {/* Narrative overlay */}
      <AnimatePresence>
        {showNarrative && narrativeMessage && (
          <NarrativeOverlay
            message={narrativeMessage}
            onDismiss={() => setShowNarrative(false)}
          />
        )}
      </AnimatePresence>

      {/* Object inspect panel */}
      <AnimatePresence>
        {selectedObject && (
          <ObjectInspectPanel
            object={selectedObject}
            onClose={() => setSelectedObjectId(null)}
            onInteract={handleObjectInteract}
          />
        )}
      </AnimatePresence>

      {/* World map overlay */}
      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute inset-4 z-30 bg-background/95 backdrop-blur-xl rounded-2xl border border-border/20 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Carte du monde</h3>
              <button
                onClick={() => setShowMap(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Fermer
              </button>
            </div>
            <KnowledgeWorldMap
              graph={config.dependency_graph}
              universe={config.universe_config}
              currentRoomIndex={currentRoomIndex}
              completedRooms={completedRooms}
              renderMode={renderMode}
              onRoomSelect={(id) => {
                onRoomSelect(id);
                setShowMap(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint panel */}
      <AdaptiveHintPanel
        difficulty={config.difficulty_profile}
        onRequestHint={onRequestHint}
        hintsUsed={hintsUsed}
      />
    </div>
  );
}

// ---------- 2D Fallback Scene ----------

function Fallback2DScene({
  nodes,
  objects,
  onObjectClick,
  roomIndex,
}: {
  nodes: DependencyNode[];
  objects: PedagogicalObject[];
  onObjectClick: (id: string) => void;
  roomIndex: number;
}) {
  return (
    <div className="w-full h-full p-4 space-y-4 overflow-y-auto">
      <div className="text-center">
        <p className="text-xs text-primary font-semibold uppercase tracking-wider">
          Salle {roomIndex + 1}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {nodes.length} concepts — {objects.length} objets
        </p>
      </div>

      {/* Concept nodes as cards */}
      <div className="grid grid-cols-2 gap-2">
        {nodes.map(node => (
          <div
            key={node.id}
            className={`p-2.5 rounded-xl border text-xs transition-all ${
              node.is_gate
                ? "border-amber-500/30 bg-amber-500/5"
                : node.is_synthesis_target
                  ? "border-pink-500/30 bg-pink-500/5"
                  : "border-border/20 bg-background"
            }`}
          >
            <p className="font-medium text-[11px] truncate">{node.label}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{node.role} • {node.bloom_target}</p>
          </div>
        ))}
      </div>

      {/* Interactive objects */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          Objets interactifs
        </p>
        {objects.filter(o => o.state !== "locked").map(obj => (
          <button
            key={obj.id}
            onClick={() => onObjectClick(obj.id)}
            className="w-full text-left p-2.5 rounded-xl border border-border/20 hover:border-primary/30 text-xs transition-all"
          >
            <span className="font-medium">{obj.label}</span>
            <span className="text-muted-foreground ml-2">{obj.type.replace(/_/g, " ")}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
