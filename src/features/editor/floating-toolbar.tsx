import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { NodeSelection } from "@tiptap/pm/state";
import { EditorToolbar } from "./editor-toolbar";

/**
 * Floating toolbar over a text selection (D48): Bold, Italic, Text color,
 * Highlight and Link, the same controls as the top toolbar. Not shown for an
 * empty selection, a whole selected block, inside code blocks, or on a link
 * (the link bar shows there).
 */
export function FloatingToolbar({ editor }: { editor: Editor }) {
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="floatingToolbar"
      shouldShow={({ editor: e, state }) =>
        e.isEditable &&
        !state.selection.empty &&
        !(state.selection instanceof NodeSelection) &&
        !e.isActive("codeBlock") &&
        !e.isActive("link")
      }
      options={{
        placement: "top",
        offset: 8,
        flip: true,
        shift: { padding: 8 },
      }}
      className="z-40 rounded-lg border bg-popover p-0.5 shadow-md"
    >
      <EditorToolbar editor={editor} inline />
    </BubbleMenu>
  );
}
