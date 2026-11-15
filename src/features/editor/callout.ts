import {
  createBlockMarkdownSpec,
  mergeAttributes,
  Node,
  wrappingInputRule,
} from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      /** Wraps the selected blocks in a callout. */
      setCallout: () => ReturnType;
      /** Wraps the selected blocks in a callout, or lifts them out of one. */
      toggleCallout: () => ReturnType;
    };
  }
}

/**
 * Callout (D48): a highlighted box around one or more blocks, with a 💡 mark
 * drawn by CSS. Markdown: a `:::callout` … `:::` fenced block, so Raw mode,
 * copy, paste and export keep it. Typing `!> ` at the start of a line makes one.
 */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "callout",
        class: "callout",
      }),
      0,
    ];
  },

  ...createBlockMarkdownSpec({ nodeName: "callout", content: "block" }),

  addCommands() {
    return {
      setCallout:
        () =>
        ({ commands }) =>
          commands.wrapIn(this.name),
      toggleCallout:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
    };
  },

  addInputRules() {
    return [wrappingInputRule({ find: /^\s*!>\s$/, type: this.type })];
  },
});
