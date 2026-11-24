import type { ParsonsBlock } from '@tensorcade/contracts';

export interface SolutionBlockState {
  id: string;
  indent: number; // 0, 4, or 8 spaces
  blankValues?: Record<string, string>;
}

export interface BuilderEditorProps {
  blocks: ReadonlyArray<ParsonsBlock>;
  initialOrder?: ReadonlyArray<SolutionBlockState>;
  onChange?: (pythonCode: string) => void;
  onRun?: () => void;
  className?: string;
  readOnly?: boolean;
}
