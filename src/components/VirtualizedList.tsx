import React, { ReactNode, memo, useMemo, useCallback } from "react";
import { FixedSizeList } from "react-window";

type VirtualizedListProps<T> = {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscanCount?: number;
};

function VirtualizedListComponent<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscanCount = 5,
}: VirtualizedListProps<T>) {
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];
    return (
      <div style={style}>
        {renderItem(item, index)}
      </div>
    );
  }, [items, renderItem]);

  const itemCount = useMemo(() => items.length, [items.length]);

  return (
    <FixedSizeList
      height={height}
      itemCount={itemCount}
      itemSize={itemHeight}
      width="100%"
      overscanCount={overscanCount}
    >
      {Row}
    </FixedSizeList>
  );
}

export const VirtualizedList = memo(VirtualizedListComponent) as typeof VirtualizedListComponent;
