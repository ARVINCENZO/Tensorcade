import type { editor } from 'monaco-editor';

/**
 * Unique identifier for the Tensorcade dark Monaco theme.
 */
export const TENSORCADE_DARK_THEME_NAME = 'tensorcade-dark';

/**
 * Monaco editor theme specification for Tensorcade.
 *
 * Implements the dark retro-futuristic computational laboratory aesthetic:
 * - Base: vs-dark
 * - Background: #0B0F17
 * - Cursor: #00F0FF (Neon Cyan)
 * - Selection: #00F0FF26 (15% Cyan overlay)
 * - Inactive Line Numbers: #4B5563
 * - Active Line Number: #00F0FF
 * - Keywords: #00F0FF
 * - Functions / Defs: #00E599
 * - Strings: #FFB800
 * - Comments: #64748B
 */
export const tensorcadeMonacoDarkTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // Keywords & Language Control
    { token: 'keyword', foreground: '00F0FF', fontStyle: 'bold' },
    { token: 'keyword.control', foreground: '00F0FF', fontStyle: 'bold' },
    { token: 'keyword.operator', foreground: '00F0FF' },
    { token: 'keyword.python', foreground: '00F0FF', fontStyle: 'bold' },

    // Functions, Method Calls & Definitions
    { token: 'entity.name.function', foreground: '00E599' },
    { token: 'support.function', foreground: '00E599' },
    { token: 'meta.function-call', foreground: '00E599' },
    { token: 'identifier.function', foreground: '00E599' },
    { token: 'def', foreground: '00E599' },

    // Strings & Character Literals
    { token: 'string', foreground: 'FFB800' },
    { token: 'string.escape', foreground: 'FFB800' },
    { token: 'string.python', foreground: 'FFB800' },

    // Comments & Docstrings
    { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
    { token: 'comment.python', foreground: '64748B', fontStyle: 'italic' },

    // Numerics, Types, Identifiers & Delimiters
    { token: 'number', foreground: 'F59E0B' },
    { token: 'type', foreground: '38BDF8' },
    { token: 'identifier', foreground: 'F8FAFC' },
    { token: 'delimiter', foreground: '94A3B8' },
  ],
  colors: {
    'editor.background': '#0B0F17',
    'editorCursor.foreground': '#00F0FF',
    'editor.selectionBackground': '#00F0FF26',
    'editorLineNumber.foreground': '#4B5563',
    'editorLineNumber.activeForeground': '#00F0FF',
    'editor.lineHighlightBackground': '#151C2866',
    'editorGutter.background': '#0B0F17',
    'editorIndentGuide.background': '#232E42',
    'editorIndentGuide.activeBackground': '#38BDF8',
  },
};

/** Alias for tensorcadeMonacoDarkTheme */
export const tensorcadeDarkTheme = tensorcadeMonacoDarkTheme;


/**
 * Register the Tensorcade Monaco theme on the given Monaco instance.
 */
export function registerTensorcadeTheme(monacoInstance: {
  editor: {
    defineTheme: (name: string, themeData: editor.IStandaloneThemeData) => void;
  };
}): void {
  monacoInstance.editor.defineTheme(TENSORCADE_DARK_THEME_NAME, tensorcadeMonacoDarkTheme);
}
