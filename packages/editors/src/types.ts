import type { PlayMode, ParsonsBlock } from '@tensorcade/contracts';
import type { LevelManifest } from '@tensorcade/levels';

export type EditorMode = PlayMode;

export interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  className?: string;
}

export interface BlocklyEditorProps {
  initialXml?: string;
  onChange?: (xml: string, pythonCode: string) => void;
  toolbox?: Record<string, unknown> | string;
  readOnly?: boolean;
  className?: string;
}

export interface ParsonsEditorProps {
  blocks: ParsonsBlock[];
  onOrderChange?: (orderedIds: string[]) => void;
  className?: string;
}

export interface EditorPanelProps {
  mode: PlayMode;
  level?: LevelManifest;
  code: string;
  onCodeChange?: (code: string) => void;
  className?: string;
}
