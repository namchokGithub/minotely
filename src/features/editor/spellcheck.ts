import { Decoration, Extension, type Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type nspell from "nspell";

type SpellEngine = ReturnType<typeof nspell>;

export type SpellingError = {
  from: number;
  to: number;
  word: string;
};

type SpellcheckStorage = {
  checkedDoc: ProseMirrorNode | null;
  errors: SpellingError[];
};

export type SpellingTarget = {
  error: SpellingError;
  checkedDoc: ProseMirrorNode;
  suggestions: string[];
};

export const EnglishSpellcheck = Extension.create<
  Record<string, never>,
  SpellcheckStorage
>({
  name: "englishSpellcheck",
  addStorage() {
    return { checkedDoc: null, errors: [] };
  },
  addDecorations() {
    return {
      update: "document",
      create: ({ state }) => {
        if (this.storage.checkedDoc !== state.doc) return [];
        return this.storage.errors.map(({ from, to }) =>
          Decoration.Inline(from, to, { class: "spelling-error" }),
        );
      },
    };
  },
});

const wordPattern = /\b[A-Za-z]+(?:['’][A-Za-z]+)*\b/g;
const excludedPattern = /https?:\/\/\S+|www\.\S+|\b[\w.+-]+@[\w.-]+\.\w+\b/g;
const localWordsKey = (uid: string) => `minotely:english-words:${uid}`;
let dictionaryPromise: Promise<{ aff: string; dic: string }> | undefined;

function loadDictionary() {
  dictionaryPromise ??= Promise.all(
    ["en.aff", "en.dic"].map(async (file) => {
      const response = await fetch(
        `${import.meta.env.BASE_URL}dictionaries/${file}`,
      );
      if (!response.ok)
        throw new Error(`Could not load English dictionary: ${file}`);
      return response.text();
    }),
  )
    .then(([aff, dic]) => ({ aff, dic }))
    .catch((error: unknown) => {
      dictionaryPromise = undefined;
      throw error;
    });
  return dictionaryPromise;
}

function findErrors(
  doc: ProseMirrorNode,
  spell: SpellEngine,
  ignored: Set<string>,
) {
  const errors: SpellingError[] = [];
  doc.descendants((block, blockPos) => {
    if (block.type.spec.code) return false;
    if (!block.isTextblock) return;

    let text = "";
    block.forEach((child) => {
      const code = child.marks.some((mark) => mark.type.spec.code);
      text +=
        child.isText && !code ? (child.text ?? "") : " ".repeat(child.nodeSize);
    });

    const excluded = Array.from(text.matchAll(excludedPattern), (match) => ({
      from: match.index,
      to: match.index + match[0].length,
    }));
    for (const match of text.matchAll(wordPattern)) {
      const word = match[0];
      const normalized = word.replaceAll("’", "'");
      if (
        excluded.some(
          ({ from, to }) => match.index >= from && match.index < to,
        ) ||
        ignored.has(normalized.toLowerCase()) ||
        spell.correct(normalized)
      ) {
        continue;
      }
      const from = blockPos + 1 + match.index;
      errors.push({ from, to: from + word.length, word });
    }
    return false;
  });
  return errors;
}

function getStorage(editor: Editor): SpellcheckStorage {
  return (editor.storage as unknown as { englishSpellcheck: SpellcheckStorage })
    .englishSpellcheck;
}

function readPersonalWords(uid: string): Set<string> {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(localWordsKey(uid)) ?? "[]",
    );
    if (!Array.isArray(stored)) return new Set();
    return new Set(
      stored.filter(
        (word): word is string =>
          typeof word === "string" && /^[A-Za-z][A-Za-z'’-]{0,63}$/.test(word),
      ),
    );
  } catch {
    return new Set();
  }
}

/** Decorations are editor-only state; refreshing them does not change the saved note. */
export async function startEnglishSpellcheck(editor: Editor, uid: string) {
  const [{ default: createSpell }, dictionary] = await Promise.all([
    import("nspell"),
    loadDictionary(),
  ]);
  if (editor.isDestroyed) return null;

  const spell = createSpell(dictionary);
  const personalWords = readPersonalWords(uid);
  for (const word of personalWords) spell.add(word);
  const ignored = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const check = () => {
    if (editor.isDestroyed) return;
    if (editor.view.composing) {
      schedule();
      return;
    }
    const checkedDoc = editor.state.doc;
    const storage = getStorage(editor);
    storage.checkedDoc = checkedDoc;
    storage.errors = findErrors(checkedDoc, spell, ignored);
    editor.commands.updateDecorations("englishSpellcheck");
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(check, 300);
  };
  editor.on("update", schedule);
  check();

  return {
    at(position: number): SpellingTarget | null {
      const storage = getStorage(editor);
      if (storage.checkedDoc !== editor.state.doc) check();
      const checkedDoc = storage.checkedDoc;
      if (!checkedDoc || checkedDoc !== editor.state.doc) return null;
      const error = storage.errors.find(
        ({ from, to }) =>
          (position >= from && position < to) || position === to,
      );
      if (!error) return null;
      return {
        error,
        checkedDoc,
        suggestions: spell.suggest(error.word.replaceAll("’", "'")).slice(0, 5),
      };
    },
    replace(target: SpellingTarget, replacement: string) {
      if (editor.isDestroyed || !editor.isEditable) return;
      const { from, to, word } = target.error;
      if (
        editor.state.doc !== target.checkedDoc ||
        editor.state.doc.textBetween(from, to, "") !== word
      )
        return;
      editor.view.dispatch(editor.state.tr.insertText(replacement, from, to));
      editor.commands.focus();
    },
    ignore(word: string) {
      ignored.add(word.replaceAll("’", "'").toLowerCase());
      check();
    },
    add(word: string): boolean {
      const normalized = word.replaceAll("’", "'").toLowerCase();
      if (!/^[a-z][a-z'-]{0,63}$/.test(normalized)) return false;
      const next = new Set([...personalWords, normalized]);
      if (next.size > 1000) return false;
      try {
        localStorage.setItem(localWordsKey(uid), JSON.stringify([...next]));
      } catch {
        return false;
      }
      personalWords.add(normalized);
      spell.add(normalized);
      check();
      return true;
    },
    destroy() {
      clearTimeout(timer);
      editor.off("update", schedule);
    },
  };
}

export type EnglishSpellcheckController = NonNullable<
  Awaited<ReturnType<typeof startEnglishSpellcheck>>
>;
