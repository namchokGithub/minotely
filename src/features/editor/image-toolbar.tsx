import { useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { NodeSelection } from "@tiptap/pm/state";
import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IMAGE_ALIGNS, type ImageAlign } from "./image";

const ALIGN_ICON = { left: AlignLeft, center: AlignCenter, right: AlignRight };

const selectedImage = (editor: Editor) => {
  const { selection } = editor.state;
  return selection instanceof NodeSelection &&
    selection.node.type.name === "image"
    ? selection.node
    : null;
};

/** Left / center / right above a selected image (D55). */
export function ImageToolbar({ editor }: { editor: Editor }) {
  const align = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      (selectedImage(e)?.attrs.align as ImageAlign | undefined) ?? "left",
  });

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="imageToolbar"
      shouldShow={({ editor: e }) => e.isEditable && selectedImage(e) !== null}
      options={{ placement: "top", offset: 8, flip: true }}
      className="z-40 flex gap-0.5 rounded-lg border bg-popover p-0.5 shadow-md"
    >
      {IMAGE_ALIGNS.map(({ value, label }) => {
        const Icon = ALIGN_ICON[value];
        return (
          <Button
            key={value}
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            title={label}
            aria-pressed={align === value}
            className={cn(align === value && "bg-muted text-foreground")}
            onClick={() =>
              editor
                .chain()
                .focus()
                .updateAttributes("image", { align: value })
                .run()
            }
          >
            <Icon />
          </Button>
        );
      })}
    </BubbleMenu>
  );
}
