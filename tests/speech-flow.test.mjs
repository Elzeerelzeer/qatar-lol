import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("routes every spoken line through one Arabic speech engine", () => {
  assert.match(pageSource, /function chooseArabicVoice/);
  assert.match(pageSource, /addEventListener\("voiceschanged"/);
  assert.match(pageSource, /function splitSpeechIntoChunks/);
  assert.match(pageSource, /utterance\.lang = voice\?\.lang \|\| "ar-SA"/);
  assert.equal((pageSource.match(/new SpeechSynthesisUtterance/g) ?? []).length, 1);
  assert.doesNotMatch(pageSource, /window\.speechSynthesis\.speak/);
});

test("keeps the main Qatari pronunciations separate from visible text", () => {
  assert.match(pageSource, /replaceAll\("قطر لوّل", "قَطَر لَوَّل"\)/);
  assert.match(pageSource, /replaceAll\("مرحبا الساع،", "مَرْحَبَا السَّاعْ\."\)/);
  assert.match(pageSource, /const maxChunkLength = 180/);
  assert.match(pageSource, /replaceAll\("الحين", "الحِين"\)/);
  assert.match(pageSource, /replaceAll\("وياي", "وِيَّاي"\)/);
});
