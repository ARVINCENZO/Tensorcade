export { HackerEditor } from './HackerEditor.js';
export {
  TENSORCADE_DARK_THEME_NAME,
  tensorcadeMonacoDarkTheme,
  tensorcadeDarkTheme,
  registerTensorcadeTheme,
} from './token-theme.js';
export {
  isRangeIntersectingLocked,
  isLineInRange,
  buildLockedDecorations,
  handleLockedKeyDown,
} from './locked-ranges.js';
export {
  TENSORCADE_MARKER_OWNER,
  formatDiagnosticMarkerMessage,
  applyDiagnosticMarkers,
} from './markers.js';
export type { HackerEditorProps, LockedRange } from './types.js';
