// Barrel export for hooks - improves tree shaking and import performance
export { useIsMobile, useIsTablet, useViewportSize, useOrientation } from "./use-mobile";
export { useMobileGestures } from "./useMobileGestures";
export { useDebounce } from "./useDebounce";
export { usePagination } from "./usePagination";
export { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "./useTasks";
export { useDocuments, useCreateDocument, useUpdateDocument, useDeleteDocument } from "./useDocuments";
export { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from "./useProjects";
export { useAuth } from "./useAuth";
export { useCalendarConnection } from "./useCalendarConnection";
export { useCalendarSync } from "./useCalendarSync";
export { useKeyboardShortcuts } from "./useKeyboardShortcuts";
export { useOfflineDetection } from "./useOfflineDetection";
export { useUserRole } from "./useUserRole";
export { useToast } from "./use-toast";

