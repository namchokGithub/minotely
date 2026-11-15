import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PageLinkView } from "./page-link-view";

/** `[Title](…/books/{bookId}/notes/{pageId})` alone on a line is a Page line. */
const PAGE_LINE =
  /^\[([^\]\n]*)\]\((?:[^)\s]*?)\/books\/([^/\s)]+)\/notes\/([^/\s)#?]+)\)[ \t]*(?:\n|$)/;

/**
 * Page line (D50): a sub-page shown as one line of the parent's content. It
 * stores only the page's id (plus its book and a title snapshot for Markdown
 * and plain text); the line always shows the page's live title, and editing
 * the text renames the page. In Markdown it is a link to the page on its own
 * line, so Raw mode, copy, paste and export keep it.
 */
export const PageLink = Node.create({
  name: "pageLink",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      pageId: { default: null },
      bookId: { default: null },
      /** Last known title, for Markdown export and search text only. */
      title: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="page-link"]',
        getAttrs: (element) => ({
          pageId: element.getAttribute("data-page-id"),
          bookId: element.getAttribute("data-book-id"),
          title: element.textContent ?? "",
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "page-link",
        "data-page-id": node.attrs.pageId,
        "data-book-id": node.attrs.bookId,
      }),
      node.attrs.title || "Untitled",
    ];
  },

  renderText({ node }) {
    return node.attrs.title || "Untitled";
  },

  markdownTokenName: "pageLink",

  markdownTokenizer: {
    name: "pageLink",
    level: "block",
    start: (src: string) => src.search(/^\[[^\]\n]*\]\([^)\s]*\/notes\//m),
    tokenize: (src: string) => {
      const match = PAGE_LINE.exec(src);
      if (!match) return undefined;
      return {
        type: "pageLink",
        raw: match[0],
        title: match[1],
        bookId: match[2],
        pageId: match[3],
      };
    },
  },

  parseMarkdown: (token, helpers) =>
    helpers.createNode("pageLink", {
      title: token.title ?? "",
      bookId: token.bookId ?? null,
      pageId: token.pageId ?? null,
    }),

  renderMarkdown: (node) => {
    const attrs = node.attrs ?? {};
    const title = String(attrs.title || "Untitled").replace(/[[\]]/g, "");
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return `[${title}](${origin}/books/${attrs.bookId}/notes/${attrs.pageId})`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageLinkView);
  },
});
