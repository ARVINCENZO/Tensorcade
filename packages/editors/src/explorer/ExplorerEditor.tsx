import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly';
import { registerCustomBlocks } from './custom-blocks.js';
import { registerPythonGenerators, transpileWorkspaceToPython } from './python-generator.js';
import { tensorcadeDarkTheme } from './token-theme.js';
import { defaultToolboxJson } from './toolbox.js';
import { CodePreviewPane } from './CodePreviewPane.js';

export interface ExplorerEditorProps {
  /**
   * Custom toolbox configuration. Can be a JSON ToolboxDefinition object or XML string.
   * If omitted, Tensorcade's default game + algorithmic toolbox is used.
   */
  toolboxXml?: object | string | undefined;
  /**
   * Initial block state as XML string or serialized JSON.
   */
  initialXml?: string | undefined;
  /**
   * Callback invoked whenever workspace blocks change, providing live transpiled Python code and XML.
   */
  onChange?: ((pythonCode: string, xml: string) => void) | undefined;
  /**
   * Callback to execute the current transpiled Python code against the level simulation.
   */
  onRun?: (() => void) | undefined;
  /**
   * Optional callback when initial XML/JSON parsing fails.
   */
  onError?: ((error: Error) => void) | undefined;
  /**
   * Read-only mode prevents block dragging and editing.
   */
  readOnly?: boolean | undefined;
  className?: string | undefined;
}

/**
 * Blockly Explorer Editor:
 * Two-pane layout with 60% Blockly visual canvas on the left and 40% live PEP 8 Python code preview on the right.
 */
export function ExplorerEditor({
  toolboxXml,
  initialXml,
  onChange,
  onRun,
  onError,
  readOnly = false,
  className = '',
}: ExplorerEditorProps): React.JSX.Element {
  const blocklyDivRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [pythonCode, setPythonCode] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !blocklyDivRef.current) {
      return;
    }

    // Ensure custom blocks and generators are registered
    registerCustomBlocks();
    registerPythonGenerators();

    // Determine toolbox configuration
    let toolboxConfig: Blockly.utils.toolbox.ToolboxDefinition | Element | string =
      defaultToolboxJson as unknown as Blockly.utils.toolbox.ToolboxDefinition;
    if (toolboxXml) {
      if (typeof toolboxXml === 'string') {
        const trimmed = toolboxXml.trim();
        if (trimmed.startsWith('<')) {
          toolboxConfig = trimmed;
        } else {
          try {
            toolboxConfig = JSON.parse(trimmed) as Blockly.utils.toolbox.ToolboxDefinition;
          } catch {
            toolboxConfig = trimmed;
          }
        }
      } else {
        toolboxConfig = toolboxXml as Blockly.utils.toolbox.ToolboxDefinition;
      }
    }

    // Inject Blockly workspace with Tensorcade Dark Theme
    const workspace = Blockly.inject(blocklyDivRef.current, {
      toolbox: toolboxConfig,
      theme: tensorcadeDarkTheme,
      renderer: 'zelos',
      grid: {
        spacing: 20,
        length: 3,
        colour: '#232E42',
        snap: true,
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2,
      },
      trashcan: true,
      sounds: false,
      readOnly,
    });

    workspaceRef.current = workspace;

    // Load initial state if supplied
    if (initialXml) {
      try {
        const trimmed = initialXml.trim();
        if (trimmed.startsWith('<')) {
          const dom = Blockly.utils.xml.textToDom(trimmed);
          Blockly.Xml.domToWorkspace(dom, workspace);
        } else {
          const parsed = JSON.parse(trimmed) as Record<string, unknown>;
          Blockly.serialization.workspaces.load(parsed, workspace);
        }
        setLoadError(null);
      } catch (err) {
        console.error('Failed to parse initialXml in ExplorerEditor:', err);
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setLoadError(`Failed to load blocks: ${errorObj.message}`);
        onError?.(errorObj);
      }
    }

    // Transpile initial workspace state
    const initialCode = transpileWorkspaceToPython(workspace);
    const initialDom = Blockly.Xml.workspaceToDom(workspace);
    const initialXmlStr = Blockly.Xml.domToText(initialDom);
    setPythonCode(initialCode);
    onChange?.(initialCode, initialXmlStr);

    // Attach reactive listener for live transpilation
    const changeListener = (event: Blockly.Events.Abstract) => {
      if (event.isUiEvent) {
        return;
      }
      const code = transpileWorkspaceToPython(workspace);
      const dom = Blockly.Xml.workspaceToDom(workspace);
      const xmlStr = Blockly.Xml.domToText(dom);
      setPythonCode(code);
      onChange?.(code, xmlStr);
    };

    workspace.addChangeListener(changeListener);

    // Window resize observer to ensure Blockly adjusts its SVG surface cleanly
    const resizeObserver = new ResizeObserver(() => {
      Blockly.svgResize(workspace);
    });
    if (blocklyDivRef.current) {
      resizeObserver.observe(blocklyDivRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      workspace.removeChangeListener(changeListener);
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, [toolboxXml, initialXml, readOnly, onChange, onError]);

  return (
    <div
      className={`flex h-full w-full flex-row overflow-hidden bg-[#0B0F17] ${className}`}
      data-testid="explorer-editor"
    >
      {/* Left Pane: 60% Blockly Workspace */}
      <div
        className="relative flex h-full w-[60%] flex-col border-r border-[#232E42]"
        data-testid="blockly-container"
      >
        {loadError ? (
          <div
            role="alert"
            className="absolute top-2 left-2 right-2 z-10 px-3 py-2 text-xs font-mono bg-red-950/90 border border-red-500/60 text-red-200 rounded flex items-center justify-between"
          >
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => setLoadError(null)}
              className="text-red-400 hover:text-red-200 ml-2 font-bold select-none cursor-pointer"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        ) : null}
        <div ref={blocklyDivRef} className="h-full w-full" data-testid="blockly-workspace-mount" />
      </div>

      {/* Right Pane: 40% Read-Only Live Python Code Preview */}
      <div
        className="flex h-full w-[40%] flex-col bg-[#0B0F17]"
        data-testid="code-preview-container"
      >
        <CodePreviewPane code={pythonCode} onRun={onRun} readOnly={readOnly} />
      </div>
    </div>
  );
}
