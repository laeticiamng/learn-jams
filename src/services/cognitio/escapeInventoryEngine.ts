// ============================================================
// Escape Inventory Engine — Manages the pedagogical inventory
// system: collecting, examining, and using items.
// ============================================================

import type {
  InventoryItem,
  InventoryItemType,
  EscapeRoom,
  EscapeGameState,
} from "@/domain/cognitio/escapeEngine.types";

// ---------- Inventory Operations ----------

/**
 * Collect an item and add it to the inventory.
 * Returns the updated inventory.
 */
export function collectItem(
  inventory: InventoryItem[],
  itemId: string,
  rooms: EscapeRoom[]
): InventoryItem[] {
  // Find the item across all rooms
  for (const room of rooms) {
    const item = room.rewards.find(r => r.id === itemId);
    if (item && !item.collected) {
      return [...inventory, { ...item, collected: true }];
    }
  }
  return inventory;
}

/**
 * Check if a specific item is in the inventory.
 */
export function hasItem(inventory: InventoryItem[], itemId: string): boolean {
  return inventory.some(item => item.id === itemId && item.collected);
}

/**
 * Check if all required items are present.
 */
export function hasAllItems(inventory: InventoryItem[], requiredIds: string[]): boolean {
  return requiredIds.every(id => hasItem(inventory, id));
}

/**
 * Get all key items in the inventory.
 */
export function getKeyItems(inventory: InventoryItem[]): InventoryItem[] {
  return inventory.filter(item => item.is_key_item && item.collected);
}

/**
 * Get items grouped by type.
 */
export function getItemsByType(inventory: InventoryItem[]): Record<InventoryItemType, InventoryItem[]> {
  const grouped: Record<InventoryItemType, InventoryItem[]> = {
    document: [],
    artifact: [],
    clue: [],
    key: [],
    data: [],
    protocol: [],
    badge: [],
    fragment: [],
  };

  for (const item of inventory) {
    if (item.collected) {
      grouped[item.type].push(item);
    }
  }

  return grouped;
}

/**
 * Get total collectible items across all rooms.
 */
export function getTotalCollectibles(rooms: EscapeRoom[]): number {
  return rooms.reduce((sum, room) => sum + room.rewards.length, 0);
}

/**
 * Get completion percentage for item collection.
 */
export function getCollectionProgress(inventory: InventoryItem[], rooms: EscapeRoom[]): number {
  const total = getTotalCollectibles(rooms);
  if (total === 0) return 100;
  const collected = inventory.filter(i => i.collected).length;
  return Math.round((collected / total) * 100);
}

/**
 * Auto-collect rewards for a completed room.
 * Returns the new items collected.
 */
export function collectRoomRewards(
  room: EscapeRoom,
  currentInventory: InventoryItem[]
): InventoryItem[] {
  const newItems: InventoryItem[] = [];

  for (const reward of room.rewards) {
    if (!currentInventory.some(i => i.id === reward.id)) {
      newItems.push({ ...reward, collected: true });
    }
  }

  return newItems;
}

/**
 * Get examine text for an inventory item.
 */
export function examineItem(item: InventoryItem): string {
  if (item.examine_text) return item.examine_text;
  return `${item.name}: ${item.description}`;
}

/**
 * Check if using an item is required for any locked room.
 */
export function getItemUsage(
  item: InventoryItem,
  rooms: EscapeRoom[]
): { needed_for: string[]; used: boolean } {
  const neededFor: string[] = [];

  for (const room of rooms) {
    if (room.lock.type === "key_item" && room.lock.required_item_id === item.id) {
      neededFor.push(room.title);
    }
    if (room.lock.type === "multi_key" && room.lock.required_item_ids?.includes(item.id)) {
      neededFor.push(room.title);
    }
  }

  return {
    needed_for: neededFor,
    used: neededFor.some(title => rooms.find(r => r.title === title)?.unlocked),
  };
}

// ---------- Inventory Summary ----------

export interface InventorySummary {
  total_items: number;
  collected_items: number;
  key_items_collected: number;
  key_items_total: number;
  badges_earned: number;
  collection_percentage: number;
  items_by_type: Record<InventoryItemType, number>;
}

/**
 * Generate a summary of the current inventory state.
 */
export function getInventorySummary(
  inventory: InventoryItem[],
  rooms: EscapeRoom[]
): InventorySummary {
  const allRewards = rooms.flatMap(r => r.rewards);
  const collectedItems = inventory.filter(i => i.collected);

  const keyItemsTotal = allRewards.filter(r => r.is_key_item).length;
  const keyItemsCollected = collectedItems.filter(i => i.is_key_item).length;
  const badgesEarned = collectedItems.filter(i => i.type === "badge").length;

  const itemsByType: Record<InventoryItemType, number> = {
    document: 0,
    artifact: 0,
    clue: 0,
    key: 0,
    data: 0,
    protocol: 0,
    badge: 0,
    fragment: 0,
  };

  for (const item of collectedItems) {
    itemsByType[item.type]++;
  }

  return {
    total_items: allRewards.length,
    collected_items: collectedItems.length,
    key_items_collected: keyItemsCollected,
    key_items_total: keyItemsTotal,
    badges_earned: badgesEarned,
    collection_percentage: getCollectionProgress(inventory, rooms),
    items_by_type: itemsByType,
  };
}
