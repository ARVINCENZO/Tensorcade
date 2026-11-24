import type { PlayMode } from '@tensorcade/contracts';

/**
 * Metadata and display properties for each educational play mode.
 */
export interface ModeOption {
  readonly mode: PlayMode;
  readonly label: string;
  readonly badge: string;
  readonly description: string;
}

/**
 * Standard registry of play modes in canonical pedagogical progression order.
 */
export const ALL_PLAY_MODES: ReadonlyArray<ModeOption> = [
  {
    mode: 'explorer',
    label: 'Explorer',
    badge: 'Blocks',
    description: 'Visual block programming with live Python code transpilation',
  },
  {
    mode: 'builder',
    label: 'Builder',
    badge: 'Parsons',
    description: 'Parsons puzzle structural line assembly with semantic indentation',
  },
  {
    mode: 'hacker',
    label: 'Hacker',
    badge: 'Python',
    description: 'Production Python code editor with real-time linting and diagnostics',
  },
];

/**
 * Props for the segmented play mode switcher control.
 */
export interface ModeSwitcherProps {
  /** The currently active play mode. */
  readonly currentMode: PlayMode;
  /** Supported play modes for the current level (filters visible tabs). */
  readonly supportedModes?: ReadonlyArray<PlayMode> | undefined;
  /** Callback invoked when the learner selects a new play mode. */
  readonly onModeChange: (mode: PlayMode) => void;
  /** Whether the switcher control is disabled (e.g. during code execution). */
  readonly disabled?: boolean | undefined;
  /** Optional additional CSS class names. */
  readonly className?: string | undefined;
}

/**
 * Props for the confirmation modal shown when transitioning from Hacker to visual modes.
 */
export interface IncompatibleTransitionModalProps {
  /** Whether the confirmation dialog is currently open. */
  readonly isOpen: boolean;
  /** Callback invoked when the learner confirms switching modes. */
  readonly onConfirm: () => void;
  /** Callback invoked when the learner cancels the transition and stays in Hacker mode. */
  readonly onCancel: () => void;
  /** Target play mode being transitioned to (e.g. 'explorer' or 'builder'). */
  readonly targetMode?: PlayMode | undefined;
  /** Optional additional CSS class names. */
  readonly className?: string | undefined;
}

/**
 * Props for the graduation prompt modal shown upon level victory in visual modes.
 */
export interface GraduationPromptModalProps {
  /** Whether the graduation prompt modal is currently open. */
  readonly isOpen: boolean;
  /** Callback invoked when the learner accepts the challenge to graduate to Hacker mode. */
  readonly onGraduate: () => void;
  /** Callback invoked when the learner dismisses or defers graduation. */
  readonly onDismiss: () => void;
  /** Play mode in which the learner just cleared the level. */
  readonly completedMode?: PlayMode | undefined;
  /** Optional additional CSS class names. */
  readonly className?: string | undefined;
}
