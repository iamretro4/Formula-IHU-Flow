import { useEffect, useRef } from "react";
import { useSwipeable } from "react-swipeable";
import { useIsMobile } from "./use-mobile";

type SwipeDirection = "left" | "right" | "up" | "down";

export function useMobileGestures(
  onSwipe?: (direction: SwipeDirection) => void,
  options?: {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    threshold?: number; // Minimum distance for swipe (default: 50px)
    velocity?: number; // Minimum velocity for swipe (default: 0.3)
  }
) {
  const isMobile = useIsMobile();
  
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      onSwipe?.("left");
      options?.onSwipeLeft?.();
    },
    onSwipedRight: () => {
      onSwipe?.("right");
      options?.onSwipeRight?.();
    },
    onSwipedUp: () => {
      onSwipe?.("up");
      options?.onSwipeUp?.();
    },
    onSwipedDown: () => {
      onSwipe?.("down");
      options?.onSwipeDown?.();
    },
    trackMouse: false,
    trackTouch: true,
    delta: options?.threshold || 50, // Minimum distance
    velocity: options?.velocity || 0.3, // Minimum velocity
    preventScrollOnSwipe: true, // Prevent page scroll during swipe
    touchEventOptions: { passive: false }, // Allow preventDefault
  });

  // Only enable gestures on mobile devices
  if (!isMobile) {
    return {};
  }

  return handlers;
}

