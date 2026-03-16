// ============================================================
// Hook: useEscapeGame — Full escape game state management
// Manages rooms, puzzles, inventory, locks, hints, and
// game flow for the escape game experience.
// ============================================================

import { useState, useCallback, useMemo, useRef } from "react";
import type {
  EscapeGameSession,
  EscapeGameState,
  EscapeRoom,
  EscapePuzzle,
  InventoryItem,
  EscapeHint,
  EscapeEvent,
  EscapeDebrief,
} from "@/domain/cognitio/escapeEngine.types";
import { canUnlockRoom, attemptCodeUnlock, checkUnlockableRooms } from "@/services/cognitio/escapeRoomEngine";
import { collectRoomRewards, collectItem } from "@/services/cognitio/escapeInventoryEngine";
import {
  validatePuzzleAnswer,
  buildConceptResults,
  buildPuzzleDependencyGraph,
  canAttemptPuzzle,
  getNewlyAvailablePuzzles,
  type PuzzleDependency,
} from "@/services/cognitio/escapePuzzleEngine";
import { generateEscapeDebrief } from "@/services/cognitio/escapeSpacedRepetition";
import { generateEventNarrative } from "@/services/cognitio/escapeNarrativeEngine";

// ---------- Hook ----------

export function useEscapeGame(session: EscapeGameSession | null) {
  const [state, setState] = useState<EscapeGameState>(
    session?.state ?? createEmptyState()
  );
  const [rooms, setRooms] = useState<EscapeRoom[]>(session?.rooms ?? []);
  const [inventory, setInventory] = useState<InventoryItem[]>(session?.inventory ?? []);
  const [narrativeMessage, setNarrativeMessage] = useState<string>("");
  const [debrief, setDebrief] = useState<EscapeDebrief | null>(null);
  const startTimeRef = useRef(Date.now());
  const puzzleStartRef = useRef(Date.now());

  // ---------- Puzzle Dependency Graph ----------

  const puzzleDependencyGraph = useMemo((): PuzzleDependency[] => {
    return buildPuzzleDependencyGraph(rooms);
  }, [rooms]);

  // ---------- Current Room & Puzzle ----------

  const currentRoom = useMemo((): EscapeRoom | null => {
    return rooms[state.current_room_index] ?? null;
  }, [rooms, state.current_room_index]);

  const currentPuzzle = useMemo((): EscapePuzzle | null => {
    if (!currentRoom) return null;
    return currentRoom.puzzles[state.current_puzzle_index] ?? null;
  }, [currentRoom, state.current_puzzle_index]);

  const totalProgress = useMemo(() => {
    if (rooms.length === 0) return 0;
    return Math.round((state.rooms_completed.length / rooms.length) * 100);
  }, [rooms, state.rooms_completed]);

  const currentHintLevel = useMemo((): number => {
    if (!currentPuzzle) return 0;
    return currentPuzzle.attempts;
  }, [currentPuzzle]);

  // ---------- Game Flow ----------

  const startGame = useCallback(() => {
    startTimeRef.current = Date.now();
    setState(prev => ({ ...prev, phase: "exploring" }));
    setNarrativeMessage(session?.narrative.briefing.text ?? "");
  }, [session]);

  const enterRoom = useCallback((roomIndex: number) => {
    const room = rooms[roomIndex];
    if (!room) return;

    // Check if room can be unlocked
    if (!room.unlocked && !canUnlockRoom(room, state)) {
      setNarrativeMessage(room.lock.lock_description);
      return;
    }

    // Unlock and enter
    setRooms(prev => prev.map(r =>
      r.room_index === roomIndex ? { ...r, unlocked: true } : r
    ));

    setState(prev => ({
      ...prev,
      current_room_index: roomIndex,
      current_puzzle_index: 0,
      phase: "exploring",
      rooms_unlocked: prev.rooms_unlocked.includes(roomIndex)
        ? prev.rooms_unlocked
        : [...prev.rooms_unlocked, roomIndex],
      events: [...prev.events, {
        type: "room_unlocked",
        timestamp: new Date().toISOString(),
        room_index: roomIndex,
        details: {},
      }],
    }));

    setNarrativeMessage(room.entry_narrative);
  }, [rooms, state]);

  // ---------- Puzzle Interaction ----------

  const startPuzzle = useCallback((puzzleIndex: number) => {
    if (!currentRoom) return;
    const puzzle = currentRoom.puzzles[puzzleIndex];
    if (!puzzle) return;

    // Check puzzle dependencies before allowing attempt
    const { canAttempt, blockedBy } = canAttemptPuzzle(puzzle, puzzleDependencyGraph, state);
    if (!canAttempt) {
      const missingItems = blockedBy.filter(id => id.startsWith("item_"));
      if (missingItems.length > 0) {
        setNarrativeMessage("Il vous manque des objets pour tenter ce puzzle. Explorez les salles précédentes.");
      } else {
        setNarrativeMessage("Résolvez d'abord les puzzles précédents pour débloquer celui-ci.");
      }
      return;
    }

    puzzleStartRef.current = Date.now();
    setState(prev => ({
      ...prev,
      current_puzzle_index: puzzleIndex,
      phase: "puzzle",
    }));
  }, [currentRoom, puzzleDependencyGraph, state]);

  const submitAnswer = useCallback((
    answer: string | string[],
    confidence: number
  ) => {
    if (!currentPuzzle || !currentRoom) return null;

    const timeTakenMs = Date.now() - puzzleStartRef.current;
    const hintsUsedForPuzzle = currentPuzzle.attempts; // Simple proxy

    const result = validatePuzzleAnswer(
      currentPuzzle,
      answer,
      confidence,
      timeTakenMs,
      hintsUsedForPuzzle
    );

    // Update puzzle state
    setRooms(prev => prev.map(room => {
      if (room.room_index !== state.current_room_index) return room;
      return {
        ...room,
        puzzles: room.puzzles.map(p => {
          if (p.id !== currentPuzzle.id) return p;
          return {
            ...p,
            solved: result.is_correct ? true : p.solved,
            attempts: p.attempts + 1,
          };
        }),
      };
    }));

    // Record event
    const event: EscapeEvent = {
      type: result.is_correct ? "puzzle_solved" : "puzzle_attempt",
      timestamp: new Date().toISOString(),
      room_index: state.current_room_index,
      puzzle_id: currentPuzzle.id,
      details: {
        concept_key: currentPuzzle.concept_key,
        is_correct: result.is_correct,
        confidence,
        hints_used: hintsUsedForPuzzle,
        bloom_level: currentPuzzle.bloom_level,
        mastery_delta: result.mastery_delta,
        partial_score: result.partial_score,
        time_taken_ms: timeTakenMs,
      },
    };

    setState(prev => {
      const newEvents = [...prev.events, event];
      const newPuzzlesSolved = result.is_correct
        ? [...new Set([...prev.puzzles_solved, currentPuzzle.id])]
        : prev.puzzles_solved;
      const totalCorrect = newEvents.filter(e => e.type === "puzzle_solved").length;
      const totalAttempts = newEvents.filter(e =>
        e.type === "puzzle_solved" || e.type === "puzzle_attempt"
      ).length;

      return {
        ...prev,
        events: newEvents,
        puzzles_solved: newPuzzlesSolved,
        score: prev.score + (result.is_correct ? result.partial_score * 10 : 0),
        accuracy: totalAttempts > 0 ? totalCorrect / totalAttempts : 0,
      };
    });

    // Handle code fragment discovery
    if (result.code_fragment) {
      setState(prev => {
        const newCodes = new Map(prev.codes_discovered);
        newCodes.set(currentPuzzle.id, result.code_fragment!);
        return {
          ...prev,
          codes_discovered: newCodes,
          events: [...prev.events, {
            type: "code_entered" as const,
            timestamp: new Date().toISOString(),
            room_index: state.current_room_index,
            details: { code_fragment: result.code_fragment },
          }],
        };
      });
      setNarrativeMessage(generateEventNarrative("code_discovered", {}));
    }

    // Handle puzzle unlock
    if (result.is_correct && currentPuzzle.unlocks) {
      handlePuzzleUnlock(currentPuzzle.unlocks);
    }

    // Check for newly available puzzles via dependency graph
    if (result.is_correct) {
      const newlyAvailable = getNewlyAvailablePuzzles(
        currentPuzzle.id,
        puzzleDependencyGraph,
        { ...state, puzzles_solved: [...state.puzzles_solved, currentPuzzle.id] }
      );
      if (newlyAvailable.length > 0) {
        setNarrativeMessage(
          newlyAvailable.length === 1
            ? "Un nouveau puzzle est maintenant accessible !"
            : `${newlyAvailable.length} nouveaux puzzles sont maintenant accessibles !`
        );
      }
    }

    return result;
  }, [currentPuzzle, currentRoom, state.current_room_index, puzzleDependencyGraph, state]);

  // ---------- Hints ----------

  const requestHint = useCallback((): EscapeHint | null => {
    if (!currentRoom || !currentPuzzle) return null;

    const level = Math.min(currentPuzzle.attempts + 1, 4) as 1 | 2 | 3 | 4;
    const hint = currentRoom.hints.find(h => h.level === level);

    if (!hint) return null;

    setState(prev => ({
      ...prev,
      hints_used: prev.hints_used + 1,
      events: [...prev.events, {
        type: "hint_used",
        timestamp: new Date().toISOString(),
        room_index: state.current_room_index,
        puzzle_id: currentPuzzle.id,
        details: { level, penalty: hint.score_penalty },
      }],
    }));

    setNarrativeMessage(generateEventNarrative("hint_used", {
      hintsUsed: state.hints_used + 1,
    }));

    return hint;
  }, [currentRoom, currentPuzzle, state]);

  // ---------- Navigation ----------

  const nextPuzzle = useCallback(() => {
    if (!currentRoom) return;

    const nextIndex = state.current_puzzle_index + 1;
    if (nextIndex < currentRoom.puzzles.length) {
      startPuzzle(nextIndex);
    } else {
      // Room complete
      completeRoom(currentRoom.room_index);
    }
  }, [currentRoom, state.current_puzzle_index, startPuzzle]);

  const completeRoom = useCallback((roomIndex: number) => {
    const room = rooms[roomIndex];
    if (!room) return;

    // Mark room as completed
    setRooms(prev => prev.map(r =>
      r.room_index === roomIndex ? { ...r, completed: true } : r
    ));

    // Collect room rewards
    const newItems = collectRoomRewards(room, inventory);
    if (newItems.length > 0) {
      setInventory(prev => [...prev, ...newItems]);
      setState(prev => ({
        ...prev,
        inventory_collected: [...prev.inventory_collected, ...newItems.map(i => i.id)],
        events: [
          ...prev.events,
          ...newItems.map(item => ({
            type: "item_collected" as const,
            timestamp: new Date().toISOString(),
            room_index: roomIndex,
            item_id: item.id,
            details: { item_name: item.name, item_type: item.type },
          })),
        ],
      }));
    }

    setState(prev => {
      const newRoomsCompleted = [...new Set([...prev.rooms_completed, roomIndex])];
      return {
        ...prev,
        rooms_completed: newRoomsCompleted,
        phase: "room_complete",
        events: [...prev.events, {
          type: "room_completed",
          timestamp: new Date().toISOString(),
          room_index: roomIndex,
          details: {},
        }],
      };
    });

    setNarrativeMessage(room.completion_narrative);

    // Check for newly unlockable rooms
    const updatedState = { ...state, rooms_completed: [...state.rooms_completed, roomIndex] };
    const newlyUnlockable = checkUnlockableRooms(rooms, updatedState);
    if (newlyUnlockable.length > 0) {
      setRooms(prev => prev.map(r =>
        newlyUnlockable.includes(r.room_index) ? { ...r, unlocked: true } : r
      ));
    }
  }, [rooms, inventory, state]);

  const proceedToNextRoom = useCallback(() => {
    const nextRoomIndex = state.current_room_index + 1;

    if (nextRoomIndex >= rooms.length) {
      // All rooms complete — go to debrief
      finishGame();
      return;
    }

    enterRoom(nextRoomIndex);
  }, [state.current_room_index, rooms.length, enterRoom]);

  // ---------- Code Lock ----------

  const tryCodeUnlock = useCallback((roomIndex: number, code: string): boolean => {
    const room = rooms[roomIndex];
    if (!room) return false;

    const success = attemptCodeUnlock(room, code);
    if (success) {
      enterRoom(roomIndex);
    } else {
      setNarrativeMessage("Code incorrect. Cherchez d'autres indices.");
    }
    return success;
  }, [rooms, enterRoom]);

  // ---------- Game Completion ----------

  const finishGame = useCallback(() => {
    const totalTimeSec = Math.floor((Date.now() - startTimeRef.current) / 1000);

    setState(prev => ({
      ...prev,
      phase: "debrief",
      total_time_sec: totalTimeSec,
    }));

    // Build debrief
    const conceptResults = buildConceptResults(rooms, state);
    const escapeDebrief = generateEscapeDebrief(
      { ...state, total_time_sec: totalTimeSec },
      rooms,
      conceptResults
    );
    setDebrief(escapeDebrief);

    setNarrativeMessage(escapeDebrief.resolution_narrative);
  }, [rooms, state]);

  // ---------- Puzzle Unlock Handler ----------

  const handlePuzzleUnlock = useCallback((unlock: import("@/domain/cognitio/escapeEngine.types").PuzzleUnlock) => {
    switch (unlock.type) {
      case "room":
        // Will be handled by checkUnlockableRooms
        setNarrativeMessage(unlock.unlock_message);
        break;
      case "item":
        const newItems = collectItem(inventory, unlock.target_id, rooms);
        if (newItems.length > inventory.length) {
          setInventory(newItems);
          setNarrativeMessage(unlock.unlock_message);
        }
        break;
      case "narrative":
        setNarrativeMessage(unlock.unlock_message);
        break;
    }
  }, [inventory, rooms]);

  // ---------- Inventory ----------

  const examineItem = useCallback((itemId: string): string | null => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return null;
    return item.examine_text ?? item.description;
  }, [inventory]);

  /** Discover a hidden element in the current room */
  const discoverElement = useCallback((discoverableId: string): string | null => {
    if (!currentRoom) return null;

    const discoverable = currentRoom.discoverables?.find(d => d.id === discoverableId);
    if (!discoverable || discoverable.discovered) return null;

    // Check visibility condition
    if (discoverable.visible_after_puzzle_id && !state.puzzles_solved.includes(discoverable.visible_after_puzzle_id)) {
      return null; // Not visible yet
    }

    // Mark as discovered
    setRooms(prev => prev.map(r => {
      if (r.room_index !== state.current_room_index) return r;
      return {
        ...r,
        discoverables: r.discoverables?.map(d =>
          d.id === discoverableId ? { ...d, discovered: true } : d
        ) ?? [],
      };
    }));

    // Record event
    setState(prev => ({
      ...prev,
      events: [...prev.events, {
        type: "item_collected" as const,
        timestamp: new Date().toISOString(),
        room_index: state.current_room_index,
        item_id: discoverableId,
        details: { discovery_type: discoverable.type, label: discoverable.label },
      }],
    }));

    // If it grants an item, collect it
    if (discoverable.grants_item_id) {
      const newItems = collectItem(inventory, discoverable.grants_item_id, rooms);
      if (newItems.length > inventory.length) {
        setInventory(newItems);
        setState(prev => ({
          ...prev,
          inventory_collected: [...prev.inventory_collected, discoverable.grants_item_id!],
        }));
      }
    }

    setNarrativeMessage(discoverable.discovery_text);
    return discoverable.discovery_text;
  }, [currentRoom, state, rooms, inventory]);

  /** Use an inventory item on a locked room — validates key_item / multi_key locks */
  const useItem = useCallback((itemId: string, targetRoomIndex: number): boolean => {
    const room = rooms[targetRoomIndex];
    if (!room || room.unlocked) return false;

    const lock = room.lock;
    if (lock.type === "key_item" && lock.required_item_id === itemId) {
      if (state.inventory_collected.includes(itemId)) {
        enterRoom(targetRoomIndex);
        setNarrativeMessage("L'objet a déverrouillé la salle !");
        return true;
      }
    }

    if (lock.type === "multi_key" && lock.required_item_ids?.includes(itemId)) {
      const allPresent = lock.required_item_ids.every(id => state.inventory_collected.includes(id));
      if (allPresent) {
        enterRoom(targetRoomIndex);
        setNarrativeMessage("Tous les objets requis sont combinés — salle déverrouillée !");
        return true;
      } else {
        const remaining = lock.required_item_ids.filter(id => !state.inventory_collected.includes(id)).length;
        setNarrativeMessage(`Il manque encore ${remaining} objet(s) pour déverrouiller cette salle.`);
        return false;
      }
    }

    setNarrativeMessage("Cet objet ne peut pas être utilisé ici.");
    return false;
  }, [rooms, state.inventory_collected, enterRoom]);

  /** Check puzzle accessibility for current puzzle */
  const puzzleAccessibility = useMemo(() => {
    if (!currentRoom) return [];
    return currentRoom.puzzles.map(puzzle => {
      const { canAttempt, blockedBy } = canAttemptPuzzle(puzzle, puzzleDependencyGraph, state);
      return { puzzleId: puzzle.id, canAttempt, blockedBy };
    });
  }, [currentRoom, puzzleDependencyGraph, state]);

  // ---------- Return ----------

  return {
    // State
    state,
    rooms,
    inventory,
    currentRoom,
    currentPuzzle,
    narrativeMessage,
    debrief,
    totalProgress,
    currentHintLevel,
    puzzleAccessibility,

    // Actions
    startGame,
    enterRoom,
    startPuzzle,
    submitAnswer,
    requestHint,
    nextPuzzle,
    proceedToNextRoom,
    tryCodeUnlock,
    finishGame,
    examineItem,
    useItem,
    discoverElement,
  };
}

function createEmptyState(): EscapeGameState {
  return {
    current_room_index: 0,
    current_puzzle_index: 0,
    phase: "briefing",
    rooms_unlocked: [],
    rooms_completed: [],
    puzzles_solved: [],
    inventory_collected: [],
    codes_discovered: new Map(),
    score: 0,
    accuracy: 0,
    hints_used: 0,
    total_time_sec: 0,
    events: [],
  };
}
