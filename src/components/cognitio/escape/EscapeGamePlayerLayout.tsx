// ============================================================
// EscapeGamePlayerLayout — Main orchestrator for the escape
// game experience. Combines room map, inventory, puzzles,
// narrative, and game flow into a cohesive layout.
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Package, Map, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EscapeGameSession } from "@/domain/cognitio/escapeEngine.types";
import { useEscapeGame } from "@/hooks/useEscapeGame";
import EscapeRoomMap from "./EscapeRoomMap";
import InventoryPanel from "./InventoryPanel";
import EscapePuzzleView from "./EscapePuzzleView";
import EscapeNarrativeBanner from "./EscapeNarrativeBanner";
import EscapeCodeLock from "./EscapeCodeLock";
import EscapeDebriefView from "./EscapeDebriefView";

interface EscapeGamePlayerLayoutProps {
  session: EscapeGameSession;
  missionId: string;
  onMissionCompleted?: () => void;
}

export default function EscapeGamePlayerLayout({
  session,
  missionId,
  onMissionCompleted,
}: EscapeGamePlayerLayoutProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"map" | "inventory">("map");
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    state,
    rooms,
    inventory,
    currentRoom,
    currentPuzzle,
    narrativeMessage,
    debrief,
    totalProgress,
    puzzleAccessibility,
    startGame,
    enterRoom,
    startPuzzle,
    submitAnswer,
    requestHint,
    nextPuzzle,
    proceedToNextRoom,
    tryCodeUnlock,
    examineItem,
    useItem,
    discoverElement,
  } = useEscapeGame(session);

  // Timer for current puzzle
  useEffect(() => {
    if (state.phase !== "puzzle") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setElapsed(0);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.phase, state.current_puzzle_index]);

  const totalItems = rooms.reduce((sum, r) => sum + r.rewards.length, 0);

  // -------- Briefing Phase --------
  if (state.phase === "briefing") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 pt-24">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/cognitio-library")}
          className="gap-2 text-muted-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Mission title */}
          <div className="text-center space-y-2">
            <p className="text-xs uppercase tracking-wider text-primary font-semibold">
              Escape Game
            </p>
            <h1 className="text-2xl font-bold">
              {session.narrative.briefing.title}
            </h1>
          </div>

          {/* Briefing narrative */}
          <div className="glass-card-elevated p-6 rounded-2xl">
            <EscapeNarrativeBanner
              message={session.narrative.briefing.text}
              emotion="curiosity"
            />
          </div>

          {/* Mission info */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="glass-card p-3 rounded-xl">
              <p className="text-xl font-bold">{session.metadata.total_rooms}</p>
              <p className="text-[10px] text-muted-foreground">Salles</p>
            </div>
            <div className="glass-card p-3 rounded-xl">
              <p className="text-xl font-bold">{session.metadata.total_puzzles}</p>
              <p className="text-[10px] text-muted-foreground">Puzzles</p>
            </div>
            <div className="glass-card p-3 rounded-xl">
              <p className="text-xl font-bold">
                {Math.ceil(session.metadata.estimated_duration_sec / 60)}m
              </p>
              <p className="text-[10px] text-muted-foreground">Durée estimée</p>
            </div>
          </div>

          {/* Start button */}
          <div className="text-center pt-4">
            <Button
              onClick={startGame}
              size="lg"
              className="gradient-bg-premium rounded-xl px-8 text-base"
            >
              Commencer la mission
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // -------- Debrief Phase --------
  if (state.phase === "debrief" && debrief) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 pt-24">
        <EscapeDebriefView
          debrief={debrief}
          missionTitle={session.narrative.briefing.title}
          onBackToLibrary={() => navigate("/cognitio-library")}
          onReplay={() => window.location.reload()}
        />
      </div>
    );
  }

  // -------- Active Game Phase --------
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/10">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/cognitio-library")}
            className="gap-2 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Quitter
          </Button>

          {/* Progress bar */}
          <div className="flex-1 mx-4">
            <div className="h-1.5 bg-border/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                animate={{ width: `${totalProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Score */}
          <span className="text-sm font-medium tabular-nums">
            {Math.round(state.score)} pts
          </span>

          {/* Mobile toggles */}
          <div className="flex items-center gap-1 lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSidebarOpen(true);
                setSidebarTab("map");
              }}
              className="p-2"
            >
              <Map className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSidebarOpen(true);
                setSidebarTab("inventory");
              }}
              className="p-2 relative"
            >
              <Package className="w-4 h-4" />
              {inventory.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-[9px] text-white rounded-full flex items-center justify-center">
                  {inventory.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:block w-72 shrink-0 border-r border-border/10 p-4 space-y-6 overflow-y-auto" style={{ maxHeight: "calc(100vh - 52px)" }}>
          <EscapeRoomMap
            rooms={rooms}
            currentRoomIndex={state.current_room_index}
            onRoomSelect={enterRoom}
          />
          <div className="border-t border-border/10 pt-4">
            <InventoryPanel
              inventory={inventory}
              totalItems={totalItems}
              onExamine={examineItem}
              onUseItem={useItem}
              lockedRoomIndices={rooms.filter(r => !r.unlocked).map(r => r.room_index)}
            />
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black z-40 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                className="fixed left-0 top-0 bottom-0 w-72 bg-background z-50 p-4 space-y-4 overflow-y-auto lg:hidden border-r border-border/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSidebarTab("map")}
                      className={`text-xs font-medium px-3 py-1 rounded-full ${
                        sidebarTab === "map" ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      }`}
                    >
                      Carte
                    </button>
                    <button
                      onClick={() => setSidebarTab("inventory")}
                      className={`text-xs font-medium px-3 py-1 rounded-full ${
                        sidebarTab === "inventory" ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      }`}
                    >
                      Inventaire
                    </button>
                  </div>
                  <button onClick={() => setSidebarOpen(false)}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {sidebarTab === "map" ? (
                  <EscapeRoomMap
                    rooms={rooms}
                    currentRoomIndex={state.current_room_index}
                    onRoomSelect={(index) => {
                      enterRoom(index);
                      setSidebarOpen(false);
                    }}
                  />
                ) : (
                  <InventoryPanel
                    inventory={inventory}
                    totalItems={totalItems}
                    onExamine={examineItem}
                    onUseItem={useItem}
                    lockedRoomIndices={rooms.filter(r => !r.unlocked).map(r => r.room_index)}
                  />
                )}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main game area */}
        <main className="flex-1 max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Narrative banner */}
          {narrativeMessage && (
            <EscapeNarrativeBanner
              message={narrativeMessage}
              emotion={getEmotionForPhase(state.phase)}
            />
          )}

          {/* Room content */}
          <AnimatePresence mode="wait">
            {/* Exploring: show room intro + puzzle list */}
            {state.phase === "exploring" && currentRoom && (
              <motion.div
                key={`exploring-${state.current_room_index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-lg font-bold">{currentRoom.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentRoom.puzzles.filter(p => p.solved).length}/{currentRoom.puzzles.length} puzzles résolus
                  </p>
                </div>

                {/* Discoverable elements — exploration zone */}
                {currentRoom.discoverables && currentRoom.discoverables.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground/80 font-medium uppercase tracking-wider">
                      Explorer la salle
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {currentRoom.discoverables
                        .filter(d => !d.visible_after_puzzle_id || state.puzzles_solved.includes(d.visible_after_puzzle_id))
                        .map(disc => (
                        <motion.button
                          key={disc.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => !disc.discovered && discoverElement(disc.id)}
                          disabled={disc.discovered}
                          className={`text-left p-3 rounded-xl border transition-all ${
                            disc.discovered
                              ? "border-amber-500/20 bg-amber-500/5 opacity-60"
                              : disc.type === "secret"
                                ? "border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50 animate-pulse"
                                : "border-border/20 hover:border-amber-500/30 hover:bg-amber-500/5"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{
                              disc.discovered ? "✓" :
                              disc.type === "secret" ? "?" :
                              disc.type === "document" ? "📄" :
                              disc.type === "environment" ? "🔍" : "📦"
                            }</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">
                                {disc.discovered ? disc.label : (disc.type === "secret" ? "??? (objet caché)" : disc.label)}
                              </p>
                              {disc.discovered && (
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                  {disc.discovery_text.slice(0, 50)}…
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Puzzle list */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground/80 font-medium uppercase tracking-wider">
                    Puzzles
                  </p>
                  {currentRoom.puzzles.map((puzzle, index) => {
                    const accessibility = puzzleAccessibility.find(a => a.puzzleId === puzzle.id);
                    const isLocked = accessibility && !accessibility.canAttempt && !puzzle.solved;

                    return (
                      <button
                        key={puzzle.id}
                        onClick={() => !puzzle.solved && !isLocked && startPuzzle(index)}
                        disabled={puzzle.solved || !!isLocked}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          puzzle.solved
                            ? "border-green-500/20 bg-green-500/5 opacity-75"
                            : isLocked
                              ? "border-border/10 bg-border/5 opacity-50 cursor-not-allowed"
                              : "border-border/20 hover:border-primary/30 hover:bg-primary/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            puzzle.solved
                              ? "bg-green-500 text-white"
                              : isLocked
                                ? "bg-border/20 text-muted-foreground"
                                : "bg-primary/10 text-primary"
                          }`}>
                            {puzzle.solved ? "✓" : isLocked ? "🔒" : index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {getPuzzleTypeLabel(puzzle.puzzle_type)}
                              {puzzle.id.includes("bonus") && (
                                <span className="ml-2 text-[10px] text-purple-500 font-semibold">BONUS</span>
                              )}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {isLocked ? "Résolvez les puzzles précédents" : puzzle.prompt.slice(0, 60) + "…"}
                            </p>
                          </div>
                          {puzzle.required_items && puzzle.required_items.length > 0 && !puzzle.solved && (
                            <span className="text-[10px] text-amber-500">Objets requis</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Complete room button */}
                {currentRoom.puzzles.every(p => p.solved) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center pt-4"
                  >
                    <Button
                      onClick={proceedToNextRoom}
                      className="gradient-bg-premium rounded-xl gap-2"
                    >
                      Salle suivante <ArrowLeft className="w-4 h-4 rotate-180" />
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Puzzle: show active puzzle */}
            {state.phase === "puzzle" && currentPuzzle && currentRoom && (
              <motion.div
                key={`puzzle-${currentPuzzle.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <EscapePuzzleView
                  puzzle={currentPuzzle}
                  puzzleIndex={state.current_puzzle_index}
                  totalPuzzles={currentRoom.puzzles.length}
                  roomTitle={currentRoom.title}
                  timeElapsed={elapsed}
                  timeLimitSec={currentRoom.time_limit_sec}
                  onSubmit={submitAnswer}
                  onHint={requestHint}
                  onNext={nextPuzzle}
                />
              </motion.div>
            )}

            {/* Room complete: show completion + transition */}
            {state.phase === "room_complete" && currentRoom && (
              <motion.div
                key="room-complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12 space-y-6"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10"
                >
                  <span className="text-3xl">✓</span>
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold">Salle complétée !</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    {currentRoom.completion_narrative}
                  </p>
                </div>

                {/* Collected items */}
                {currentRoom.rewards.length > 0 && (
                  <div className="glass-card p-4 rounded-xl inline-block">
                    <p className="text-xs text-muted-foreground mb-2">Objets collectés :</p>
                    <div className="flex gap-2">
                      {currentRoom.rewards.map(item => (
                        <div
                          key={item.id}
                          className="text-center px-3 py-2 rounded-lg bg-accent/30 border border-border/10"
                        >
                          <p className="text-xs font-medium">{item.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={proceedToNextRoom}
                  className="gradient-bg-premium rounded-xl gap-2"
                >
                  Continuer <ArrowLeft className="w-4 h-4 rotate-180" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Code lock overlay */}
          {currentRoom && !currentRoom.unlocked && currentRoom.lock.type === "code_lock" && (
            <EscapeCodeLock
              codeLength={currentRoom.lock.code?.length ?? 4}
              lockDescription={currentRoom.lock.lock_description}
              unlockHint={currentRoom.lock.unlock_hint}
              onSubmitCode={(code) => tryCodeUnlock(currentRoom.room_index, code)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ---------- Helpers ----------

function getEmotionForPhase(phase: string): "curiosity" | "tension" | "discovery" | "urgency" | "relief" | "triumph" {
  switch (phase) {
    case "briefing": return "curiosity";
    case "exploring": return "discovery";
    case "puzzle": return "tension";
    case "room_complete": return "relief";
    case "boss": return "urgency";
    case "debrief": return "triumph";
    default: return "curiosity";
  }
}

function getPuzzleTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    observation: "Observation",
    classification: "Classification",
    sequencing: "Séquençage",
    elimination: "Élimination",
    decision: "Décision",
    active_generation: "Génération active",
    synthesis: "Synthèse",
    association: "Association",
    diagnostic: "Diagnostic",
    code_lock: "Code verrou",
  };
  return labels[type] ?? type;
}
