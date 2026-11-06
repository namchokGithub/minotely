import { Decoration, Extension, type Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type nspell from "nspell";

type SpellEngine = ReturnType<typeof nspell>;
type Language = "en" | "th";

export type SpellingError = {
  from: number;
  to: number;
  word: string;
  language: Language;
};

type SpellcheckStorage = {
  enabled: boolean;
  checkedDoc: ProseMirrorNode | null;
  errors: SpellingError[];
};

export type SpellingTarget = {
  error: SpellingError;
  checkedDoc: ProseMirrorNode;
  suggestions: string[];
};

export const NoteSpellcheck = Extension.create<
  Record<string, never>,
  SpellcheckStorage
>({
  name: "noteSpellcheck",
  addStorage() {
    return { enabled: true, checkedDoc: null, errors: [] };
  },
  addDecorations() {
    return {
      update: "document",
      create: ({ state }) => {
        if (!this.storage.enabled || this.storage.checkedDoc !== state.doc)
          return [];
        return this.storage.errors.map(({ from, to }) =>
          Decoration.Inline(from, to, { class: "spelling-error" }),
        );
      },
    };
  },
});

const wordPattern = /\b[A-Za-z]+(?:['’][A-Za-z]+)*\b/g;
const excludedPattern = /https?:\/\/\S+|www\.\S+|\b[\w.+-]+@[\w.-]+\.\w+\b/g;
const thaiPattern = /^[\u0e01-\u0e3a\u0e40-\u0e4e]+$/u;
const localWordsKey = (uid: string, language: Language) =>
  `minotely:${language === "en" ? "english" : "thai"}-words:${uid}`;
const enabledKey = (uid: string) => `minotely:spellcheck-enabled:${uid}`;
const dictionaryPromises: Partial<
  Record<Language, Promise<{ aff: string; dic: string }>>
> = {};

function loadDictionary(language: Language) {
  dictionaryPromises[language] ??= Promise.all(
    [`${language}.aff`, `${language}.dic`].map(async (file) => {
      const response = await fetch(
        `${import.meta.env.BASE_URL}dictionaries/${file}`,
      );
      if (!response.ok)
        throw new Error(`Could not load ${language} dictionary: ${file}`);
      return response.text();
    }),
  )
    .then(([aff, dic]) => ({ aff, dic }))
    .catch((error: unknown) => {
      dictionaryPromises[language] = undefined;
      throw error;
    });
  return dictionaryPromises[language];
}

function findErrors(
  doc: ProseMirrorNode,
  spells: Record<Language, SpellEngine>,
  ignored: Record<Language, Set<string>>,
  thaiSegmenter: Intl.Segmenter,
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
        ignored.en.has(normalized.toLowerCase()) ||
        spells.en.correct(normalized)
      ) {
        continue;
      }
      const from = blockPos + 1 + match.index;
      errors.push({ from, to: from + word.length, word, language: "en" });
    }

    for (const segment of thaiSegmenter.segment(text)) {
      const word = segment.segment;
      if (
        !segment.isWordLike ||
        !thaiPattern.test(word) ||
        excluded.some(
          ({ from, to }) => segment.index >= from && segment.index < to,
        ) ||
        ignored.th.has(word) ||
        spells.th.correct(word)
      ) {
        continue;
      }
      const from = blockPos + 1 + segment.index;
      errors.push({ from, to: from + word.length, word, language: "th" });
    }
    return false;
  });
  return errors;
}

function getStorage(editor: Editor): SpellcheckStorage {
  return (editor.storage as unknown as { noteSpellcheck: SpellcheckStorage })
    .noteSpellcheck;
}

export function getSpellcheckEnabled(uid: string): boolean {
  try {
    return localStorage.getItem(enabledKey(uid)) !== "false";
  } catch {
    return true;
  }
}

export function saveSpellcheckEnabled(uid: string, enabled: boolean): boolean {
  try {
    localStorage.setItem(enabledKey(uid), String(enabled));
    return true;
  } catch {
    return false;
  }
}

function readPersonalWords(uid: string, language: Language): Set<string> {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(localWordsKey(uid, language)) ?? "[]",
    );
    if (!Array.isArray(stored)) return new Set();
    return new Set(
      stored.filter(
        (word): word is string =>
          typeof word === "string" &&
          (language === "en"
            ? /^[A-Za-z][A-Za-z'’-]{0,63}$/.test(word)
            : word.length <= 64 && thaiPattern.test(word)),
      ),
    );
  } catch {
    return new Set();
  }
}

/** Decorations are editor-only state; refreshing them does not change the saved note. */
export async function startNoteSpellcheck(editor: Editor, uid: string) {
  const [{ default: createSpell }, english, thai] = await Promise.all([
    import("nspell"),
    loadDictionary("en"),
    loadDictionary("th"),
  ]);
  if (editor.isDestroyed) return null;

  const spells = { en: createSpell(english), th: createSpell(thai) };
  const personalWords = {
    en: readPersonalWords(uid, "en"),
    th: readPersonalWords(uid, "th"),
  };
  for (const language of ["en", "th"] as const) {
    for (const word of personalWords[language]) spells[language].add(word);
  }
  const ignored = { en: new Set<string>(), th: new Set<string>() };
  const thaiSegmenter = new Intl.Segmenter("th", { granularity: "word" });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const storage = getStorage(editor);
  storage.enabled = getSpellcheckEnabled(uid);

  const check = () => {
    if (editor.isDestroyed || !storage.enabled) return;
    if (editor.view.composing) {
      schedule();
      return;
    }
    const checkedDoc = editor.state.doc;
    storage.checkedDoc = checkedDoc;
    storage.errors = findErrors(checkedDoc, spells, ignored, thaiSegmenter);
    editor.commands.updateDecorations("noteSpellcheck");
  };
  const schedule = () => {
    if (!storage.enabled) return;
    clearTimeout(timer);
    timer = setTimeout(check, 300);
  };
  editor.on("update", schedule);
  if (storage.enabled) check();

  return {
    setEnabled(enabled: boolean) {
      if (storage.enabled === enabled) return;
      storage.enabled = enabled;
      clearTimeout(timer);
      if (enabled) check();
      else {
        storage.checkedDoc = null;
        storage.errors = [];
        editor.commands.updateDecorations("noteSpellcheck");
      }
    },
    at(position: number): SpellingTarget | null {
      if (!storage.enabled) return null;
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
        suggestions: spells[error.language]
          .suggest(error.word.replaceAll("’", "'"))
          .slice(0, 5),
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
    ignore(error: SpellingError) {
      ignored[error.language].add(
        error.language === "en"
          ? error.word.replaceAll("’", "'").toLowerCase()
          : error.word,
      );
      check();
    },
    add(error: SpellingError): boolean {
      const { language } = error;
      const normalized =
        language === "en"
          ? error.word.replaceAll("’", "'").toLowerCase()
          : error.word;
      if (
        language === "en"
          ? !/^[a-z][a-z'-]{0,63}$/.test(normalized)
          : normalized.length > 64 || !thaiPattern.test(normalized)
      ) {
        return false;
      }
      const next = new Set([...personalWords[language], normalized]);
      if (next.size > 1000) return false;
      try {
        localStorage.setItem(
          localWordsKey(uid, language),
          JSON.stringify([...next]),
        );
      } catch {
        return false;
      }
      personalWords[language].add(normalized);
      spells[language].add(normalized);
      check();
      return true;
    },
    destroy() {
      clearTimeout(timer);
      editor.off("update", schedule);
    },
  };
}

export type NoteSpellcheckController = NonNullable<
  Awaited<ReturnType<typeof startNoteSpellcheck>>
>;
