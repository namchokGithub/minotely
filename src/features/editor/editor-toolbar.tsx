import type { ComponentProps } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  Bold,
  Code2,
  Highlighter,
  Italic,
  Link2,
  ListTodo,
  Palette,
  Table as TableIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { HIGHLIGHT_COLORS, TEXT_COLORS } from "./extensions";
import { NEW_LINK_HREF } from "./link-bubble";

export function EditorToolbar({
  editor,
  disabled = false,
}: {
  editor: Editor;
  /** Locked note: every formatting control is off. */
  disabled?: boolean;
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      highlight: e.isActive("highlight"),
      color: e.getAttributes("textStyle").color as string | undefined,
      codeBlock: e.isActive("codeBlock"),
      table: e.isActive("table"),
      taskList: e.isActive("taskList"),
      link: e.isActive("link"),
    }),
  });
  const chain = () => editor.chain().focus();

  // Selected text becomes a link; with no selection a "link" placeholder is inserted and selected.
  const insertLink = () => {
    if (editor.isActive("link")) return;
    const { from, empty } = editor.state.selection;
    if (!empty) {
      chain().setLink({ href: NEW_LINK_HREF }).run();
      return;
    }
    chain()
      .insertContent({
        type: "text",
        text: "link",
        marks: [{ type: "link", attrs: { href: NEW_LINK_HREF } }],
      })
      .setTextSelection({ from, to: from + 4 })
      .run();
  };

  return (
    <fieldset disabled={disabled} className="contents">
      <div
        role="group"
        aria-label="Formatting"
        className="flex w-max items-center gap-0.5"
      >
        <ToolButton
          label="Bold"
          active={state.bold}
          onClick={() => chain().toggleBold().run()}
        >
          <Bold />
        </ToolButton>
        <ToolButton
          label="Italic"
          active={state.italic}
          onClick={() => chain().toggleItalic().run()}
        >
          <Italic />
        </ToolButton>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ToolButton menu label="Text color" active={Boolean(state.color)}>
              <Palette
                style={state.color ? { color: state.color } : undefined}
              />
            </ToolButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto min-w-44">
            {TEXT_COLORS.map((c) => (
              <DropdownMenuItem
                key={c.value}
                onSelect={() => chain().setColor(c.value).run()}
              >
                <span
                  className="size-3 rounded-full"
                  style={{ background: c.value }}
                />
                {c.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => chain().unsetColor().run()}>
              Default
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ToolButton menu label="Highlight" active={state.highlight}>
              <Highlighter />
            </ToolButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto min-w-44">
            {HIGHLIGHT_COLORS.map((c) => (
              <DropdownMenuItem
                key={c.value}
                onSelect={() => chain().setHighlight({ color: c.value }).run()}
              >
                <span
                  className="size-3 rounded-sm"
                  style={{ background: c.value }}
                />
                {c.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => chain().unsetHighlight().run()}>
              None
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolButton
          label="Checklist"
          active={state.taskList}
          onClick={() => chain().toggleTaskList().run()}
        >
          <ListTodo />
        </ToolButton>
        <ToolButton label="Link" active={state.link} onClick={insertLink}>
          <Link2 />
        </ToolButton>
        <ToolButton
          label="Code block"
          active={state.codeBlock}
          onClick={() => chain().toggleCodeBlock().run()}
        >
          <Code2 />
        </ToolButton>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ToolButton menu label="Table" active={state.table}>
              <TableIcon />
            </ToolButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto min-w-44">
            <DropdownMenuItem
              onSelect={() =>
                chain()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run()
              }
            >
              Insert table
            </DropdownMenuItem>
            {state.table && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => chain().addRowAfter().run()}>
                  Add row
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => chain().addColumnAfter().run()}
                >
                  Add column
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => chain().deleteRow().run()}>
                  Delete row
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => chain().deleteColumn().run()}>
                  Delete column
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => chain().deleteTable().run()}
                >
                  Delete table
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </fieldset>
  );
}

function ToolButton({
  label,
  active,
  className,
  menu = false,
  ...props
}: ComponentProps<typeof Button> & {
  label: string;
  active: boolean;
  /** Opens a menu: no pressed state. */
  menu?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      aria-pressed={menu ? undefined : active}
      className={cn(active && "bg-muted text-foreground", className)}
      {...props}
    />
  );
}
