import type { Editor } from "@tiptap/react";
import {
  Bold,
  ClipboardPaste,
  Code2,
  Copy,
  Highlighter,
  Italic,
  Link2,
  ListTodo,
  Scissors,
  TextSelect,
} from "lucide-react";
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { shortcut } from "@/lib/shortcuts";
import { insertOrEditLink } from "./links";

/**
 * Right-click menu inside the note (M5.9): clipboard, the most used formatting, Select all. A locked note
 * offers only Copy and Select all.
 */
export function EditorContextItems({ editor }: { editor: Editor }) {
  const editable = editor.isEditable;
  const { empty } = editor.state.selection;
  // Focus first so the editor restores its DOM selection; Copy uses the editor's Markdown handler.
  const clipboard = (command: "copy" | "cut") => {
    editor.commands.focus();
    document.execCommand(command);
  };
  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      editor.chain().focus().insertContent(text).run();
    } catch (error) {
      // Clipboard read needs permission; Ctrl/⌘+V always works.
      console.error("Paste failed", error);
    }
  };
  const chain = () => editor.chain().focus();
  const hint = (keys: string) => (
    <ContextMenuShortcut>{shortcut(keys).label}</ContextMenuShortcut>
  );

  return (
    <>
      {editable && (
        <ContextMenuItem disabled={empty} onSelect={() => clipboard("cut")}>
          <Scissors /> Cut {hint("Mod+X")}
        </ContextMenuItem>
      )}
      <ContextMenuItem disabled={empty} onSelect={() => clipboard("copy")}>
        <Copy /> Copy as Markdown {hint("Mod+C")}
      </ContextMenuItem>
      {editable && (
        <ContextMenuItem onSelect={() => void paste()}>
          <ClipboardPaste /> Paste as text {hint("Mod+Shift+V")}
        </ContextMenuItem>
      )}
      {editable && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => chain().toggleBold().run()}>
            <Bold /> Bold {hint("Mod+B")}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => chain().toggleItalic().run()}>
            <Italic /> Italic {hint("Mod+I")}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => chain().toggleHighlight().run()}>
            <Highlighter /> Highlight {hint("Mod+Shift+H")}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => insertOrEditLink(editor)}>
            <Link2 /> {editor.isActive("link") ? "Edit link" : "Link"}{" "}
            {hint("Mod+K")}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => chain().toggleTaskList().run()}>
            <ListTodo /> Checklist {hint("Mod+Shift+9")}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => chain().toggleCodeBlock().run()}>
            <Code2 /> Code block {hint("Mod+Alt+C")}
          </ContextMenuItem>
        </>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => chain().selectAll().run()}>
        <TextSelect /> Select all {hint("Mod+A")}
      </ContextMenuItem>
    </>
  );
}
