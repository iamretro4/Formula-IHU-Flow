// Dynamic import wrapper for @dnd-kit that ensures React is ready
import { useState, useEffect } from "react";

// Cache for loaded @dnd-kit
let dndKitCache: any = null;
let loadingPromise: Promise<any> | null = null;

async function loadDndKit() {
  if (dndKitCache) return dndKitCache;
  if (loadingPromise) return loadingPromise;
  
  // Ensure React.Children is available
  if (typeof window !== "undefined") {
    let attempts = 0;
    while ((!window.React || !window.React.Children || typeof window.React.Children.map !== 'function') && attempts < 200) {
      await new Promise(resolve => setTimeout(resolve, 10));
      attempts++;
    }
  }
  
  loadingPromise = Promise.all([
    import("@dnd-kit/core"),
    import("@dnd-kit/sortable"),
    import("@dnd-kit/utilities")
  ]).then(([core, sortable, utilities]) => {
    dndKitCache = {
      ...core,
      ...sortable,
      ...utilities
    };
    return dndKitCache;
  });
  
  return loadingPromise;
}

// Hook to get @dnd-kit components
export function useDndKit() {
  const [dndKit, setDndKit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadDndKit().then((mod) => {
      setDndKit(mod);
      setLoading(false);
    });
  }, []);
  
  return { 
    dndKit, 
    loading,
    // Export commonly used components and hooks
    DndContext: dndKit?.DndContext,
    DragOverlay: dndKit?.DragOverlay,
    SortableContext: dndKit?.SortableContext,
    useSortable: dndKit?.useSortable,
    useDroppable: dndKit?.useDroppable,
    closestCorners: dndKit?.closestCorners,
    closestCenter: dndKit?.closestCenter,
    verticalListSortingStrategy: dndKit?.verticalListSortingStrategy,
    CSS: dndKit?.CSS,
    arrayMove: dndKit?.arrayMove,
    sortableKeyboardCoordinates: dndKit?.sortableKeyboardCoordinates,
    KeyboardSensor: dndKit?.KeyboardSensor,
    PointerSensor: dndKit?.PointerSensor,
    useSensor: dndKit?.useSensor,
    useSensors: dndKit?.useSensors,
  };
}

// Dynamic component wrappers
export function DynamicDndContext(props: any) {
  const { dndKit, loading } = useDndKit();
  if (loading || !dndKit) return null;
  const DndContext = dndKit.DndContext;
  return <DndContext {...props} />;
}

export function DynamicSortableContext(props: any) {
  const { dndKit, loading } = useDndKit();
  if (loading || !dndKit) return null;
  const SortableContext = dndKit.SortableContext;
  return <SortableContext {...props} />;
}

export function DynamicDragOverlay(props: any) {
  const { dndKit, loading } = useDndKit();
  if (loading || !dndKit) return null;
  const DragOverlay = dndKit.DragOverlay;
  return <DragOverlay {...props} />;
}

// Export hooks and utilities
export function useDynamicSortable(props: any) {
  const { dndKit, loading } = useDndKit();
  if (loading || !dndKit) return null;
  return dndKit.useSortable ? dndKit.useSortable(props) : null;
}

export function useDynamicDroppable(props: any) {
  const { dndKit, loading } = useDndKit();
  if (loading || !dndKit) return null;
  return dndKit.useDroppable ? dndKit.useDroppable(props) : null;
}

export async function getDndKitCSS(transform: any) {
  const dnd = await loadDndKit();
  return dnd.CSS ? dnd.CSS(transform) : "";
}

export async function getClosestCorners() {
  const dnd = await loadDndKit();
  return dnd.closestCorners;
}

export async function getVerticalListSortingStrategy() {
  const dnd = await loadDndKit();
  return dnd.verticalListSortingStrategy;
}

export async function getClosestCenter() {
  const dnd = await loadDndKit();
  return dnd.closestCenter;
}

export async function getArrayMove() {
  const dnd = await loadDndKit();
  return dnd.arrayMove;
}

export async function getSortableKeyboardCoordinates() {
  const dnd = await loadDndKit();
  return dnd.sortableKeyboardCoordinates;
}

// Re-export types
export type DragEndEvent = any;
export type DragStartEvent = any;

