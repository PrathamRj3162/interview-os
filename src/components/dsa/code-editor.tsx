"use client";

import { useEffect, useRef } from "react";
import { EditorState, Compartment, Prec } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, placeholder as cmPlaceholder } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { indentOnInput, bracketMatching, syntaxHighlighting, HighlightStyle, indentUnit } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { tags as t } from "@lezer/highlight";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import type { Lang } from "@/lib/dsa/types";

const LANGUAGE = { python: () => python(), javascript: () => javascript(), cpp: () => cpp(), java: () => java() } satisfies Record<Lang, () => unknown>;

// Colours come from the design tokens, so both themes (neon / high contrast) just work.
const theme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "transparent", color: "var(--text)", fontSize: "13px" },
  ".cm-scroller": { fontFamily: "var(--font-geist-mono), ui-monospace, monospace", lineHeight: "1.6" },
  ".cm-content": { caretColor: "var(--primary)", padding: "8px 0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--primary)", borderLeftWidth: "2px" },
  "&.cm-focused": { outline: "none" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": { backgroundColor: "rgb(167 139 250 / 0.28) !important" },
  ".cm-gutters": { backgroundColor: "transparent", color: "var(--muted)", border: "none", paddingRight: "4px" },
  ".cm-activeLine": { backgroundColor: "rgb(255 255 255 / 0.035)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--text)" },
  ".cm-matchingBracket": { backgroundColor: "rgb(167 139 250 / 0.25)", outline: "none" },
  ".cm-placeholder": { color: "var(--muted)" },
}, { dark: true });

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword], color: "var(--accent)" },
  { tag: [t.string, t.special(t.string), t.character], color: "var(--success)" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "var(--warning)" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--muted)", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.function(t.variableName))], color: "var(--info)" },
  { tag: [t.typeName, t.className, t.namespace], color: "var(--primary)" },
  { tag: [t.operator, t.punctuation, t.bracket], color: "var(--text)" },
]);

export type CodeEditorProps = {
  value: string;
  language: Lang;
  onChange: (code: string) => void;
  onPaste?: (chars: number) => void;
  onRun?: () => void;
  onSubmit?: () => void;
  readOnly?: boolean;
  label?: string;
};

/** CodeMirror 6 editor. Uncontrolled internally; `value` changes from outside (reset, language switch) replace the doc. */
export function CodeEditor({ value, language, onChange, onPaste, onRun, onSubmit, readOnly, label = "Code editor" }: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const langConf = useRef(new Compartment());
  const roConf = useRef(new Compartment());
  const cb = useRef({ onChange, onPaste, onRun, onSubmit });
  useEffect(() => { cb.current = { onChange, onPaste, onRun, onSubmit }; });

  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(), highlightActiveLineGutter(), highlightActiveLine(), drawSelection(), history(),
          indentOnInput(), bracketMatching(), closeBrackets(), indentUnit.of("    "),
          syntaxHighlighting(highlight), theme, cmPlaceholder("Write your solution here"),
          langConf.current.of(LANGUAGE[language]() as never),
          roConf.current.of(EditorState.readOnly.of(Boolean(readOnly))),
          Prec.highest(keymap.of([
            { key: "Mod-'", run: () => { cb.current.onRun?.(); return true; } },
            { key: "Mod-Shift-Enter", run: () => { cb.current.onSubmit?.(); return true; } },
          ])),
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
          EditorView.updateListener.of((u) => { if (u.docChanged) cb.current.onChange(u.state.doc.toString()); }),
          EditorView.domEventHandlers({
            paste: (e) => { const n = e.clipboardData?.getData("text")?.length ?? 0; if (n) cb.current.onPaste?.(n); return false; },
          }),
          EditorView.contentAttributes.of({ "aria-label": label, "data-testid": "code-editor" }),
        ],
      }),
    });
    view.current = v;
    return () => { v.destroy(); view.current = null; };
    // Created once; language/readOnly/value are reconfigured below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { view.current?.dispatch({ effects: langConf.current.reconfigure(LANGUAGE[language]() as never) }); }, [language]);
  useEffect(() => { view.current?.dispatch({ effects: roConf.current.reconfigure(EditorState.readOnly.of(Boolean(readOnly))) }); }, [readOnly]);
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [value]);

  return <div ref={host} className="h-full min-h-0 overflow-hidden [&_.cm-editor]:h-full" />;
}
