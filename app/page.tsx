"use client";

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { Accessibility, Anchor, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Camera, Download, Eye, Gamepad2, Home as HomeIcon, House, Play, RotateCcw, Shell, ShoppingBag, Upload, Volume2, VolumeX } from "lucide-react";

type RouteScreen = "sea" | "souq" | "dhow" | "majlis" | "games" | "studio";
type Screen = "gate" | "village" | RouteScreen;
type StationId = RouteScreen | "games" | "studio";
type StationReward = { shells?: number; pearls?: number; score: number };
type JourneyProgress = { completed: StationId[]; shells: number; pearls: number; score: number };

const initialProgress: JourneyProgress = { completed: [], shells: 0, pearls: 0, score: 0 };
const villageGuideMessage = "مرحبا الساع، وحيّاكم الله في قطر لوّل. أنا أبو راشد، وبكون وياكم في هالرحلة. بنزور المحطات ونجمع الأختام. وعندي لكم مفاجأة آخر الرحلة. يالله، نبدأ؟";
const finalJourneyGuideMessage = "ما شاء الله عليكم! جمعتوا الأختام كلها، وكمّلتوا رحلة قطر لوّل. اليوم عشنا شوي من حياة أهل قطر أول؛ من السوق للبحر، ومن الفريج للمجلس والألعاب الشعبية. تراثنا أمانة، وحلو إنّا نعرفه ونحافظ عليه. وهذا ختم أبو راشد لكم... تستاهلون!";

const qatarPraisePhrases = [
  "كفو عليك!",
  "ما شاء الله عليك!",
  "بيض الله وجهك، شغل عدل!",
  "ممتاز!",
  "زين عليك!",
  "كفو!",
];
const qatarRetryPhrases = [
  "قريبة! جرّب مرة ثانية.",
  "مو بعيد... فكّر شوي.",
  "خلّنا نجرب مرة ثانية.",
  "زين، حاول مرة ثانية وبتضبط معاك.",
];
const pickVoicePhrase = (phrases: string[]) => phrases[Math.floor(Math.random() * phrases.length)];
const winVoice = (detail: string) => `${pickVoicePhrase(qatarPraisePhrases)} ${detail}`;
const retryVoice = () => pickVoicePhrase(qatarRetryPhrases);

const stations: Array<{ id: StationId; icon: typeof ShoppingBag; emoji: string; title: string; progressLabel: string; desc: string; image: string; route?: RouteScreen }> = [
  { id: "souq", icon: ShoppingBag, emoji: "🏪", title: "سوق لوّل", progressLabel: "السوق", desc: "اكتشف المهن والأدوات القديمة", image: "/assets/souq-lol.png", route: "souq" },
  { id: "sea", icon: Shell, emoji: "🐚", title: "بحر اللؤلؤ", progressLabel: "البحر", desc: "اجمع المحار وابحث عن الدانة", image: "/assets/pearl-sea-clean.png", route: "sea" },
  { id: "dhow", icon: Anchor, emoji: "🛶", title: "رحلة النوخذة", progressLabel: "النوخذة", desc: "قُد المحمل وتجنّب الصخور", image: "/assets/nokhatha-sea.png", route: "dhow" },
  { id: "majlis", icon: House, emoji: "🏠", title: "مجلس لوّل", progressLabel: "المجلس", desc: "استمع إلى الحكايات وحلّ الألغاز", image: "/assets/majlis-lol.png", route: "majlis" },
  { id: "games", icon: Gamepad2, emoji: "🪁", title: "فريج الألعاب", progressLabel: "الألعاب", desc: "جرّب ألعاب أهل قطر الشعبية", image: "/assets/qatar-lol-gate.png", route: "games" },
  { id: "studio", icon: Camera, emoji: "📸", title: "استوديو قطر لوّل", progressLabel: "الصورة", desc: "اصنع ذكراك التراثية واحفظها", image: "/assets/qatar-lol-gate.png", route: "studio" },
];

type Item = { id: number; x: number; y: number; kind: "shell" | "pearl" };
const makeItems = (): Item[] => Array.from({ length: 9 }, (_, i) => ({ id: Date.now() + i, x: 14 + Math.random() * 72, y: 26 + Math.random() * 58, kind: Math.random() < .18 ? "pearl" : "shell" }));

type VoyageItem = { id: number; x: number; y: number; kind: "marker" | "rock" };
const makeVoyageItems = (): VoyageItem[] => Array.from({ length: 7 }, (_, i) => ({
  id: Date.now() + 100 + i,
  x: 12 + Math.random() * 76,
  y: -8 - i * 16,
  kind: i % 4 === 0 ? "rock" : "marker",
}));
const resetVoyageItem = (item: VoyageItem): VoyageItem => ({
  ...item,
  x: 12 + Math.random() * 76,
  y: -12 - Math.random() * 28,
  kind: Math.random() < .72 ? "marker" : "rock",
});

function tone(frequency: number, duration = .13, type: OscillatorType = "sine") {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type; oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(.12, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration);
  oscillator.connect(gain); gain.connect(context.destination);
  oscillator.start(); oscillator.stop(context.currentTime + duration);
}

function speechText(text: string) {
  return text
    .replaceAll("قطر لوّل", "قَطَر لَوَّل")
    .replaceAll("لوّل", "لَوَّل")
    .replaceAll("مرحبا الساع،", "مَرْحَبَا السَّاعْ.")
    .replaceAll("مرحبا الساع", "مَرْحَبَا السَّاعْ")
    .replaceAll("أبو راشد", "أَبُو رَاشِد")
    .replaceAll("ودّكم", "وِدَّكُمْ")
    .replaceAll("ودّك", "وِدَّك")
    .replaceAll("خلّونا", "خَلُّونا")
    .replaceAll("يالله", "يَلَّا")
    .replaceAll("هني", "هِنِي")
    .replaceAll("الحين", "الحِين")
    .replaceAll("وياي", "وِيَّاي")
    .replaceAll("النوخذة", "النُّوخَذَة")
    .replaceAll("الدلّة", "الدَّلَّة")
    .replaceAll("الفنجان", "الفِنْجان")
    .replaceAll("الدانة", "الدَّانَة")
    .replaceAll("المحمل", "المَحْمَل")
    .replaceAll("…", ".")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSpeechIntoChunks(text: string) {
  const sentences = text.match(/[^.!؟]+[.!؟]?/g)?.map(sentence => sentence.trim()).filter(Boolean) ?? [];
  const maxChunkLength = 180;
  const units: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= maxChunkLength) {
      units.push(sentence);
      continue;
    }
    const parts = sentence.split("،").map(part => part.trim()).filter(Boolean);
    let current = "";
    parts.forEach((part, index) => {
      const phrase = index < parts.length - 1 ? `${part}،` : part;
      const combined = current ? `${current} ${phrase}` : phrase;
      if (current && combined.length > maxChunkLength) {
        units.push(current);
        current = phrase;
      } else {
        current = combined;
      }
    });
    if (current) units.push(current);
  }
  const chunks: string[] = [];
  let current = "";
  for (const unit of units) {
    const combined = current ? `${current} ${unit}` : unit;
    if (current && combined.length > maxChunkLength) {
      chunks.push(current);
      current = unit;
    } else {
      current = combined;
    }
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [text];
}

function chooseArabicVoice(voices: SpeechSynthesisVoice[]) {
  const maleVoiceNames = /naayf|nayef|hamed|hamdan|fahd|zayd|tarik|bassel|rashid|abdullah|salman|male|ذكر/i;
  const score = (voice: SpeechSynthesisVoice) => {
    const language = voice.lang.toLowerCase().replaceAll("_", "-");
    if (!language.startsWith("ar")) return -1;
    let value = language.startsWith("ar-qa") ? 140
      : language.startsWith("ar-sa") ? 125
      : language.startsWith("ar-ae") ? 120
      : /ar-(kw|bh|om)/.test(language) ? 115
      : 70;
    if (/natural|neural/i.test(voice.name)) value += 35;
    if (maleVoiceNames.test(voice.name)) value += 30;
    if (voice.localService) value += 5;
    if (voice.default) value += 2;
    return value;
  };
  return voices.reduce<SpeechSynthesisVoice | null>((best, voice) => {
    if (score(voice) < 0) return best;
    return !best || score(voice) > score(best) ? voice : best;
  }, null);
}

function waitForSpeechVoices(synth: SpeechSynthesis) {
  const currentVoices = synth.getVoices();
  if (currentVoices.some(voice => voice.lang.toLowerCase().startsWith("ar"))) return Promise.resolve(currentVoices);
  return new Promise<SpeechSynthesisVoice[]>(resolve => {
    let timer = 0;
    const finish = () => {
      synth.removeEventListener("voiceschanged", finish);
      window.clearTimeout(timer);
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", finish, { once: true });
    timer = window.setTimeout(finish, 600);
  });
}

type SpeakOptions = {
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
};

let speechRunId = 0;

function cancelSpeech() {
  speechRunId += 1;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

function speak(text: string, options: SpeakOptions = {}) {
  if (!("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  const runId = ++speechRunId;
  synth.cancel();
  const chunks = splitSpeechIntoChunks(speechText(text));
  void waitForSpeechVoices(synth).then(voices => {
    if (runId !== speechRunId) return;
    const voice = chooseArabicVoice(voices);
    let index = 0;
    const speakNext = () => {
      if (runId !== speechRunId || index >= chunks.length) return;
      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = voice?.lang || "ar-SA";
      utterance.rate = options.rate ?? .87;
      utterance.pitch = options.pitch ?? .98;
      if (voice) utterance.voice = voice;
      if (index === 0) utterance.onstart = () => {
        if (runId === speechRunId) options.onStart?.();
      };
      utterance.onend = () => {
        if (runId !== speechRunId) return;
        index += 1;
        if (index < chunks.length) speakNext();
        else options.onEnd?.();
      };
      utterance.onerror = () => {
        if (runId === speechRunId) options.onError?.();
      };
      synth.speak(utterance);
    };
    speakNext();
  });
}

function Guide({ message, autoOpen = true, autoSpeak = true }: { message: string; autoOpen?: boolean; autoSpeak?: boolean }) {
  const [visible, setVisible] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openingMessage = useRef(message);
  const openGuide = () => {
    window.sessionStorage.removeItem("qatar-lol-guide-hidden");
    setVisible(true);
    speak(message);
    window.requestAnimationFrame(() => closeRef.current?.focus());
  };
  const closePanel = () => {
    cancelSpeech();
    window.sessionStorage.setItem("qatar-lol-guide-hidden", "true");
    setVisible(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };
  useEffect(() => {
    if (!autoOpen || window.sessionStorage.getItem("qatar-lol-guide-hidden") === "true") return;
    const timer = window.setTimeout(() => {
      setVisible(true);
      if (autoSpeak) speak(openingMessage.current);
    }, 480);
    return () => window.clearTimeout(timer);
  }, [autoOpen, autoSpeak]);
  useEffect(() => {
    if (!visible) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") closePanel(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [visible]);
  useEffect(() => () => cancelSpeech(), []);
  return <>
    <aside id="heritage-guide-panel" className={"heritage-guide " + (visible ? "guide-open" : "guide-closed")} aria-label="أبو راشد، دليل قطر لوّل" aria-hidden={!visible}>
      <button ref={closeRef} className="guide-close" onClick={closePanel} aria-label="إخفاء أبي راشد" title="إخفاء أبي راشد" tabIndex={visible ? 0 : -1}>×</button>
      <div className="guide-bubble" aria-live="polite"><b>أبو راشد</b><p>{message}</p><button onClick={() => speak(message)} tabIndex={visible ? 0 : -1}><Volume2 size={17}/> استمع إلى التعليمات</button></div>
      <img src="/assets/bu-rashid-maroon.png" alt="أبو راشد، دليل قطر لوّل، يرتدي سديريًا عنابيًا" />
    </aside>
    <button
      ref={triggerRef}
      className={"guide-corner-trigger " + (visible ? "guide-trigger-hidden" : "")}
      onClick={openGuide}
      aria-label="افتح إرشادات أبي راشد واستمع إليها"
      aria-controls="heritage-guide-panel"
      aria-expanded={visible}
      aria-hidden={visible}
      tabIndex={visible ? -1 : 0}
    >
      <span className="guide-trigger-portrait" aria-hidden="true"><img src="/assets/bu-rashid-maroon.png" alt="" /></span>
      <strong>أبو راشد</strong>
      <small>اضغط للاستماع إلى الإرشاد</small>
    </button>
  </>;
}

function JourneyBar({ progress, current, simpleMode, onToggleSimple, onListen }: { progress: JourneyProgress; current: StationId | null; simpleMode: boolean; onToggleSimple: () => void; onListen: () => void }) {
  return <section className="journey-bar" aria-label="تقدّم رحلتي في قطر لوّل">
    <div className="journey-bar-inner">
      <div className="journey-heading"><span>رحلتي في</span><strong>قطر لوّل</strong></div>
      <div className="journey-track" role="list" aria-label={`${progress.completed.length} من أصل ستة أختام`}>
        {stations.map(station => {
          const done = progress.completed.includes(station.id);
          const active = current === station.id;
          return <span key={station.id} role="listitem" className={`journey-step${done ? " done" : ""}${active ? " active" : ""}`} aria-current={active ? "step" : undefined}>
            <b aria-hidden="true">{station.emoji}</b><span>{station.progressLabel}</span><em aria-label={done ? "مكتمل" : "لم يكتمل"}>{done ? "✓" : "○"}</em>
          </span>;
        })}
      </div>
      <div className="journey-stats" aria-label="المقتنيات والنقاط">
        <span>🐚 <b>{progress.shells}</b></span><span>💎 <b>{progress.pearls}</b></span><span>⭐ <b>{progress.score}</b></span>
      </div>
      <div className="journey-actions">
        <button onClick={onListen} className="journey-listen" aria-label="استمع إلى التعليمات"><Volume2 size={18}/><span>استمع إلى التعليمات</span></button>
        <button onClick={onToggleSimple} className="simple-mode-toggle" aria-label={simpleMode ? "إيقاف الوضع المبسّط" : "تشغيل الوضع المبسّط"} aria-pressed={simpleMode}><Accessibility size={20}/><span>الوضع المبسّط</span><i aria-hidden="true"/></button>
      </div>
    </div>
  </section>;
}

const heritageItems = [
  { id: "dallah", emoji: "🫖", name: "الدلّة", fact: "تُستخدم الدلّة في إعداد القهوة العربية وتقديمها، وهي رمز للكرم وحسن الضيافة.", voiceFact: "هذي الدلّة، ومنها نقدّم القهوة العربية للضيف. وهي من رموز الكرم وحسن الضيافة.", x: 14, y: 59 },
  { id: "sadu", emoji: "🧶", name: "السدو", fact: "نسيج تراثي تصنعه النساء من الصوف بأشكال هندسية وألوان جميلة.", voiceFact: "هذا السدو. كانت نساء أهل قطر ينسجنه من الصوف، بأشكال وألوان جميلة.", x: 7, y: 42 },
  { id: "incense", emoji: "✨", name: "المبخرة", fact: "تُستخدم المبخرة لنشر رائحة العود والبخور في المجلس والبيت.", voiceFact: "وهذي المبخرة. نستخدمها عشان نطيّب المجلس والبيت بالعود والبخور.", x: 33, y: 58 },
  { id: "diving", emoji: "🥽", name: "أدوات الغوص", fact: "استخدم الغواص أدوات بسيطة لجمع المحار، ومنها الديين والحجر.", voiceFact: "هذي بعض أدوات الغوص. كان الغواص يجمع المحار في الديين، ويستخدم الحجر عشان ينزل لقاع البحر.", x: 64, y: 53 },
  { id: "jars", emoji: "🏺", name: "الجرار الفخارية", fact: "حفظ أهل قطر الماء وبعض الأطعمة في أوانٍ فخارية تساعد على بقائها باردة.", voiceFact: "هذي الجرار الفخارية. كان أهل قطر يحفظون فيها الماي وبعض الأكل، وتساعدهم يخلّونه بارد.", x: 89, y: 57 },
];

function SouqGame({ onBack, onComplete }: { onBack: () => void; onComplete: (reward: StationReward) => void }) {
  const [found, setFound] = useState<string[]>([]);
  const [selected, setSelected] = useState<(typeof heritageItems)[number] | null>(null);
  const [quiz, setQuiz] = useState(false);
  const [won, setWon] = useState(false);
  const discover = (item: (typeof heritageItems)[number]) => {
    setSelected(item); setFound(old => old.includes(item.id) ? old : [...old, item.id]);
    tone(520, .16, "triangle"); speak(item.voiceFact);
  };
  const answer = (correct: boolean) => {
    if (correct) { setWon(true); onComplete({ score: 100 }); tone(660,.15); setTimeout(() => tone(880,.25),130); speak(winVoice("حصلت على ختم سوق لوّل.")); }
    else { tone(190,.2,"sawtooth"); speak(retryVoice()); }
  };
  return <section className="souq-page min-h-screen p-3 sm:p-6">
    <div className="mx-auto max-w-6xl">
      <header className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-[#33151a]/90 px-4 py-3 text-white backdrop-blur-md">
        <button onClick={onBack} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2"><HomeIcon size={19}/> القرية</button>
        <div className="text-center"><p className="text-xs text-[#ffe39a]">المحطة الأولى</p><h1 className="text-xl font-black sm:text-2xl">سوق لوّل</h1></div>
        <span className="rounded-xl bg-[#7b1734] px-3 py-2 font-black">العناصر: {found.length}/5</span>
      </header>
      <div className="souq-board relative mx-auto aspect-[16/9] min-h-[480px] overflow-hidden rounded-3xl border-2 border-[#e7bd61] shadow-2xl">
        <div className="lantern-glow" aria-hidden="true"/>
        {heritageItems.map(item => <button key={item.id} onClick={() => discover(item)} style={{ left: item.x+"%", top: item.y+"%" }} className={"heritage-hotspot absolute " + (found.includes(item.id) ? "found" : "")} aria-label={"اكتشف "+item.name}><span>{item.emoji}</span><b>{found.includes(item.id) ? item.name : "اكتشف"}</b></button>)}
        <div className="absolute left-1/2 top-5 z-10 -translate-x-1/2 rounded-full bg-[#351318]/90 px-5 py-2 text-center text-sm text-[#ffe4a0] backdrop-blur-md">اضغط على العناصر المتوهجة واكتشف أسرار السوق</div>
        {selected && <div className="souq-item-detail absolute bottom-4 left-1/2 z-20 w-[92%] max-w-xl -translate-x-1/2 rounded-2xl border border-[#f1cf75] bg-[#2c1217]/94 p-5 text-center text-white shadow-2xl"><button onClick={() => setSelected(null)} className="absolute left-3 top-2 text-2xl" aria-label="إغلاق شرح الأداة">×</button><div className="souq-item-detail-icon" aria-hidden="true">{selected.emoji}</div><h2 className="text-2xl font-black text-[#f4d17a]">{selected.name}</h2><p className="mt-2 leading-7">{selected.fact}</p><button onClick={() => speak(selected.voiceFact)} className="mt-3 rounded-xl bg-white/10 px-4 py-2"><Volume2 className="ml-2 inline" size={18}/> استمع مرة أخرى</button></div>}
        {found.length === 5 && !selected && !quiz && !won && <button onClick={() => { setQuiz(true); speak("خلّونا نشوف شطارتكم. أي أداة ترمز لكرم الضيافة؟"); }} className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-2xl bg-[#7b1734] px-7 py-4 text-xl font-black text-white shadow-2xl">ابدأ تحدّي السوق</button>}
        {quiz && !won && <div className="game-overlay absolute inset-0 flex items-center justify-center p-5 text-center"><div className="rounded-3xl border border-[#f1ce73] bg-[#301219]/95 p-7 text-white"><h2 className="text-3xl font-black">أي أداة ترمز إلى كرم الضيافة؟</h2><div className="mt-6 grid grid-cols-2 gap-3"><button onClick={() => answer(true)} className="quiz-choice">🫖 الدلّة</button><button onClick={() => answer(false)} className="quiz-choice">🏺 الجرّة</button><button onClick={() => answer(false)} className="quiz-choice">🧶 السدو</button><button onClick={() => answer(false)} className="quiz-choice">🥽 الديين</button></div></div></div>}
        {won && <div className="game-overlay absolute inset-0 flex items-center justify-center p-5 text-center"><div className="rounded-3xl border border-[#f2d175] bg-[#301219]/95 p-8 text-white"><div className="text-7xl">🏅</div><h2 className="mt-2 text-4xl font-black text-[#f4d277]">ختم سوق لوّل</h2><p className="mt-3 text-xl">أصبحت مستكشفًا لتراث السوق القطري!</p><button onClick={onBack} className="mt-6 rounded-2xl bg-[#7b1734] px-7 py-3 font-black">العودة إلى القرية</button></div></div>}
      </div>
      <Guide message={found.length === 0 ? "يا مرحبا في سوق قطر لوّل. شوفوا الدكاكين من حولكم! هني بنتعرّف على أشياء كان يستخدمها أهل قطر من زمان. قرّبوا، واختاروا الشي اللي ودّكم تعرفون حكايته." : found.length < 5 ? `هني في سوق قطر لوّل. اكتشفتوا ${found.length} من خمس أشياء. كمّلوا البحث.` : "ما شاء الله عليكم! اكتشفتوا الأشياء كلها. الحين ابدؤوا تحدّي السوق عشان تحصلون الختم."}/>
    </div>
  </section>;
}

function PearlGame({ onBack, onComplete }: { onBack: () => void; onComplete: (reward: StationReward) => void }) {
  const [state, setState] = useState<"ready" | "playing" | "ended">("ready");
  const [time, setTime] = useState(60);
  const [score, setScore] = useState(0);
  const [diver, setDiver] = useState({ x: 50, y: 48 });
  const [items, setItems] = useState<Item[]>([]);
  const [flash, setFlash] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [collected, setCollected] = useState({ shells: 0, pearls: 0 });
  const reportedResult = useRef(false);

  const start = () => {
    reportedResult.current = false;
    setTime(60); setScore(0); setCollected({ shells: 0, pearls: 0 }); setDiver({ x: 50, y: 48 }); setItems(makeItems()); setState("playing");
    if (soundOn) { tone(330, .12); window.setTimeout(() => tone(520, .18), 140); speak("شدّ حيلك يا غواص! اجمع المحار، ويمكن تحصل لك دانة!"); }
  };
  const move = useCallback((dx: number, dy: number) => {
    if (state !== "playing") return;
    setDiver(old => {
      const next = { x: Math.max(6, Math.min(94, old.x + dx)), y: Math.max(20, Math.min(88, old.y + dy)) };
      setItems(current => {
        const caught = current.filter(item => Math.hypot(item.x - next.x, item.y - next.y) < 9);
        if (caught.length) {
          const gain = caught.reduce((sum, item) => sum + (item.kind === "pearl" ? 50 : 10), 0);
          setCollected(value => ({
            shells: value.shells + caught.filter(item => item.kind === "shell").length,
            pearls: value.pearls + caught.filter(item => item.kind === "pearl").length,
          }));
          setScore(s => s + gain);
          setFlash(caught.some(i => i.kind === "pearl") ? "💎 حصلت على الدانة! +50" : "🐚 أحسنت! +10");
          if (soundOn) {
            if (caught.some(i => i.kind === "pearl")) { tone(660, .18); window.setTimeout(() => tone(880, .25), 120); speak("ما شاء الله عليك! حصلت لك دانة!"); }
            else tone(440, .16, "triangle");
          }
          window.setTimeout(() => setFlash(""), 850);
          const caughtIds = new Set(caught.map(i => i.id));
          const left = current.filter(i => !caughtIds.has(i.id));
          return left.length < 4 ? [...left, ...makeItems().slice(0, 5)] : left;
        }
        return current;
      });
      return next;
    });
  }, [state, soundOn]);

  useEffect(() => {
    if (state !== "playing") return;
    const timer = window.setInterval(() => setTime(t => {
      if (t <= 1) { setState("ended"); return 0; }
      return t - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  useEffect(() => {
    if (state === "playing" && soundOn && time > 0 && time <= 10) tone(time <= 3 ? 720 : 520, .08, "square");
    if (state === "ended" && soundOn) speak(winVoice(`خلص وقت الغوص، وجمعت ${score} نقطة.`));
  }, [time, state, soundOn, score]);

  useEffect(() => {
    if (state !== "ended" || reportedResult.current) return;
    reportedResult.current = true;
    onComplete({ score, shells: collected.shells, pearls: collected.pearls });
  }, [state, score, collected, onComplete]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const moves: Record<string, [number, number]> = { ArrowLeft: [-5,0], ArrowRight: [5,0], ArrowUp: [0,-5], ArrowDown: [0,5] };
      if (moves[e.key]) { e.preventDefault(); move(...moves[e.key]); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [move]);

  return <section className="sea-page min-h-screen p-3 sm:p-6">
    <div className="mx-auto max-w-6xl">
      <header className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-[#052f43]/85 px-4 py-3 text-white backdrop-blur-md">
        <button onClick={onBack} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 hover:bg-white/20"><HomeIcon size={19}/> القرية</button>
        <div className="text-center"><p className="text-xs text-[#ffe7a1]">المحطة الثانية</p><h1 className="text-xl font-black sm:text-2xl">بحر اللؤلؤ</h1></div>
        <div className="flex gap-2"><span className="rounded-xl bg-[#7b1734] px-3 py-2 font-black">⭐ {score}</span><span className="rounded-xl bg-white/15 px-3 py-2 font-black">⏱ {time}</span></div>
      </header>
      <button onClick={() => { setSoundOn(v => !v); window.speechSynthesis?.cancel(); }} className="mb-3 mr-auto flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">{soundOn ? <Volume2 size={18}/> : <VolumeX size={18}/>} {soundOn ? "الصوت مفعّل" : "الصوت متوقف"}</button>

      <div className="game-board relative mx-auto aspect-[16/9] min-h-[430px] w-full overflow-hidden rounded-3xl border-2 border-[#efcf77]/60 shadow-2xl">
        <div className="water-light" aria-hidden="true"/>
        <div className="surface-wave wave-one" aria-hidden="true"/>
        <div className="surface-wave wave-two" aria-hidden="true"/>
        <img src="/assets/animated-dhow.png" alt="" className="moving-dhow" aria-hidden="true"/>
        <div className="bubbles" aria-hidden="true">{[8,18,31,47,62,77,89].map((left, i) => <i key={left} style={{ left: left + "%", animationDelay: (i * .55) + "s", width: (7 + i % 3 * 4) + "px", height: (7 + i % 3 * 4) + "px" }}/>)}</div>
        {state === "playing" && <>
          {items.map(item => <span key={item.id} className="collectible absolute select-none" style={{ left: item.x + "%", top: item.y + "%" }}>{item.kind === "pearl" ? "💎" : "🐚"}</span>)}
          <span className="diver swimming absolute select-none" style={{ left: diver.x + "%", top: diver.y + "%" }}>🤿<b className="fin-bubbles">◦ °</b></span>
          {flash && <div className="absolute left-1/2 top-20 -translate-x-1/2 rounded-full bg-[#7b1734]/95 px-6 py-3 text-lg font-black text-white shadow-xl">{flash}</div>}
        </>}

        {state === "ready" && <div className="game-overlay absolute inset-0 flex items-center justify-center p-5 text-center">
          <div className="max-w-lg rounded-3xl border border-white/30 bg-[#053a50]/88 p-6 text-white backdrop-blur-md">
            <div className="text-6xl">🤿</div><h2 className="mt-2 text-4xl font-black">تحدّي البحث عن الدانة</h2>
            <p className="mt-4 text-lg leading-8">حرّك الغواص، واجمع أكبر عدد من المحار خلال 60 ثانية.</p>
            <div className="my-5 flex justify-center gap-5"><span className="rounded-xl bg-white/10 px-4 py-2">🐚 = 10 نقاط</span><span className="rounded-xl bg-white/10 px-4 py-2">💎 = 50 نقطة</span></div>
            <button onClick={start} className="rounded-2xl bg-[#7b1734] px-8 py-4 text-xl font-black shadow-xl hover:bg-[#922342]"><Play className="ml-2 inline" /> ابدأ الغوص</button>
          </div>
        </div>}

        {state === "ended" && <div className="game-overlay absolute inset-0 flex items-center justify-center p-5 text-center">
          <div className="max-w-lg rounded-3xl border border-[#f4d477] bg-[#06374a]/92 p-7 text-white backdrop-blur-md">
            <div className="text-6xl">🏆</div><h2 className="mt-2 text-4xl font-black">انتهت الرحلة!</h2><p className="mt-4 text-2xl">جمعت <strong className="text-[#ffe17d]">{score} نقطة</strong></p>
            <p className="mt-5 rounded-2xl bg-white/10 p-4 leading-7">كان الغواص القطري قديمًا ينزل إلى البحر ممسكًا بحجر يساعده على الوصول إلى القاع، ثم يجمع المحار في الديين.</p>
            <button onClick={start} className="mt-5 rounded-2xl bg-[#7b1734] px-7 py-3 text-lg font-black"><RotateCcw className="ml-2 inline" /> العب مرة أخرى</button>
          </div>
        </div>}
      </div>

      <div className="mx-auto mt-4 grid w-fit grid-cols-3 gap-2" aria-label="أزرار تحريك الغواص">
        <span/><button className="control" onClick={() => move(0,-5)} aria-label="أعلى"><ArrowUp/></button><span/>
        <button className="control" onClick={() => move(-5,0)} aria-label="يسار"><ArrowLeft/></button><button className="control" onClick={() => move(0,5)} aria-label="أسفل"><ArrowDown/></button><button className="control" onClick={() => move(5,0)} aria-label="يمين"><ArrowRight/></button>
      </div>
      <p className="mt-2 text-center text-sm text-white/75">استخدم الأسهم على الشاشة أو لوحة المفاتيح</p>
      <Guide message={state === "ready" ? "الحين بنروح للبحر. البحر كان جزء كبير من حياة أهل قطر أول. منه كانوا يصيدون السمك، ويطلعون للغوص يدورون اللؤلؤ. تعالوا وياي، وخلّونا نشوف شلون كانت رحلة الغوص." : state === "playing" ? `شدّ حيلك يا غواص! جمعت ${score} نقطة، وباقي ${time} ثانية.` : `كفو عليك! خلص وقت الغوص، وجمعت ${score} نقطة.`}/>
    </div>
  </section>;
}

function NokhathaGame({ onBack, onComplete }: { onBack: () => void; onComplete: (reward: StationReward) => void }) {
  const [state, setState] = useState<"ready" | "playing" | "ended">("ready");
  const [time, setTime] = useState(45);
  const [score, setScore] = useState(0);
  const [boatX, setBoatX] = useState(50);
  const [items, setItems] = useState<VoyageItem[]>([]);
  const [flash, setFlash] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const reportedStamp = useRef(false);
  const earnedStamp = score >= 60;

  const start = () => {
    reportedStamp.current = false;
    setTime(45);
    setScore(0);
    setBoatX(50);
    setItems(makeVoyageItems());
    setFlash("");
    setState("playing");
    if (soundOn) {
      tone(310, .16, "triangle");
      window.setTimeout(() => tone(470, .2, "triangle"), 150);
      speak("يالله، ابدأ رحلة النوخذة. حرّك المحمل يمين ويسار، واجمع علامات المسار الذهبية، وانتبه من الصخور.");
    }
  };

  const moveBoat = useCallback((dx: number) => {
    if (state !== "playing") return;
    setBoatX(x => Math.max(12, Math.min(88, x + dx)));
  }, [state]);

  useEffect(() => {
    if (state !== "playing") return;
    const motion = window.setInterval(() => {
      setItems(current => current.map(item => {
        const nextY = item.y + 1.7;
        if (nextY > 94) return resetVoyageItem(item);
        const reachedBoat = nextY > 69 && nextY < 82 && Math.abs(item.x - boatX) < 10;
        if (!reachedBoat) return { ...item, y: nextY };

        if (item.kind === "marker") {
          setScore(value => value + 15);
          setFlash("✦ علامة المسار +15");
          if (soundOn) tone(660, .14, "triangle");
        } else {
          setScore(value => Math.max(0, value - 10));
          setFlash("🪨 انتبه للصخرة −10");
          if (soundOn) tone(170, .2, "sawtooth");
        }
        window.setTimeout(() => setFlash(""), 750);
        return resetVoyageItem(item);
      }));
    }, 140);
    return () => window.clearInterval(motion);
  }, [state, boatX, soundOn]);

  useEffect(() => {
    if (state !== "playing") return;
    const countdown = window.setInterval(() => setTime(value => {
      if (value <= 1) {
        setState("ended");
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(countdown);
  }, [state]);

  useEffect(() => {
    if (state === "playing" && soundOn && time > 0 && time <= 5) tone(520 + (5 - time) * 55, .08, "square");
    if (state === "ended" && soundOn) speak(earnedStamp ? winVoice(`حصلت على ختم رحلة النوخذة، وجمعت ${score} نقطة.`) : `${retryVoice()} اجمع ستين نقطة عشان تحصل على الختم.`);
  }, [time, state, soundOn, earnedStamp, score]);

  useEffect(() => {
    if (state !== "ended" || !earnedStamp || reportedStamp.current) return;
    reportedStamp.current = true;
    onComplete({ score });
  }, [state, earnedStamp, score, onComplete]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") { event.preventDefault(); moveBoat(-6); }
      if (event.key === "ArrowRight") { event.preventDefault(); moveBoat(6); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [moveBoat]);

  return <section className="voyage-page min-h-screen p-3 sm:p-6">
    <div className="mx-auto max-w-6xl">
      <header className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-[#163f4a]/90 px-4 py-3 text-white backdrop-blur-md">
        <button onClick={onBack} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 hover:bg-white/20"><HomeIcon size={19}/> القرية</button>
        <div className="text-center"><p className="text-xs text-[#ffe7a1]">المحطة الثالثة</p><h1 className="text-xl font-black sm:text-2xl">رحلة النوخذة</h1></div>
        <div className="flex gap-2"><span className="rounded-xl bg-[#7b1734] px-3 py-2 font-black">⭐ {score}</span><span className="rounded-xl bg-white/15 px-3 py-2 font-black">⏱ {time}</span></div>
      </header>

      <button onClick={() => { setSoundOn(value => !value); window.speechSynthesis?.cancel(); }} className="mb-3 mr-auto flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">{soundOn ? <Volume2 size={18}/> : <VolumeX size={18}/>} {soundOn ? "الصوت مفعّل" : "الصوت متوقف"}</button>

      <div className="voyage-board relative mx-auto aspect-[16/9] min-h-[430px] w-full overflow-hidden rounded-3xl border-2 border-[#efcf77]/70 shadow-2xl">
        <div className="voyage-water-shine" aria-hidden="true"/>
        <div className="sea-route" aria-hidden="true"/>

        {state === "playing" && items.map(item => <span key={item.id} className={"voyage-item " + item.kind} style={{ left: item.x + "%", top: item.y + "%" }} aria-hidden="true">{item.kind === "marker" ? "✦" : "🪨"}</span>)}

        <img src="/assets/animated-dhow.png" alt="المحمل القطري الذي يقوده اللاعب" className={"player-dhow " + (state === "playing" ? "dhow-steering" : "")} style={{ left: boatX + "%" }} draggable={false}/>

        {flash && <div className="voyage-flash absolute left-1/2 top-20 -translate-x-1/2 rounded-full px-6 py-3 text-lg font-black text-white shadow-xl" role="status">{flash}</div>}

        {state === "ready" && <div className="voyage-overlay absolute inset-0 flex items-center justify-center p-5 text-center">
          <div className="max-w-lg rounded-3xl border border-[#f2d078]/70 bg-[#10343f]/90 p-6 text-white backdrop-blur-md">
            <div className="text-6xl">⚓</div>
            <h2 className="mt-2 text-4xl font-black">تحدّي قيادة المحمل</h2>
            <p className="mt-4 text-lg leading-8">حرّك المحمل يمينًا ويسارًا خلال 45 ثانية، واجمع علامات الطريق وتجنّب الصخور.</p>
            <div className="my-5 flex flex-wrap justify-center gap-3"><span className="rounded-xl bg-white/10 px-4 py-2">✦ علامة = 15 نقطة</span><span className="rounded-xl bg-white/10 px-4 py-2">🪨 صخرة = −10</span></div>
            <button onClick={start} className="rounded-2xl bg-[#7b1734] px-8 py-4 text-xl font-black shadow-xl hover:bg-[#922342]"><Play className="ml-2 inline"/> ابدأ الإبحار</button>
          </div>
        </div>}

        {state === "ended" && <div className="voyage-overlay absolute inset-0 flex items-center justify-center p-5 text-center">
          <div className="max-w-lg rounded-3xl border border-[#f4d477] bg-[#10343f]/93 p-7 text-white backdrop-blur-md">
            <div className="text-6xl">{earnedStamp ? "🏅" : "⚓"}</div>
            <h2 className="mt-2 text-4xl font-black text-[#ffe17d]">{earnedStamp ? "ختم رحلة النوخذة" : "انتهت الرحلة"}</h2>
            <p className="mt-3 text-2xl">مجموعك <strong className="text-[#ffe17d]">{score} نقطة</strong></p>
            <p className="mt-5 rounded-2xl bg-white/10 p-4 leading-7">النوخذة قائد المحمل؛ يوجّه البحارة ويتولى مسؤولية الرحلة في البحر.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3"><button onClick={start} className="rounded-2xl bg-[#7b1734] px-6 py-3 font-black"><RotateCcw className="ml-2 inline" size={19}/> العب مرة أخرى</button><button onClick={onBack} className="rounded-2xl bg-white/10 px-6 py-3 font-black"><HomeIcon className="ml-2 inline" size={19}/> القرية</button></div>
          </div>
        </div>}
      </div>

      <div className="voyage-controls mx-auto mt-4 flex w-fit gap-3" aria-label="أزرار قيادة المحمل">
        <button className="voyage-control" onClick={() => moveBoat(-6)} disabled={state !== "playing"} aria-label="حرّك المحمل إلى اليسار"><ArrowLeft/> يسار</button>
        <button className="voyage-control" onClick={() => moveBoat(6)} disabled={state !== "playing"} aria-label="حرّك المحمل إلى اليمين">يمين <ArrowRight/></button>
      </div>
      <p className="mt-2 text-center text-sm text-white/80">استخدم الزرين أو سهمي اليمين واليسار في لوحة المفاتيح</p>
      <Guide message={state === "ready" ? "يا مرحبا في رحلة النوخذة. النوخذة هو اللي يقود المحمل. حرّك المحمل يمين ويسار، واجمع علامات المسار، وانتبه من الصخور." : state === "playing" ? `حرّك المحمل بحذر. عندك ${score} نقطة، وباقي ${time} ثانية.` : earnedStamp ? `كفو عليك! حصلت على ختم رحلة النوخذة، وجمعت ${score} نقطة.` : `قريبة! جمعت ${score} نقطة. جرّب مرة ثانية، واجمع ستين نقطة عشان تحصل على الختم.`}/>
    </div>
  </section>;
}

type TeelaTarget = { id: string; name: string; x: number; y: number; color: string; points: number; hit: boolean };

const makeTeelaTargets = (): TeelaTarget[] => [
  { id: "turquoise", name: "التيلة الفيروزية", x: 20, y: 35, color: "#23b9bd", points: 40, hit: false },
  { id: "amber", name: "التيلة الكهرمانية", x: 35, y: 25, color: "#e39429", points: 40, hit: false },
  { id: "gold", name: "الدانة الذهبية", x: 50, y: 32, color: "#f5cf58", points: 60, hit: false },
  { id: "maroon", name: "التيلة العنابية", x: 65, y: 25, color: "#a72f55", points: 40, hit: false },
  { id: "blue", name: "التيلة الزرقاء", x: 80, y: 35, color: "#4d83d6", points: 40, hit: false },
];

function TeelaGame({ onBack, onComplete }: { onBack: () => void; onComplete: (reward: StationReward) => void }) {
  const [state, setState] = useState<"ready" | "playing" | "ended">("ready");
  const [targets, setTargets] = useState<TeelaTarget[]>(makeTeelaTargets);
  const [aim, setAim] = useState(50);
  const [shotsLeft, setShotsLeft] = useState(8);
  const [hits, setHits] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [shooting, setShooting] = useState(false);
  const [shot, setShot] = useState<{ id: number; x: number; y: number; hit: boolean } | null>(null);
  const shotTimer = useRef<number | null>(null);
  const reportedStamp = useRef(false);
  const earnedStamp = hits >= 3;
  const aimLabel = aim < 42 ? "اليسار" : aim > 58 ? "اليمين" : "الوسط";

  const clearShotTimer = () => {
    if (shotTimer.current !== null) window.clearTimeout(shotTimer.current);
    shotTimer.current = null;
  };
  const start = () => {
    clearShotTimer();
    reportedStamp.current = false;
    setTargets(makeTeelaTargets());
    setAim(50);
    setShotsLeft(8);
    setHits(0);
    setScore(0);
    setFeedback("");
    setShooting(false);
    setShot(null);
    setState("playing");
    if (soundOn) {
      tone(420, .14, "triangle");
      window.setTimeout(() => tone(610, .18, "triangle"), 140);
      speak("يالله نلعب التيلة. اختار اتجاه الرمية، وبعدين اضغط: ارمِ التيلة. صيب ثلاث تيلات عشان تكمّل اللعبة.");
    }
  };
  const leave = () => {
    clearShotTimer();
    window.speechSynthesis?.cancel();
    onBack();
  };
  const nudgeAim = (amount: number) => {
    if (state !== "playing" || shooting) return;
    setAim(value => Math.max(15, Math.min(85, value + amount)));
    tone(310, .06, "sine");
  };
  const selectTarget = (target: TeelaTarget) => {
    if (state !== "playing" || shooting || target.hit) return;
    setAim(target.x);
    setFeedback(`تم تحديد ${target.name}. اضغط ارمِ التيلة.`);
    if (soundOn) speak(`زين، اخترت ${target.name}. الحين اضغط: ارمِ التيلة.`);
  };
  const shoot = () => {
    if (state !== "playing" || shooting || shotsLeft <= 0) return;
    const available = targets.filter(target => !target.hit);
    const nearest = [...available].sort((a, b) => Math.abs(a.x - aim) - Math.abs(b.x - aim))[0];
    const hitTarget = nearest && Math.abs(nearest.x - aim) <= 8 ? nearest : null;
    const destination = hitTarget ? { x: hitTarget.x, y: hitTarget.y } : { x: aim, y: 17 };
    setShooting(true);
    setShot({ id: Date.now(), ...destination, hit: Boolean(hitTarget) });
    setFeedback(hitTarget ? `إصابة موفّقة… ${hitTarget.name}!` : "قريب! عدّل الاتجاه وحاول مرة أخرى.");
    if (soundOn) tone(hitTarget ? 680 : 180, hitTarget ? .16 : .2, hitTarget ? "triangle" : "sawtooth");

    shotTimer.current = window.setTimeout(() => {
      const nextShots = shotsLeft - 1;
      const nextHits = hits + (hitTarget ? 1 : 0);
      const nextScore = score + (hitTarget?.points ?? 0);
      if (hitTarget) setTargets(current => current.map(target => target.id === hitTarget.id ? { ...target, hit: true } : target));
      setShotsLeft(nextShots);
      setHits(nextHits);
      setScore(nextScore);
      setShot(null);
      setShooting(false);

      if (nextHits >= 3) {
        setState("ended");
        if (!reportedStamp.current) {
          reportedStamp.current = true;
          onComplete({ score: nextScore });
        }
        if (soundOn) {
          window.setTimeout(() => tone(880, .25, "triangle"), 100);
          speak(winVoice(`كمّلت لعبة التيلة، وجمعت ${nextScore} نقطة.`));
        }
      } else if (nextShots === 0) {
        setState("ended");
        if (soundOn) speak(`${retryVoice()} صبت ${nextHits} تيلات. جرّب من جديد عشان تحصل على الختم.`);
      } else if (soundOn && hitTarget) {
        speak(winVoice(`صبت ${hitTarget.name}. باقي لك ${3 - nextHits} إصابات.`));
      } else if (soundOn) {
        speak(retryVoice());
      }
    }, 760);
  };

  useEffect(() => () => clearShotTimer(), []);

  return <section className="fareej-page min-h-screen p-3 sm:p-6">
    <div className="mx-auto max-w-6xl">
      <header className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-[#3c2417]/90 px-4 py-3 text-white backdrop-blur-md">
        <button onClick={leave} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 hover:bg-white/20"><Gamepad2 size={19}/> ألعاب الفريج</button>
        <div className="text-center"><p className="text-xs text-[#ffe3a0]">المحطة الخامسة</p><h1 className="text-xl font-black sm:text-2xl">فريج الألعاب</h1></div>
        <div className="flex gap-2"><span className="rounded-xl bg-[#7b1734] px-3 py-2 font-black">🎯 {hits}/3</span><span className="rounded-xl bg-white/15 px-3 py-2 font-black">⭐ {score}</span></div>
      </header>

      <button onClick={() => { setSoundOn(value => !value); window.speechSynthesis?.cancel(); }} className="mb-3 mr-auto flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">{soundOn ? <Volume2 size={18}/> : <VolumeX size={18}/>} {soundOn ? "الصوت مفعّل" : "الصوت متوقف"}</button>

      <div className="fareej-board relative mx-auto aspect-[16/9] min-h-[470px] w-full overflow-hidden rounded-3xl border-2 border-[#efcf77]/70 shadow-2xl">
        <div className="fareej-lanterns" aria-hidden="true"/>
        <div className="teela-ring" aria-hidden="true"/>

        {state === "playing" && <>
          <span className="teela-aim-line" style={{ transform: `translateX(-50%) rotate(${(aim - 50) * .62}deg)` }} aria-hidden="true"/>
          <span className="teela-aim-marker" style={{ left: aim + "%" }} aria-hidden="true">▼</span>
          {targets.map(target => <button
            key={target.id}
            onClick={() => selectTarget(target)}
            disabled={target.hit || shooting}
            className={`teela-target${target.hit ? " hit" : ""}${Math.abs(target.x - aim) < 2 && !target.hit ? " selected" : ""}`}
            style={{ left: target.x + "%", top: target.y + "%", "--teela-color": target.color } as React.CSSProperties}
            aria-label={target.hit ? `${target.name} تمت إصابتها` : `وجّه الرمية إلى ${target.name}`}
          ><i/><b>{target.hit ? "✓" : target.points}</b></button>)}
          <span className="teela-player" aria-label="تيلة اللاعب"><i/></span>
          {shot && <span key={shot.id} className={`teela-shot ${shot.hit ? "shot-hit" : "shot-miss"}`} style={{ "--shot-x": shot.x + "%", "--shot-y": shot.y + "%" } as React.CSSProperties}><i/></span>}
        </>}

        {state === "ready" && <div className="fareej-overlay absolute inset-0 flex items-center justify-center p-5 text-center">
          <div className="fareej-card max-w-xl rounded-3xl p-6 text-white backdrop-blur-md">
            <div className="text-6xl">🔵</div>
            <p className="mt-2 text-sm font-black text-[#f5d47d]">لعبة شعبية قطرية</p>
            <h2 className="mt-1 text-4xl font-black">تحدّي التيلة</h2>
            <p className="mt-4 text-lg leading-8">وجّه تيلتك نحو الكرات الزجاجية، وأصِبْ ثلاث تيلات قبل انتهاء ثماني رميات.</p>
            <div className="my-5 grid grid-cols-3 gap-2"><span>🎯 3 إصابات</span><span>🔵 أهداف كبيرة</span><span>✋ بلا مؤقّت</span></div>
            <button onClick={start} className="rounded-2xl bg-[#7b1734] px-8 py-4 text-xl font-black shadow-xl hover:bg-[#922342]"><Play className="ml-2 inline"/> ابدأ اللعب</button>
            <a href="https://qm.org.qa/en/about-us/publications/childrens-books/traditional-games-in-qatar/" target="_blank" rel="noreferrer" className="mt-4 block text-sm font-bold text-[#ffe39a] underline underline-offset-4">مرجع الألعاب الشعبية: متاحف قطر</a>
          </div>
        </div>}

        {state === "ended" && <div className="fareej-overlay absolute inset-0 flex items-center justify-center p-5 text-center">
          <div className="fareej-card max-w-lg rounded-3xl p-7 text-white backdrop-blur-md">
            <div className="fareej-stamp mx-auto">{earnedStamp ? "🏅" : "🔵"}</div>
            <h2 className="mt-3 text-4xl font-black text-[#ffe17d]">{earnedStamp ? "أكملت التيلة" : "انتهت المحاولات"}</h2>
            <p className="mt-3 text-xl">أصبت <strong className="text-[#ffe17d]">{hits} من 3</strong> وجمعت <strong className="text-[#ffe17d]">{score} نقطة</strong></p>
            <p className="mt-4 rounded-2xl bg-white/10 p-4 leading-7">التيلة لعبة بالكرات الزجاجية تعتمد على دقة التصويب والتركيز.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3"><button onClick={start} className="rounded-2xl bg-[#7b1734] px-6 py-3 font-black"><RotateCcw className="ml-2 inline" size={19}/> العب مرة أخرى</button><button onClick={leave} className="rounded-2xl bg-white/10 px-6 py-3 font-black"><Gamepad2 className="ml-2 inline" size={19}/> ألعاب الفريج</button></div>
          </div>
        </div>}
      </div>

      {state === "playing" && <div className="teela-controls mx-auto mt-4 max-w-3xl rounded-2xl border border-[#e8c671]/45 bg-[#342015]/90 p-4 text-center text-white shadow-xl">
        <div className="flex items-center justify-between gap-3"><button onClick={() => nudgeAim(-5)} disabled={shooting} aria-label="وجّه إلى اليسار"><ArrowLeft/> يسار</button><div><span className="block text-sm text-[#eacb82]">اتجاه الرمية</span><strong className="text-xl">{aimLabel}</strong></div><button onClick={() => nudgeAim(5)} disabled={shooting} aria-label="وجّه إلى اليمين">يمين <ArrowRight/></button></div>
        <input type="range" min="15" max="85" value={aim} onChange={event => setAim(Number(event.target.value))} disabled={shooting} aria-label="اختيار اتجاه رمية التيلة" className="teela-range mt-3"/>
        <button onClick={shoot} disabled={shooting} className="teela-shoot mt-3">{shooting ? "التيلة تتحرك…" : "◉ ارمِ التيلة"}</button>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-sm"><span>الرميات المتبقية: <b>{shotsLeft}</b></span><span>الإصابات: <b>{hits}/3</b></span></div>
        <p className="mt-2 min-h-6 font-bold text-[#ffe39a]" role="status" aria-live="polite">{feedback}</p>
      </div>}

      <Guide message={state === "ready" ? "الحين بنلعب التيلة، وهذي لعبة تبي دقّة وتركيز. اضغط ابدأ اللعب." : state === "playing" ? `وجّه الرمية صوب التيلة، وبعدين اضغط: ارمِ التيلة. صبت ${hits} من ثلاث، وباقي لك ${shotsLeft} رميات.` : earnedStamp ? `علومك طيبة! كمّلت لعبة التيلة، وجمعت ${score} نقطة. ارجع لألعاب الفريج، وكمّل باقي الألعاب.` : `قريبة يا بطل! صبت ${hits} من ثلاث. جرّب مرة ثانية، وبتضبط معاك.`}/>
    </div>
  </section>;
}

type DahroojDirection = "left" | "right";
const dahroojPath: DahroojDirection[] = ["right", "left", "right", "right", "left", "right"];

function DahroojGame({ onBack, onComplete }: { onBack: () => void; onComplete: (reward: StationReward) => void }) {
  const [state, setState] = useState<"ready" | "playing" | "ended">("ready");
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const reported = useRef(false);
  const wheelPosition = 9 + (step / dahroojPath.length) * 78;
  const requiredDirection = dahroojPath[Math.min(step, dahroojPath.length - 1)];

  const start = () => {
    reported.current = false;
    setStep(0);
    setScore(0);
    setFeedback("");
    setState("playing");
    if (soundOn) speak("يالله نلعب الدحروي. اتبع السهم، ووجّه العجلة بالعصا لين توصل خط النهاية.");
  };
  const steer = (direction: DahroojDirection) => {
    if (state !== "playing") return;
    if (direction !== requiredDirection) {
      setFeedback("انتبه لاتجاه السهم وحاول مرة أخرى.");
      tone(180, .16, "sawtooth");
      if (soundOn) speak(retryVoice());
      return;
    }
    const nextStep = step + 1;
    const nextScore = score + 20;
    setStep(nextStep);
    setScore(nextScore);
    setFeedback(nextStep === dahroojPath.length ? "وصلت إلى خط النهاية!" : "ممتاز… واصل توجيه العجلة.");
    tone(620, .13, "triangle");
    if (nextStep === dahroojPath.length) {
      setState("ended");
      if (!reported.current) {
        reported.current = true;
        onComplete({ score: nextScore });
      }
      if (soundOn) {
        window.setTimeout(() => tone(850, .22, "triangle"), 110);
        speak(winVoice(`وصلت بعجلة الدحروي للنهاية، وجمعت ${nextScore} نقطة.`));
      }
    } else if (soundOn) {
      speak(winVoice("الحين راقب السهم اللي بعده."));
    }
  };

  return <section className="fareej-page min-h-screen p-3 sm:p-6">
    <div className="mx-auto max-w-6xl">
      <header className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-[#3c2417]/90 px-4 py-3 text-white backdrop-blur-md">
        <button onClick={onBack} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 hover:bg-white/20"><Gamepad2 size={19}/> ألعاب الفريج</button>
        <div className="text-center"><p className="text-xs text-[#ffe3a0]">اللعبة الثانية</p><h1 className="text-xl font-black sm:text-2xl">الدحروي</h1></div>
        <span className="rounded-xl bg-[#7b1734] px-3 py-2 font-black">⭐ {score}</span>
      </header>

      <button onClick={() => { setSoundOn(value => !value); window.speechSynthesis?.cancel(); }} className="mb-3 mr-auto flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">{soundOn ? <Volume2 size={18}/> : <VolumeX size={18}/>} {soundOn ? "الصوت مفعّل" : "الصوت متوقف"}</button>

      <div className="dahrooj-board relative mx-auto aspect-[16/9] min-h-[470px] w-full overflow-hidden rounded-3xl border-2 border-[#efcf77]/70 shadow-2xl">
        <div className="fareej-lanterns" aria-hidden="true"/>
        <div className="dahrooj-track" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>
        <div className="dahrooj-finish" aria-hidden="true"><span>النهاية</span></div>

        {state !== "ready" && <div className={`dahrooj-wheel-wrap${state === "playing" ? " rolling" : ""}`} style={{ left: wheelPosition + "%" }} aria-label={`عجلة الدحروي قطعت ${step} من ${dahroojPath.length} مراحل`}><span className="dahrooj-stick"/><span className="dahrooj-wheel"/></div>}

        {state === "ready" && <div className="fareej-overlay absolute inset-0 flex items-center justify-center p-5 text-center"><div className="fareej-card max-w-xl rounded-3xl p-6 text-white backdrop-blur-md"><div className="text-6xl">⭕</div><p className="mt-2 text-sm font-black text-[#f5d47d]">لعبة حركة وتوازن</p><h2 className="mt-1 text-4xl font-black">سباق الدحروي</h2><p className="mt-4 text-lg leading-8">اتبع الأسهم لتوجّه العجلة المعدنية بالعصا، واعبر مراحل الطريق حتى خط النهاية.</p><div className="my-5 grid grid-cols-3 gap-2"><span>⭕ عجلة</span><span>↔️ توجيه</span><span>🏁 6 مراحل</span></div><button onClick={start} className="rounded-2xl bg-[#7b1734] px-8 py-4 text-xl font-black shadow-xl hover:bg-[#922342]"><Play className="ml-2 inline"/> ابدأ السباق</button></div></div>}

        {state === "playing" && <div className="dahrooj-prompt" role="status" aria-live="polite"><span>{requiredDirection === "left" ? "←" : "→"}</span><strong>{requiredDirection === "left" ? "وجّه يسارًا" : "وجّه يمينًا"}</strong></div>}

        {state === "ended" && <div className="fareej-overlay absolute inset-0 flex items-center justify-center p-5 text-center"><div className="fareej-card max-w-lg rounded-3xl p-7 text-white backdrop-blur-md"><div className="fareej-stamp mx-auto">🏁</div><h2 className="mt-3 text-4xl font-black text-[#ffe17d]">أكملت الدحروي</h2><p className="mt-3 text-xl">وصلت إلى النهاية وجمعت <strong className="text-[#ffe17d]">{score} نقطة</strong></p><p className="mt-4 rounded-2xl bg-white/10 p-4 leading-7">في الدحروي يدفع اللاعب عجلة معدنية ويوجّهها بعصا حتى يصل إلى النهاية.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><button onClick={start} className="rounded-2xl bg-[#7b1734] px-6 py-3 font-black"><RotateCcw className="ml-2 inline" size={19}/> أعد اللعبة</button><button onClick={onBack} className="rounded-2xl bg-white/10 px-6 py-3 font-black"><Gamepad2 className="ml-2 inline" size={19}/> ألعاب الفريج</button></div></div></div>}
      </div>

      {state === "playing" && <div className="dahrooj-controls mx-auto mt-4 max-w-xl rounded-2xl border border-[#e8c671]/45 bg-[#342015]/90 p-4 text-center text-white shadow-xl"><div className="grid grid-cols-2 gap-3"><button onClick={() => steer("left")}><ArrowLeft/> يسار</button><button onClick={() => steer("right")}>يمين <ArrowRight/></button></div><div className="mt-3 flex justify-center gap-5 text-sm"><span>الطريق: <b>{step}/{dahroojPath.length}</b></span><span>النقاط: <b>{score}</b></span></div><p className="mt-2 min-h-6 font-bold text-[#ffe39a]" role="status" aria-live="polite">{feedback}</p></div>}

      <Guide message={state === "ready" ? "هذي لعبة الدحروي. كان عيال الفريج يوجّهون عجلة معدنية بعصا. اضغط ابدأ السباق." : state === "playing" ? `شوف السهم، واضغط الاتجاه نفسه. وصلت للمرحلة ${step} من ست مراحل.` : `كفو عليك! كمّلت سباق الدحروي، وجمعت ${score} نقطة.`}/>
    </div>
  </section>;
}

const saqlaSequences = [[2], [4, 1], [3, 0, 4]];

function SaqlaGame({ onBack, onComplete }: { onBack: () => void; onComplete: (reward: StationReward) => void }) {
  const [state, setState] = useState<"ready" | "playing" | "ended">("ready");
  const [round, setRound] = useState(0);
  const [pick, setPick] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const reported = useRef(false);
  const sequence = saqlaSequences[Math.min(round, saqlaSequences.length - 1)];
  const expectedStone = sequence[Math.min(pick, sequence.length - 1)];

  const start = () => {
    reported.current = false;
    setRound(0);
    setPick(0);
    setPicked([]);
    setScore(0);
    setFeedback("");
    setState("playing");
    if (soundOn) speak("يالله نلعب الصقلة، اللي نعرفها في قطر باسم اللقفة. راقب الحصاة المتوهجة، والتقط الحصى بالترتيب في ثلاث جولات.");
  };
  const chooseStone = (stone: number) => {
    if (state !== "playing") return;
    if (stone !== expectedStone) {
      setFeedback("اقتربت! اختر الحصاة المتوهجة، وحاول مرة أخرى.");
      tone(180, .16, "sawtooth");
      if (soundOn) speak(retryVoice());
      return;
    }

    const nextScore = score + 15;
    const nextPicked = [...picked, stone];
    const roundDone = pick === sequence.length - 1;
    setScore(nextScore);
    setPicked(nextPicked);
    tone(650, .13, "triangle");

    if (!roundDone) {
      setPick(value => value + 1);
      setFeedback("أحسنت… التقط الحصاة التالية.");
      return;
    }

    if (round === saqlaSequences.length - 1) {
      const finalScore = nextScore + 30;
      setScore(finalScore);
      setState("ended");
      setFeedback("أكملت الجولات الثلاث!");
      if (!reported.current) {
        reported.current = true;
        onComplete({ score: finalScore });
      }
      if (soundOn) {
        window.setTimeout(() => tone(880, .22, "triangle"), 110);
        speak(winVoice(`كمّلت جولات الصقلة، أو اللقفة، وجمعت ${finalScore} نقطة.`));
      }
      return;
    }

    const nextRound = round + 1;
    setRound(nextRound);
    setPick(0);
    setPicked([]);
    setFeedback(`أحسنت. ابدأ الجولة ${nextRound + 1}.`);
    if (soundOn) speak(winVoice(`الحين نبدأ الجولة ${nextRound + 1}.`));
  };

  return <section className="fareej-page min-h-screen p-3 sm:p-6">
    <div className="mx-auto max-w-6xl">
      <header className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-[#3c2417]/90 px-4 py-3 text-white backdrop-blur-md">
        <button onClick={onBack} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 hover:bg-white/20"><Gamepad2 size={19}/> ألعاب الفريج</button>
        <div className="text-center"><p className="text-xs text-[#ffe3a0]">اللعبة الثالثة</p><h1 className="text-xl font-black sm:text-2xl">الصقلة (اللقفة)</h1></div>
        <div className="flex gap-2"><span className="rounded-xl bg-[#7b1734] px-3 py-2 font-black">🪨 {state === "ended" ? 3 : round + 1}/3</span><span className="rounded-xl bg-white/15 px-3 py-2 font-black">⭐ {score}</span></div>
      </header>

      <button onClick={() => { setSoundOn(value => !value); window.speechSynthesis?.cancel(); }} className="mb-3 mr-auto flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">{soundOn ? <Volume2 size={18}/> : <VolumeX size={18}/>} {soundOn ? "الصوت مفعّل" : "الصوت متوقف"}</button>

      <div className="saqla-board relative mx-auto aspect-[16/9] min-h-[470px] w-full overflow-hidden rounded-3xl border-2 border-[#efcf77]/70 shadow-2xl">
        <div className="fareej-lanterns" aria-hidden="true"/>
        <div className="saqla-playfield" aria-hidden="true"/>

        {state === "playing" && <>
          <span className="saqla-toss" aria-hidden="true">●</span>
          <div className="saqla-stones" aria-label="حصى الصقلة أو اللقفة">{[0,1,2,3,4].map(stone => <button key={stone} onClick={() => chooseStone(stone)} disabled={picked.includes(stone)} className={`${stone === expectedStone ? "glowing" : ""}${picked.includes(stone) ? " picked" : ""}`} aria-label={stone === expectedStone ? `الحصاة ${stone + 1} المتوهجة` : `الحصاة ${stone + 1}`}><i/><b>{stone + 1}</b></button>)}</div>
          <div className="saqla-prompt" role="status" aria-live="polite"><span>✋</span><strong>التقط الحصاة المتوهجة</strong><small>الجولة {round + 1}: {pick + 1} من {sequence.length}</small></div>
        </>}

        {state === "ready" && <div className="fareej-overlay absolute inset-0 flex items-center justify-center p-5 text-center"><div className="fareej-card max-w-xl rounded-3xl p-6 text-white backdrop-blur-md"><div className="text-6xl">🪨</div><p className="mt-2 text-sm font-black text-[#f5d47d]">تُعرف في قطر باسم اللقفة</p><h2 className="mt-1 text-4xl font-black">تحدّي الصقلة (اللقفة)</h2><p className="mt-4 text-lg leading-8">تُرمى حصاة إلى أعلى، ثم تُلتقط الحصيات الأخرى بسرعة. في النسخة المبسّطة، التقط الحصيات المتوهجة بالترتيب.</p><div className="my-5 grid grid-cols-3 gap-2"><span>🪨 خمس حصيات</span><span>✋ يد واحدة</span><span>✨ 3 جولات</span></div><button onClick={start} className="rounded-2xl bg-[#7b1734] px-8 py-4 text-xl font-black shadow-xl hover:bg-[#922342]"><Play className="ml-2 inline"/> ابدأ اللقفة</button></div></div>}

        {state === "ended" && <div className="fareej-overlay absolute inset-0 flex items-center justify-center p-5 text-center"><div className="fareej-card max-w-lg rounded-3xl p-7 text-white backdrop-blur-md"><div className="fareej-stamp mx-auto">✨</div><h2 className="mt-3 text-4xl font-black text-[#ffe17d]">أكملت الصقلة (اللقفة)</h2><p className="mt-3 text-xl">أنهيت الجولات الثلاث وجمعت <strong className="text-[#ffe17d]">{score} نقطة</strong></p><p className="mt-4 rounded-2xl bg-white/10 p-4 leading-7">تُعرف هذه اللعبة في قطر باسم اللقفة، وتُلعَب بخمس حصيات وتعتمد على خفّة اليد والتركيز.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><button onClick={start} className="rounded-2xl bg-[#7b1734] px-6 py-3 font-black"><RotateCcw className="ml-2 inline" size={19}/> أعد اللعبة</button><button onClick={onBack} className="rounded-2xl bg-white/10 px-6 py-3 font-black"><Gamepad2 className="ml-2 inline" size={19}/> ألعاب الفريج</button></div></div></div>}
      </div>

      {state === "playing" && <div className="saqla-status mx-auto mt-4 max-w-xl rounded-2xl border border-[#e8c671]/45 bg-[#342015]/90 p-4 text-center text-white shadow-xl"><div className="flex justify-center gap-3" aria-label={`الجولة ${round + 1} من 3`}>{saqlaSequences.map((_, index) => <i key={index} className={index <= round ? "active" : ""}/>)}</div><p className="mt-3 min-h-6 font-bold text-[#ffe39a]" role="status" aria-live="polite">{feedback}</p></div>}

      <Guide message={state === "ready" ? "هذي لعبة الصقلة، اللي نعرفها في قطر باسم اللقفة. التقط الحصى المتوهجة بالترتيب في ثلاث جولات." : state === "playing" ? `أنت في الجولة ${round + 1}. اختار الحصاة اللي حولها ضوء.` : `ما شاء الله عليك! كمّلت الصقلة، أو اللقفة، وجمعت ${score} نقطة.`}/>
    </div>
  </section>;
}

type RhythmMove = "left" | "right";
type RhythmGameConfig = {
  name: string;
  emoji: string;
  number: number;
  intro: string;
  voiceIntro: string;
  fact: string;
  prompt: string;
  voicePrompt: string;
  stageEmoji: string;
  sequence: RhythmMove[];
};

const rhythmGameConfigs: Record<"tug" | "karabi" | "sack", RhythmGameConfig> = {
  tug: {
    name: "شد الحبل",
    emoji: "🪢",
    number: 4,
    intro: "بدّل بين الجهتين واسحب الحبل بإيقاع منتظم حتى يصل فريقك إلى علامة الفوز.",
    voiceIntro: "يالله نلعب شد الحبل. بدّل بين اليمين واليسار، واسحب بإيقاع ثابت لين يوصل فريقك لعلامة الفوز.",
    fact: "شد الحبل لعبة جماعية تعتمد على التعاون والقوة وتنظيم حركة الفريق.",
    prompt: "اسحب بالاتجاه الظاهر",
    voicePrompt: "اسحب صوب السهم",
    stageEmoji: "🪢",
    sequence: ["right", "left", "right", "left", "right", "left", "right", "left"],
  },
  karabi: {
    name: "الكرابي",
    emoji: "🦶",
    number: 5,
    intro: "حافظ على التوازن، واتبع القدم الظاهرة لتقفز على قدم واحدة حتى نهاية المسار.",
    voiceIntro: "الحين لعبة الكرابي. حافظ على توازنك، واتبع القدم اللي تظهر لك، لين توصل نهاية المسار.",
    fact: "تعتمد الكرابي على القفز بقدم واحدة والمحافظة على التوازن أثناء اللعب.",
    prompt: "اقفز بالقدم الظاهرة",
    voicePrompt: "اقفز بالقدم اللي تظهر لك",
    stageEmoji: "🧒🏻",
    sequence: ["left", "right", "left", "left", "right", "left", "right", "right"],
  },
  sack: {
    name: "سباق أكياس الخيش",
    emoji: "🏁",
    number: 7,
    intro: "بدّل بين القفزتين يمينًا ويسارًا لتحافظ على التوازن وتصل إلى خط النهاية.",
    voiceIntro: "يالله سباق أكياس الخيش. بدّل بين اليمين واليسار، واقفز لين توصل خط النهاية.",
    fact: "سباق أكياس الخيش نشاط جماعي مرح يجمع بين الحركة والتوازن والتشجيع.",
    prompt: "اقفز بالاتجاه الظاهر",
    voicePrompt: "اقفز صوب السهم",
    stageEmoji: "🏃🏻",
    sequence: ["right", "left", "left", "right", "left", "right", "right", "left"],
  },
};

function RhythmGame({ config, onBack, onComplete }: { config: RhythmGameConfig; onBack: () => void; onComplete: (reward: StationReward) => void }) {
  const [state, setState] = useState<"ready" | "playing" | "ended">("ready");
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const reported = useRef(false);
  const requiredMove = config.sequence[Math.min(step, config.sequence.length - 1)];
  const progress = 92 - (step / config.sequence.length) * 84;

  const start = () => {
    reported.current = false;
    setStep(0);
    setScore(0);
    setFeedback("");
    setState("playing");
    if (soundOn) speak(config.voiceIntro);
  };
  const move = (direction: RhythmMove) => {
    if (state !== "playing") return;
    if (direction !== requiredMove) {
      setFeedback("انتبه إلى الاتجاه الظاهر، ثم حاول مرة أخرى.");
      tone(180, .16, "sawtooth");
      if (soundOn) speak(retryVoice());
      return;
    }
    const nextStep = step + 1;
    const nextScore = score + 15;
    setStep(nextStep);
    setScore(nextScore);
    setFeedback(nextStep === config.sequence.length ? "وصلت إلى النهاية!" : "ممتاز… واصل بنفس الإيقاع.");
    tone(640, .12, "triangle");
    if (nextStep === config.sequence.length) {
      setState("ended");
      if (!reported.current) {
        reported.current = true;
        onComplete({ score: nextScore });
      }
      if (soundOn) speak(winVoice(`كمّلت لعبة ${config.name}، وجمعت ${nextScore} نقطة.`));
    }
  };

  return <section className="fareej-page min-h-screen p-3 sm:p-6">
    <div className="mx-auto max-w-6xl">
      <header className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-[#3c2417]/90 px-4 py-3 text-white backdrop-blur-md"><button onClick={onBack} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 hover:bg-white/20"><Gamepad2 size={19}/> ألعاب الفريج</button><div className="text-center"><p className="text-xs text-[#ffe3a0]">اللعبة {config.number}</p><h1 className="text-xl font-black sm:text-2xl">{config.name}</h1></div><span className="rounded-xl bg-[#7b1734] px-3 py-2 font-black">⭐ {score}</span></header>
      <button onClick={() => { setSoundOn(value => !value); window.speechSynthesis?.cancel(); }} className="mb-3 mr-auto flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">{soundOn ? <Volume2 size={18}/> : <VolumeX size={18}/>} {soundOn ? "الصوت مفعّل" : "الصوت متوقف"}</button>

      <div className="added-game-board relative mx-auto aspect-[16/9] min-h-[470px] w-full overflow-hidden rounded-3xl border-2 border-[#efcf77]/70 shadow-2xl">
        <div className="fareej-lanterns" aria-hidden="true"/>
        <div className="rhythm-lane" aria-hidden="true"><span>البداية</span><i/><i/><i/><i/><i/><i/><i/><i/><strong>النهاية</strong></div>
        {state !== "ready" && <span className="rhythm-player" style={{ left: progress + "%" }} aria-label={`تقدمت ${step} من ${config.sequence.length} خطوات`}>{config.stageEmoji}</span>}
        {state === "playing" && <div className="rhythm-prompt" role="status" aria-live="polite"><span>{requiredMove === "left" ? "←" : "→"}</span><strong>{config.prompt}</strong><small>{step} من {config.sequence.length}</small></div>}

        {state === "ready" && <div className="fareej-overlay absolute inset-0 flex items-center justify-center p-5 text-center"><div className="fareej-card max-w-xl rounded-3xl p-6 text-white backdrop-blur-md"><div className="text-6xl">{config.emoji}</div><p className="mt-2 text-sm font-black text-[#f5d47d]">لعبة حركة وتوازن</p><h2 className="mt-1 text-4xl font-black">{config.name}</h2><p className="mt-4 text-lg leading-8">{config.intro}</p><div className="my-5 grid grid-cols-3 gap-2"><span>← يسار</span><span>→ يمين</span><span>✋ بلا مؤقّت</span></div><button onClick={start} className="rounded-2xl bg-[#7b1734] px-8 py-4 text-xl font-black shadow-xl hover:bg-[#922342]"><Play className="ml-2 inline"/> ابدأ اللعب</button></div></div>}
        {state === "ended" && <div className="fareej-overlay absolute inset-0 flex items-center justify-center p-5 text-center"><div className="fareej-card max-w-lg rounded-3xl p-7 text-white backdrop-blur-md"><div className="fareej-stamp mx-auto">{config.emoji}</div><h2 className="mt-3 text-4xl font-black text-[#ffe17d]">أكملت {config.name}</h2><p className="mt-3 text-xl">جمعت <strong className="text-[#ffe17d]">{score} نقطة</strong></p><p className="mt-4 rounded-2xl bg-white/10 p-4 leading-7">{config.fact}</p><div className="mt-5 flex flex-wrap justify-center gap-3"><button onClick={start} className="rounded-2xl bg-[#7b1734] px-6 py-3 font-black"><RotateCcw className="ml-2 inline" size={19}/> أعد اللعبة</button><button onClick={onBack} className="rounded-2xl bg-white/10 px-6 py-3 font-black"><Gamepad2 className="ml-2 inline" size={19}/> ألعاب الفريج</button></div></div></div>}
      </div>

      {state === "playing" && <div className="added-game-controls mx-auto mt-4 max-w-xl rounded-2xl border border-[#e8c671]/45 bg-[#342015]/90 p-4 text-center text-white shadow-xl"><div className="grid grid-cols-2 gap-3"><button onClick={() => move("left")}><ArrowLeft/> يسار</button><button onClick={() => move("right")}>يمين <ArrowRight/></button></div><p className="mt-3 min-h-6 font-bold text-[#ffe39a]" role="status" aria-live="polite">{feedback}</p></div>}
      <Guide message={state === "ready" ? config.voiceIntro : state === "playing" ? `${config.voicePrompt}. وصلت ${step} من ${config.sequence.length} خطوات.` : `كفو عليك! كمّلت لعبة ${config.name}، وجمعت ${score} نقطة.`}/>
    </div>
  </section>;
}

const khashishaSpots = ["بيت السدو", "باب الفريج", "ظل النخلة", "قرب البئر"];
const khashishaTargets = [2, 0, 3];

function KhashishaGame({ onBack, onComplete }: { onBack: () => void; onComplete: (reward: StationReward) => void }) {
  const [state, setState] = useState<"ready" | "playing" | "ended">("ready");
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<"reveal" | "guess">("reveal");
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const reported = useRef(false);
  const target = khashishaTargets[Math.min(round, khashishaTargets.length - 1)];

  const start = () => {
    reported.current = false;
    setRound(0); setPhase("reveal"); setScore(0); setFeedback(""); setState("playing");
    if (soundOn) speak("يالله نلعب الخشيشة. شوف مكان اللاعب، وبعدين اضغط: حفظت المكان، وابدأ البحث.");
  };
  const hidePlayer = () => {
    setPhase("guess"); setFeedback("أين اختبأ اللاعب؟ اختر المكان الصحيح.");
    if (soundOn) speak("الحين دوّر على اللاعب المختبئ.");
  };
  const choose = (spot: number) => {
    if (state !== "playing" || phase !== "guess") return;
    if (spot !== target) {
      setFeedback("اقتربت! ابحث في مكان آخر."); tone(180, .16, "sawtooth");
      if (soundOn) speak(retryVoice());
      return;
    }
    const nextScore = score + 40;
    setScore(nextScore); tone(680, .14, "triangle");
    if (round === khashishaTargets.length - 1) {
      setState("ended");
      if (!reported.current) { reported.current = true; onComplete({ score: nextScore }); }
      if (soundOn) speak(winVoice(`لقيت اللاعبين الثلاثة، وكمّلت الخشيشة بمجموع ${nextScore} نقطة.`));
      return;
    }
    setRound(value => value + 1); setPhase("reveal"); setFeedback("وجدته! شاهد مكان الاختباء التالي.");
    if (soundOn) speak(winVoice("شوف مكان الاختباء اللي بعده."));
  };

  return <section className="fareej-page min-h-screen p-3 sm:p-6"><div className="mx-auto max-w-6xl">
    <header className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-[#3c2417]/90 px-4 py-3 text-white backdrop-blur-md"><button onClick={onBack} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2"><Gamepad2 size={19}/> ألعاب الفريج</button><div className="text-center"><p className="text-xs text-[#ffe3a0]">اللعبة 6</p><h1 className="text-xl font-black sm:text-2xl">الخشيشة</h1></div><span className="rounded-xl bg-[#7b1734] px-3 py-2 font-black">⭐ {score}</span></header>
    <button onClick={() => { setSoundOn(value => !value); window.speechSynthesis?.cancel(); }} className="mb-3 mr-auto flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm text-white">{soundOn ? <Volume2 size={18}/> : <VolumeX size={18}/>} {soundOn ? "الصوت مفعّل" : "الصوت متوقف"}</button>
    <div className="added-game-board relative mx-auto aspect-[16/9] min-h-[500px] w-full overflow-hidden rounded-3xl border-2 border-[#efcf77]/70 shadow-2xl"><div className="fareej-lanterns" aria-hidden="true"/>
      {state === "playing" && <div className="khashisha-play relative z-10 mx-auto flex h-full max-w-4xl flex-col items-center justify-center p-5 text-white"><p className="mb-5 rounded-full bg-[#7b1734] px-5 py-2 font-black">الجولة {round + 1} من 3</p><div className="khashisha-spots grid w-full grid-cols-2 gap-3 sm:grid-cols-4">{khashishaSpots.map((spot, index) => <button key={spot} onClick={() => choose(index)} disabled={phase === "reveal"} className={phase === "reveal" && index === target ? "revealed" : ""}><span>{phase === "reveal" && index === target ? "🧒🏻" : "🏠"}</span><b>{spot}</b></button>)}</div>{phase === "reveal" ? <button onClick={hidePlayer} className="mt-6 rounded-2xl bg-[#7b1734] px-8 py-4 text-xl font-black">👀 حفظت المكان</button> : <p className="mt-6 text-xl font-black text-[#ffe39a]">اختر مكان الاختباء</p>}<p className="mt-3 min-h-6 font-bold text-[#ffe39a]" role="status" aria-live="polite">{feedback}</p></div>}
      {state === "ready" && <div className="fareej-overlay absolute inset-0 flex items-center justify-center p-5 text-center"><div className="fareej-card max-w-xl rounded-3xl p-6 text-white backdrop-blur-md"><div className="text-6xl">🙈</div><p className="mt-2 text-sm font-black text-[#f5d47d]">لعبة بحث ومراوغة</p><h2 className="mt-1 text-4xl font-black">الخشيشة</h2><p className="mt-4 text-lg leading-8">شاهد مكان اللاعب، واحفظه، ثم ابحث عنه بين أماكن الفريج في ثلاث جولات.</p><button onClick={start} className="mt-6 rounded-2xl bg-[#7b1734] px-8 py-4 text-xl font-black"><Play className="ml-2 inline"/> ابدأ البحث</button></div></div>}
      {state === "ended" && <div className="fareej-overlay absolute inset-0 flex items-center justify-center p-5 text-center"><div className="fareej-card max-w-lg rounded-3xl p-7 text-white backdrop-blur-md"><div className="fareej-stamp mx-auto">🙈</div><h2 className="mt-3 text-4xl font-black text-[#ffe17d]">أكملت الخشيشة</h2><p className="mt-3 text-xl">وجدت اللاعبين وجمعت <strong className="text-[#ffe17d]">{score} نقطة</strong></p><p className="mt-4 rounded-2xl bg-white/10 p-4 leading-7">الخشيشة لعبة جماعية يختبئ فيها اللاعبون، ويبحث عنهم لاعب اختير بالعد.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><button onClick={start} className="rounded-2xl bg-[#7b1734] px-6 py-3 font-black"><RotateCcw className="ml-2 inline" size={19}/> أعد اللعبة</button><button onClick={onBack} className="rounded-2xl bg-white/10 px-6 py-3 font-black"><Gamepad2 className="ml-2 inline" size={19}/> ألعاب الفريج</button></div></div></div>}
    </div>
    <Guide message={state === "ready" ? "هذي لعبة الخشيشة. شوف مكان اللاعب واحفظه، وبعدين دوّر عليه." : state === "playing" ? phase === "reveal" ? "شوف مكان اللاعب، وإذا حفظته اضغط: حفظت المكان." : `دوّر على اللاعب المختبئ. أنت في الجولة ${round + 1}.` : `كفو عليك! كمّلت الخشيشة، وجمعت ${score} نقطة.`}/>
  </div></section>;
}

type QubaDistance = "near" | "middle" | "far";
const qubaRounds: QubaDistance[] = ["near", "far", "middle"];
const qubaLabels: Record<QubaDistance, string> = { near: "قريب", middle: "متوسط", far: "بعيد" };

function QubaGame({ onBack, onComplete }: { onBack: () => void; onComplete: (reward: StationReward) => void }) {
  const [state, setState] = useState<"ready" | "playing" | "ended">("ready");
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const reported = useRef(false);
  const target = qubaRounds[Math.min(round, qubaRounds.length - 1)];
  const start = () => { reported.current = false; setRound(0); setScore(0); setFeedback(""); setState("playing"); if (soundOn) speak("يالله نلعب القَبّة. اختار قوة الضربة اللي تناسب مكان الهدف."); };
  const strike = (distance: QubaDistance) => {
    if (state !== "playing") return;
    if (distance !== target) { setFeedback("اقتربت! جرّب قوة أخرى."); tone(180, .16, "sawtooth"); if (soundOn) speak(retryVoice()); return; }
    const nextScore = score + 35; setScore(nextScore); tone(700, .15, "triangle");
    if (round === qubaRounds.length - 1) { setState("ended"); if (!reported.current) { reported.current = true; onComplete({ score: nextScore }); } if (soundOn) speak(winVoice(`كمّلت لعبة القَبّة، وجمعت ${nextScore} نقطة.`)); }
    else { setRound(value => value + 1); setFeedback("ضربة موفّقة! استعد للهدف التالي."); if (soundOn) speak(winVoice("الحين اختار قوة الهدف اللي بعده.")); }
  };
  return <section className="fareej-page min-h-screen p-3 sm:p-6"><div className="mx-auto max-w-6xl">
    <header className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-[#3c2417]/90 px-4 py-3 text-white"><button onClick={onBack} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2"><Gamepad2 size={19}/> ألعاب الفريج</button><div className="text-center"><p className="text-xs text-[#ffe3a0]">اللعبة 8</p><h1 className="text-xl font-black sm:text-2xl">القَبَّة</h1></div><span className="rounded-xl bg-[#7b1734] px-3 py-2 font-black">⭐ {score}</span></header>
    <button onClick={() => { setSoundOn(value => !value); window.speechSynthesis?.cancel(); }} className="mb-3 mr-auto flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm text-white">{soundOn ? <Volume2 size={18}/> : <VolumeX size={18}/>} {soundOn ? "الصوت مفعّل" : "الصوت متوقف"}</button>
    <div className="added-game-board relative mx-auto aspect-[16/9] min-h-[480px] w-full overflow-hidden rounded-3xl border-2 border-[#efcf77]/70 shadow-2xl"><div className="fareej-lanterns" aria-hidden="true"/>
      {state === "playing" && <div className="quba-play relative z-10 flex h-full flex-col items-center justify-center p-5 text-center text-white"><p className="rounded-full bg-[#7b1734] px-5 py-2 font-black">الهدف {round + 1} من 3</p><div className={`quba-target ${target}`}><span>🎯</span><i/><b>{qubaLabels[target]}</b></div><p className="text-xl font-black text-[#ffe39a]">اختر قوة الضربة المناسبة</p><div className="quba-controls mt-4 grid w-full max-w-2xl grid-cols-3 gap-3">{(["near", "middle", "far"] as QubaDistance[]).map(distance => <button key={distance} onClick={() => strike(distance)}><span>{distance === "near" ? "🪵" : distance === "middle" ? "🪵🪵" : "🪵🪵🪵"}</span><b>{qubaLabels[distance]}</b></button>)}</div><p className="mt-3 min-h-6 font-bold text-[#ffe39a]" role="status" aria-live="polite">{feedback}</p></div>}
      {state === "ready" && <div className="fareej-overlay absolute inset-0 flex items-center justify-center p-5 text-center"><div className="fareej-card max-w-xl rounded-3xl p-6 text-white"><div className="text-6xl">🪵</div><p className="mt-2 text-sm font-black text-[#f5d47d]">لعبة دقّة ومسافة</p><h2 className="mt-1 text-4xl font-black">القَبَّة</h2><p className="mt-4 text-lg leading-8">اضبط قوة الضربة الرقمية لتصل القطعة الخشبية إلى الهدف القريب أو المتوسط أو البعيد.</p><button onClick={start} className="mt-6 rounded-2xl bg-[#7b1734] px-8 py-4 text-xl font-black"><Play className="ml-2 inline"/> ابدأ التحدّي</button></div></div>}
      {state === "ended" && <div className="fareej-overlay absolute inset-0 flex items-center justify-center p-5 text-center"><div className="fareej-card max-w-lg rounded-3xl p-7 text-white"><div className="fareej-stamp mx-auto">🪵</div><h2 className="mt-3 text-4xl font-black text-[#ffe17d]">أكملت القَبَّة</h2><p className="mt-3 text-xl">جمعت <strong className="text-[#ffe17d]">{score} نقطة</strong></p><p className="mt-4 rounded-2xl bg-white/10 p-4 leading-7">تُلعَب القَبَّة بعصا وقطعة خشبية قصيرة؛ تُرفع القطعة ثم تُضرَب لتبتعد.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><button onClick={start} className="rounded-2xl bg-[#7b1734] px-6 py-3 font-black"><RotateCcw className="ml-2 inline" size={19}/> أعد اللعبة</button><button onClick={onBack} className="rounded-2xl bg-white/10 px-6 py-3 font-black"><Gamepad2 className="ml-2 inline" size={19}/> ألعاب الفريج</button></div></div></div>}
    </div><Guide message={state === "ready" ? "هذي لعبة القَبّة. اختار قوة الضربة اللي تناسب مكان الهدف." : state === "playing" ? `الهدف ${qubaLabels[target]}. اختار قوة الضربة المناسبة.` : `ما شاء الله عليك! كمّلت لعبة القَبّة، وجمعت ${score} نقطة.`}/>
  </div></section>;
}

const balloonPositions = [{ x: 14, y: 26 }, { x: 31, y: 52 }, { x: 47, y: 24 }, { x: 63, y: 55 }, { x: 80, y: 29 }, { x: 88, y: 62 }];

function BalloonGame({ onBack, onComplete }: { onBack: () => void; onComplete: (reward: StationReward) => void }) {
  const [state, setState] = useState<"ready" | "playing" | "ended">("ready");
  const [popped, setPopped] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const reported = useRef(false);
  const start = () => { reported.current = false; setPopped([]); setScore(0); setState("playing"); if (soundOn) speak("يالله نبدأ تحدّي البالونات. اضغط البالونات الستة الكبيرة، وفرّقعها كلها."); };
  const pop = (index: number) => {
    if (state !== "playing" || popped.includes(index)) return;
    const next = [...popped, index]; const nextScore = score + 20; setPopped(next); setScore(nextScore); tone(760, .09, "square");
    if (next.length === balloonPositions.length) { setState("ended"); if (!reported.current) { reported.current = true; onComplete({ score: nextScore }); } if (soundOn) speak(winVoice(`فرّقت البالونات كلها، وجمعت ${nextScore} نقطة.`)); }
  };
  return <section className="fareej-page min-h-screen p-3 sm:p-6"><div className="mx-auto max-w-6xl">
    <header className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-[#3c2417]/90 px-4 py-3 text-white"><button onClick={onBack} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2"><Gamepad2 size={19}/> ألعاب الفريج</button><div className="text-center"><p className="text-xs text-[#ffe3a0]">اللعبة 9</p><h1 className="text-xl font-black sm:text-2xl">فرقعة البالونات</h1></div><span className="rounded-xl bg-[#7b1734] px-3 py-2 font-black">🎈 {popped.length}/6</span></header>
    <button onClick={() => { setSoundOn(value => !value); window.speechSynthesis?.cancel(); }} className="mb-3 mr-auto flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm text-white">{soundOn ? <Volume2 size={18}/> : <VolumeX size={18}/>} {soundOn ? "الصوت مفعّل" : "الصوت متوقف"}</button>
    <div className="added-game-board balloon-board relative mx-auto aspect-[16/9] min-h-[480px] w-full overflow-hidden rounded-3xl border-2 border-[#efcf77]/70 shadow-2xl"><div className="fareej-lanterns" aria-hidden="true"/>
      {state === "playing" && <div className="balloon-targets absolute inset-0">{balloonPositions.map((position, index) => <button key={index} onClick={() => pop(index)} disabled={popped.includes(index)} className={popped.includes(index) ? "popped" : ""} style={{ left: position.x + "%", top: position.y + "%" }} aria-label={popped.includes(index) ? `تمت فرقعة البالون ${index + 1}` : `فرقع البالون ${index + 1}`}>{popped.includes(index) ? "✨" : "🎈"}</button>)}<p className="balloon-counter">اضغط البالونات الكبيرة · بقي {balloonPositions.length - popped.length}</p></div>}
      {state === "ready" && <div className="fareej-overlay absolute inset-0 flex items-center justify-center p-5 text-center"><div className="fareej-card max-w-xl rounded-3xl p-6 text-white"><div className="text-6xl">🎈</div><p className="mt-2 text-sm font-black text-[#f5d47d]">ركن فعالية حديث داخل الفريج</p><h2 className="mt-1 text-4xl font-black">فرقعة البالونات</h2><p className="mt-4 text-lg leading-8">اضغط البالونات الستة الظاهرة على الشاشة. الأهداف كبيرة ولا يوجد مؤقّت.</p><button onClick={start} className="mt-6 rounded-2xl bg-[#7b1734] px-8 py-4 text-xl font-black"><Play className="ml-2 inline"/> ابدأ التحدّي</button></div></div>}
      {state === "ended" && <div className="fareej-overlay absolute inset-0 flex items-center justify-center p-5 text-center"><div className="fareej-card max-w-lg rounded-3xl p-7 text-white"><div className="fareej-stamp mx-auto">🎈</div><h2 className="mt-3 text-4xl font-black text-[#ffe17d]">أكملت التحدّي</h2><p className="mt-3 text-xl">جمعت <strong className="text-[#ffe17d]">{score} نقطة</strong></p><p className="mt-4 rounded-2xl bg-white/10 p-4 leading-7">هذا ركن حركي حديث أُضيف إلى الفعالية لزيادة المرح وسهولة المشاركة.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><button onClick={start} className="rounded-2xl bg-[#7b1734] px-6 py-3 font-black"><RotateCcw className="ml-2 inline" size={19}/> أعد اللعبة</button><button onClick={onBack} className="rounded-2xl bg-white/10 px-6 py-3 font-black"><Gamepad2 className="ml-2 inline" size={19}/> ألعاب الفريج</button></div></div></div>}
    </div><Guide message={state === "ready" ? "هذا تحدّي فرقعة البالونات. اضغط البالونات الستة الكبيرة، وما عندنا مؤقّت." : state === "playing" ? `باقي ${balloonPositions.length - popped.length} بالونات.` : `زين عليك! كمّلت التحدّي، وجمعت ${score} نقطة.`}/>
  </div></section>;
}

const craftParts = [
  { id: "frame", emoji: "🪵", label: "الإطار الخشبي" },
  { id: "paper", emoji: "📜", label: "الورق" },
  { id: "string", emoji: "🧵", label: "الخيط" },
  { id: "decor", emoji: "🎨", label: "الزينة" },
];
const craftChoiceOrder = [craftParts[2], craftParts[0], craftParts[3], craftParts[1]];

function CraftGame({ onBack, onComplete }: { onBack: () => void; onComplete: (reward: StationReward) => void }) {
  const [state, setState] = useState<"ready" | "playing" | "ended">("ready");
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const reported = useRef(false);
  const expected = craftParts[Math.min(step, craftParts.length - 1)];
  const start = () => { reported.current = false; setStep(0); setScore(0); setFeedback(""); setState("playing"); if (soundOn) speak("يالله نبدأ ورشة صناعة الألعاب القديمة. اختار أجزاء الطائرة الورقية بالترتيب اللي يظهر لك."); };
  const choose = (id: string) => {
    if (state !== "playing") return;
    if (id !== expected.id) { setFeedback(`ابدأ الآن بـ ${expected.label}.`); tone(180, .16, "sawtooth"); if (soundOn) speak(retryVoice()); return; }
    const nextStep = step + 1; const nextScore = score + 25; setStep(nextStep); setScore(nextScore); setFeedback("قطعة صحيحة… تابع البناء."); tone(660, .13, "triangle");
    if (nextStep === craftParts.length) { setState("ended"); if (!reported.current) { reported.current = true; onComplete({ score: nextScore }); } if (soundOn) speak(winVoice(`كمّلت صنع الطائرة الورقية، وجمعت ${nextScore} نقطة.`)); }
  };
  return <section className="fareej-page min-h-screen p-3 sm:p-6"><div className="mx-auto max-w-6xl">
    <header className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-[#3c2417]/90 px-4 py-3 text-white"><button onClick={onBack} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2"><Gamepad2 size={19}/> ألعاب الفريج</button><div className="text-center"><p className="text-xs text-[#ffe3a0]">اللعبة 10</p><h1 className="text-xl font-black sm:text-2xl">صناعة الألعاب القديمة</h1></div><span className="rounded-xl bg-[#7b1734] px-3 py-2 font-black">⭐ {score}</span></header>
    <button onClick={() => { setSoundOn(value => !value); window.speechSynthesis?.cancel(); }} className="mb-3 mr-auto flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm text-white">{soundOn ? <Volume2 size={18}/> : <VolumeX size={18}/>} {soundOn ? "الصوت مفعّل" : "الصوت متوقف"}</button>
    <div className="added-game-board relative mx-auto aspect-[16/9] min-h-[500px] w-full overflow-hidden rounded-3xl border-2 border-[#efcf77]/70 shadow-2xl"><div className="fareej-lanterns" aria-hidden="true"/>
      {state === "playing" && <div className="craft-play relative z-10 flex h-full flex-col items-center justify-center p-5 text-center text-white"><p className="rounded-full bg-[#7b1734] px-5 py-2 font-black">اصنع طائرة ورقية</p><div className="craft-build my-6" aria-label={`اكتملت ${step} من 4 قطع`}>{craftParts.map((part, index) => <span key={part.id} className={index < step ? "done" : ""}>{index < step ? part.emoji : "○"}</span>)}</div><p className="text-xl font-black text-[#ffe39a]">الخطوة التالية: {expected.label}</p><div className="craft-choices mt-5 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">{craftChoiceOrder.map(part => <button key={part.id} onClick={() => choose(part.id)} disabled={craftParts.findIndex(item => item.id === part.id) < step}><span>{part.emoji}</span><b>{part.label}</b></button>)}</div><p className="mt-3 min-h-6 font-bold text-[#ffe39a]" role="status" aria-live="polite">{feedback}</p></div>}
      {state === "ready" && <div className="fareej-overlay absolute inset-0 flex items-center justify-center p-5 text-center"><div className="fareej-card max-w-xl rounded-3xl p-6 text-white"><div className="text-6xl">🪁</div><p className="mt-2 text-sm font-black text-[#f5d47d]">ورشة رقمية مبسّطة</p><h2 className="mt-1 text-4xl font-black">صناعة الألعاب القديمة</h2><p className="mt-4 text-lg leading-8">رتّب الإطار والورق والخيط والزينة لتبني طائرة ورقية مستوحاة من ألعاب الفريج البسيطة.</p><button onClick={start} className="mt-6 rounded-2xl bg-[#7b1734] px-8 py-4 text-xl font-black"><Play className="ml-2 inline"/> ابدأ الصناعة</button></div></div>}
      {state === "ended" && <div className="fareej-overlay absolute inset-0 flex items-center justify-center p-5 text-center"><div className="fareej-card max-w-lg rounded-3xl p-7 text-white"><div className="fareej-stamp mx-auto">🪁</div><h2 className="mt-3 text-4xl font-black text-[#ffe17d]">اكتملت الطائرة الورقية</h2><p className="mt-3 text-xl">جمعت <strong className="text-[#ffe17d]">{score} نقطة</strong></p><p className="mt-4 rounded-2xl bg-white/10 p-4 leading-7">توضح الورشة كيف يمكن صنع لعبة ممتعة من مواد قليلة وخطوات بسيطة.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><button onClick={start} className="rounded-2xl bg-[#7b1734] px-6 py-3 font-black"><RotateCcw className="ml-2 inline" size={19}/> أعد الورشة</button><button onClick={onBack} className="rounded-2xl bg-white/10 px-6 py-3 font-black"><Gamepad2 className="ml-2 inline" size={19}/> ألعاب الفريج</button></div></div></div>}
    </div><Guide message={state === "ready" ? "هذي ورشة صناعة الألعاب القديمة. بنبني طائرة ورقية من أربع قطع." : state === "playing" ? `اختار الحين ${expected.label}. كمّلت ${step} من أربع خطوات.` : `كفو عليك! كمّلت الطائرة الورقية، وجمعت ${score} نقطة.`}/>
  </div></section>;
}

type FareejMiniGame = "teela" | "dahrooj" | "saqla" | "tug" | "karabi" | "khashisha" | "sack" | "quba" | "balloons" | "craft";
const fareejGames: Array<{ id: FareejMiniGame; emoji: string; name: string; description: string }> = [
  { id: "teela", emoji: "🔵", name: "التيلة", description: "صوّب الكرات الزجاجية بدقة" },
  { id: "dahrooj", emoji: "⭕", name: "الدحروي", description: "وجّه العجلة حتى خط النهاية" },
  { id: "saqla", emoji: "🪨", name: "الصقلة (اللقفة)", description: "التقط الحصى بالترتيب" },
  { id: "tug", emoji: "🪢", name: "شد الحبل", description: "اسحب بإيقاع منتظم وتعاون مع فريقك" },
  { id: "karabi", emoji: "🦶", name: "الكرابي", description: "اقفز وحافظ على التوازن" },
  { id: "khashisha", emoji: "🙈", name: "الخشيشة", description: "احفظ مكان اللاعب وابحث عنه" },
  { id: "sack", emoji: "🏁", name: "سباق أكياس الخيش", description: "اقفز حتى خط النهاية" },
  { id: "quba", emoji: "🪵", name: "القَبَّة", description: "اضبط قوة ضربة القطعة الخشبية" },
  { id: "balloons", emoji: "🎈", name: "فرقعة البالونات", description: "اضغط الأهداف الكبيرة" },
  { id: "craft", emoji: "🪁", name: "صناعة الألعاب القديمة", description: "ابنِ طائرة ورقية خطوة بخطوة" },
];

function FareejGame({ onBack, onComplete }: { onBack: () => void; onComplete: (reward: StationReward) => void }) {
  const [activeGame, setActiveGame] = useState<FareejMiniGame | null>(null);
  const [completedGames, setCompletedGames] = useState<FareejMiniGame[]>([]);
  const [gameScores, setGameScores] = useState<Partial<Record<FareejMiniGame, number>>>({});
  const [storageReady, setStorageReady] = useState(false);
  const reportedStation = useRef(false);
  const totalScore = Object.values(gameScores).reduce((sum, value) => sum + (value ?? 0), 0);
  const allCompleted = completedGames.length === fareejGames.length;
  const completionPercent = (completedGames.length / fareejGames.length) * 100;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem("qatar-lol-fareej-games");
        if (stored) {
          const parsed = JSON.parse(stored) as { completed?: unknown; scores?: unknown };
          const valid = new Set(fareejGames.map(game => game.id));
          const safeCompleted = Array.isArray(parsed.completed) ? parsed.completed.filter((id): id is FareejMiniGame => typeof id === "string" && valid.has(id as FareejMiniGame)) : [];
          setCompletedGames([...new Set(safeCompleted)]);
          const storedScores = parsed.scores && typeof parsed.scores === "object" ? parsed.scores as Record<string, unknown> : {};
          const safeScores: Partial<Record<FareejMiniGame, number>> = {};
          fareejGames.forEach(game => {
            const value = storedScores[game.id];
            if (typeof value === "number" && Number.isFinite(value) && value >= 0) safeScores[game.id] = value;
          });
          setGameScores(safeScores);
        }
      } catch {
        setCompletedGames([]);
        setGameScores({});
      } finally {
        setStorageReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem("qatar-lol-fareej-games", JSON.stringify({ completed: completedGames, scores: gameScores }));
  }, [completedGames, gameScores, storageReady]);

  useEffect(() => {
    if (!allCompleted || reportedStation.current) return;
    reportedStation.current = true;
    onComplete({ score: totalScore });
    speak(winVoice(`كمّلت ألعاب الفريج العشر، وحصلت على الختم الكامل بمجموع ${totalScore} نقطة.`));
  }, [allCompleted, totalScore, onComplete]);

  const completeGame = (game: FareejMiniGame, reward: StationReward) => {
    setCompletedGames(current => current.includes(game) ? current : [...current, game]);
    setGameScores(current => ({ ...current, [game]: Math.max(current[game] ?? 0, reward.score) }));
  };
  const resetGames = () => {
    reportedStation.current = false;
    setCompletedGames([]);
    setGameScores({});
    speak("يالله، نبدأ جولة يديدة في فريج الألعاب.");
  };

  if (activeGame === "teela") return <TeelaGame onBack={() => setActiveGame(null)} onComplete={reward => completeGame("teela", reward)}/>;
  if (activeGame === "dahrooj") return <DahroojGame onBack={() => setActiveGame(null)} onComplete={reward => completeGame("dahrooj", reward)}/>;
  if (activeGame === "saqla") return <SaqlaGame onBack={() => setActiveGame(null)} onComplete={reward => completeGame("saqla", reward)}/>;
  if (activeGame === "tug") return <RhythmGame config={rhythmGameConfigs.tug} onBack={() => setActiveGame(null)} onComplete={reward => completeGame("tug", reward)}/>;
  if (activeGame === "karabi") return <RhythmGame config={rhythmGameConfigs.karabi} onBack={() => setActiveGame(null)} onComplete={reward => completeGame("karabi", reward)}/>;
  if (activeGame === "khashisha") return <KhashishaGame onBack={() => setActiveGame(null)} onComplete={reward => completeGame("khashisha", reward)}/>;
  if (activeGame === "sack") return <RhythmGame config={rhythmGameConfigs.sack} onBack={() => setActiveGame(null)} onComplete={reward => completeGame("sack", reward)}/>;
  if (activeGame === "quba") return <QubaGame onBack={() => setActiveGame(null)} onComplete={reward => completeGame("quba", reward)}/>;
  if (activeGame === "balloons") return <BalloonGame onBack={() => setActiveGame(null)} onComplete={reward => completeGame("balloons", reward)}/>;
  if (activeGame === "craft") return <CraftGame onBack={() => setActiveGame(null)} onComplete={reward => completeGame("craft", reward)}/>;

  return <section className="fareej-page min-h-screen p-3 sm:p-6">
    <div className="mx-auto max-w-6xl">
      <header className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-[#3c2417]/90 px-4 py-3 text-white backdrop-blur-md"><button onClick={onBack} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 hover:bg-white/20"><HomeIcon size={19}/> القرية</button><div className="text-center"><p className="text-xs text-[#ffe3a0]">المحطة الخامسة</p><h1 className="text-xl font-black sm:text-2xl">فريج الألعاب</h1></div><div className="flex gap-2"><span className="rounded-xl bg-[#7b1734] px-3 py-2 font-black">✓ {completedGames.length}/10</span><span className="rounded-xl bg-white/15 px-3 py-2 font-black">⭐ {totalScore}</span></div></header>

      <div className="fareej-hub relative mx-auto min-h-[560px] overflow-hidden rounded-3xl border-2 border-[#efcf77]/70 p-5 shadow-2xl sm:p-8">
        <div className="fareej-lanterns" aria-hidden="true"/>
        {!allCompleted ? <div className="relative z-10 mx-auto max-w-5xl text-center"><p className="text-sm font-black text-[#f4d17a]">اختر لعبة وابدأ</p><h2 className="mt-1 text-3xl font-black sm:text-5xl">10 ألعاب في فريج لوّل</h2><p className="optional-detail mx-auto mt-3 max-w-2xl text-lg leading-8 text-white/85">أكمل الألعاب بالترتيب الذي يناسبك. لا يوجد مؤقّت، ويحفظ الموقع تقدمك تلقائيًا.</p><div className="fareej-progress-card mt-6"><div className="fareej-progress-heading"><span>سجل إنجاز الفريج</span><strong>{completedGames.length} من {fareejGames.length}</strong></div><div className="fareej-progress-track" role="progressbar" aria-label="تقدّم ألعاب الفريج" aria-valuemin={0} aria-valuemax={fareejGames.length} aria-valuenow={completedGames.length}><i style={{ width: `${completionPercent}%` }}/></div><div className="fareej-progress-stamps">{fareejGames.map((game, index) => { const done = completedGames.includes(game.id); return <span key={game.id} className={done ? "earned" : ""} aria-label={`${game.name}: ${done ? `مكتملة، ${gameScores[game.id] ?? 0} نقطة` : "لم تكتمل بعد"}`}><b aria-hidden="true">{done ? game.emoji : index + 1}</b><small>{game.name}</small></span>; })}</div></div><div className="fareej-game-grid mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{fareejGames.map((game, index) => { const done = completedGames.includes(game.id); return <button key={game.id} onClick={() => setActiveGame(game.id)} className={`fareej-game-card${done ? " completed" : ""}`}><span className="fareej-game-number" aria-hidden="true">{index + 1}</span><span className="fareej-game-emoji" aria-hidden="true">{game.emoji}</span><b>{game.name}</b><p>{game.description}</p><em>{done ? `مكتملة ✓ · ${gameScores[game.id] ?? 0} نقطة` : "ابدأ اللعبة"}</em></button>; })}</div><a href="https://qm.org.qa/en/about-us/publications/childrens-books/traditional-games-in-qatar/" target="_blank" rel="noreferrer" className="mt-7 inline-block text-sm font-bold text-[#ffe39a] underline underline-offset-4">مرجع الألعاب الشعبية: متاحف قطر</a></div> : <div className="fareej-hub-complete relative z-10 mx-auto max-w-2xl text-center"><div className="fareej-stamp mx-auto">🏆</div><p className="mt-4 text-sm font-black text-[#f4d17a]">أكملت 10 من 10</p><h2 className="mt-1 text-4xl font-black text-[#ffe39a] sm:text-5xl">الختم الكامل لفريج الألعاب</h2><p className="mt-4 text-xl leading-8">أكملت ألعاب الفريج العشر، وجمعت <strong className="text-[#ffe17d]">{totalScore} نقطة</strong>.</p><div className="fareej-earned-stamps mt-6" aria-label="الأختام العشرة المكتملة">{fareejGames.map(game => <span key={game.id}><b aria-hidden="true">{game.emoji}</b><small>{game.name}</small><em>⭐ {gameScores[game.id] ?? 0}</em></span>)}</div><div className="mt-6 flex flex-wrap justify-center gap-3"><button onClick={onBack} className="rounded-2xl bg-[#7b1734] px-7 py-4 text-lg font-black"><HomeIcon className="ml-2 inline" size={20}/> العودة إلى القرية</button><button onClick={resetGames} className="rounded-2xl bg-white/10 px-6 py-4 font-black"><RotateCcw className="ml-2 inline" size={19}/> أعد الألعاب</button></div></div>}
      </div>

      <Guide message={allCompleted ? `ما شاء الله عليك! كمّلت ألعاب الفريج العشر، وجمعت ${totalScore} نقطة، وحصلت على الختم الكامل.` : completedGames.length === 0 ? "حيّاكم في فريج الألعاب! هني كان عيال الفريج يجتمعون ويلعبون عقب العصر. عندنا الدحروي، والتيلة، والصقلة، والكرابي، وألعاب ثانية من ألعاب أول. يالله، أي لعبة بنجرّب أول؟" : `هني في فريج الألعاب عشر ألعاب. اختار اللعبة اللي ودّك تبدأ فيها. كمّلت ${completedGames.length} من عشر.`}/>
    </div>
  </section>;
}

type StudioScene = { id: string; name: string; emoji: string; image: string };
const studioScenes: StudioScene[] = [
  { id: "souq", name: "سوق لوّل", emoji: "🏪", image: "/assets/souq-lol.png" },
  { id: "sea", name: "بحر اللؤلؤ", emoji: "🐚", image: "/assets/pearl-sea-clean.png" },
  { id: "dhow", name: "رحلة النوخذة", emoji: "🛶", image: "/assets/nokhatha-sea.png" },
  { id: "majlis", name: "مجلس لوّل", emoji: "🏠", image: "/assets/majlis-lol.png" },
  { id: "fareej", name: "فريج الألعاب", emoji: "🪁", image: "/assets/qatar-lol-gate.png" },
];

function loadStudioImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image-load-failed"));
    image.src = src;
  });
}

function revokeStudioObjectUrl(url: string | null) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

function drawStudioCover(context: CanvasRenderingContext2D, source: CanvasImageSource, sourceWidth: number, sourceHeight: number, x: number, y: number, width: number, height: number) {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  let cropX = 0;
  let cropY = 0;
  if (sourceRatio > targetRatio) {
    cropWidth = sourceHeight * targetRatio;
    cropX = (sourceWidth - cropWidth) / 2;
  } else {
    cropHeight = sourceWidth / targetRatio;
    cropY = (sourceHeight - cropHeight) / 2;
  }
  context.drawImage(source, cropX, cropY, cropWidth, cropHeight, x, y, width, height);
}

function studioRoundedPath(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function PhotoStudio({ onBack, onComplete }: { onBack: () => void; onComplete: (reward: StationReward) => void }) {
  const [sceneId, setSceneId] = useState(studioScenes[0].id);
  const [visitorName, setVisitorName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [privacyPromptOpen, setPrivacyPromptOpen] = useState(false);
  const [feedback, setFeedback] = useState("اختر مشهدًا، ثم التقط صورة أو اخترها من جهازك.");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const privacyConfirmRef = useRef<HTMLButtonElement>(null);
  const downloadCleanupTimerRef = useRef<number | null>(null);
  const sessionRevisionRef = useRef(0);
  const studioActiveRef = useRef(true);
  const reported = useRef(false);
  const selectedScene = studioScenes.find(scene => scene.id === sceneId) ?? studioScenes[0];

  const stopCameraResources = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const stopCamera = useCallback(() => {
    stopCameraResources();
    setCameraOpen(false);
  }, [stopCameraResources]);

  const replacePhotoObjectUrl = useCallback((nextUrl: string | null) => {
    revokeStudioObjectUrl(photoUrlRef.current);
    photoUrlRef.current = nextUrl;
    setPhotoUrl(nextUrl);
  }, []);

  const replaceResultObjectUrl = useCallback((nextUrl: string | null) => {
    revokeStudioObjectUrl(resultUrlRef.current);
    resultUrlRef.current = nextUrl;
    setResultUrl(nextUrl);
  }, []);

  const cancelDownloadCleanup = useCallback(() => {
    if (downloadCleanupTimerRef.current === null) return;
    window.clearTimeout(downloadCleanupTimerRef.current);
    downloadCleanupTimerRef.current = null;
  }, []);

  const clearImageMemory = useCallback(() => {
    sessionRevisionRef.current += 1;
    replacePhotoObjectUrl(null);
    replaceResultObjectUrl(null);
  }, [replacePhotoObjectUrl, replaceResultObjectUrl]);

  const disposeStudioResources = useCallback(() => {
    sessionRevisionRef.current += 1;
    stopCameraResources();
    revokeStudioObjectUrl(photoUrlRef.current);
    revokeStudioObjectUrl(resultUrlRef.current);
    photoUrlRef.current = null;
    resultUrlRef.current = null;
    cancelDownloadCleanup();
  }, [cancelDownloadCleanup, stopCameraResources]);

  useEffect(() => {
    studioActiveRef.current = true;
    const clearOnPageHide = () => {
      studioActiveRef.current = false;
      disposeStudioResources();
      setCameraOpen(false);
      setPrivacyPromptOpen(false);
      setPhotoUrl(null);
      setResultUrl(null);
      setVisitorName("");
    };
    const reactivateAfterPageShow = () => {
      studioActiveRef.current = true;
    };
    window.addEventListener("pagehide", clearOnPageHide);
    window.addEventListener("pageshow", reactivateAfterPageShow);
    return () => {
      window.removeEventListener("pagehide", clearOnPageHide);
      window.removeEventListener("pageshow", reactivateAfterPageShow);
      studioActiveRef.current = false;
      disposeStudioResources();
    };
  }, [disposeStudioResources]);

  useEffect(() => {
    if (!cameraOpen || !streamRef.current || !videoRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play();
  }, [cameraOpen]);

  useEffect(() => {
    if (!privacyPromptOpen) return;
    privacyConfirmRef.current?.focus();
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPrivacyPromptOpen(false);
    };
    window.addEventListener("keydown", cancelOnEscape);
    return () => window.removeEventListener("keydown", cancelOnEscape);
  }, [privacyPromptOpen]);

  const openCameraPrivacyNotice = () => {
    setPrivacyPromptOpen(true);
    setFeedback("اقرأ إشعار الخصوصية، ثم اختر ما يناسبك.");
  };

  const startCamera = async () => {
    setPrivacyPromptOpen(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setFeedback("الكاميرا غير متاحة في هذا الجهاز. يمكنك اختيار صورة من جهازك.");
      speak("الكاميرا مو متاحة على هالجهاز. تقدر تختار صورة من جهازك.");
      return;
    }
    const requestRevision = sessionRevisionRef.current;
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (!studioActiveRef.current || requestRevision !== sessionRevisionRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      setCameraOpen(true);
      setFeedback("الكاميرا جاهزة. انظر إلى العدسة، ثم اضغط زر «التقط الصورة».");
    } catch {
      if (!studioActiveRef.current || requestRevision !== sessionRevisionRef.current) return;
      setFeedback("لم تُمنح صلاحية الكاميرا. يمكنك اختيار صورة من جهازك بدلًا منها.");
      speak("ما قدرنا نشغّل الكاميرا. تقدر تختار صورة من جهازك.");
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setFeedback("انتظر لحظة حتى تصبح الكاميرا جاهزة، ثم حاول مرة أخرى.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 1100;
    const context = canvas.getContext("2d");
    if (!context) return;
    drawStudioCover(context, video, video.videoWidth, video.videoHeight, 0, 0, canvas.width, canvas.height);
    const captureRevision = sessionRevisionRef.current;
    stopCamera();
    canvas.toBlob(blob => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;
      if (!blob || !studioActiveRef.current || captureRevision !== sessionRevisionRef.current) return;
      const nextPhotoUrl = URL.createObjectURL(blob);
      if (!studioActiveRef.current || captureRevision !== sessionRevisionRef.current) {
        URL.revokeObjectURL(nextPhotoUrl);
        return;
      }
      replacePhotoObjectUrl(nextPhotoUrl);
      replaceResultObjectUrl(null);
      setFeedback("تم التقاط الصورة محليًا. اضغط زر «أنشئ الذكرى».");
      tone(720, .16);
    }, "image/jpeg", .92);
  };

  const chooseLocalPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFeedback("اختر ملف صورة فقط.");
      event.target.value = "";
      return;
    }
    sessionRevisionRef.current += 1;
    stopCamera();
    const nextPhotoUrl = URL.createObjectURL(file);
    replacePhotoObjectUrl(nextPhotoUrl);
    replaceResultObjectUrl(null);
    setFeedback("تم اختيار الصورة محليًا من جهازك. اضغط زر «أنشئ الذكرى».");
    event.target.value = "";
  };

  const makeKeepsake = async () => {
    const sourcePhotoUrl = photoUrlRef.current;
    if (!sourcePhotoUrl) {
      setFeedback("التقط صورة أو اخترها من جهازك أولًا.");
      speak("أول شي، التقط صورة أو اختارها من جهازك.");
      return;
    }
    const renderRevision = sessionRevisionRef.current;
    const sceneForRender = selectedScene;
    const visitorNameForRender = visitorName;
    setFeedback("جارٍ تجهيز ذكرى قطر لوّل داخل متصفحك…");
    try {
      const [sceneImage, personImage] = await Promise.all([loadStudioImage(sceneForRender.image), loadStudioImage(sourcePhotoUrl)]);
      if (!studioActiveRef.current || renderRevision !== sessionRevisionRef.current) return;
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 900;
      const context = canvas.getContext("2d");
      if (!context) return;

      context.fillStyle = "#2b1118";
      context.fillRect(0, 0, canvas.width, canvas.height);
      drawStudioCover(context, sceneImage, sceneImage.naturalWidth, sceneImage.naturalHeight, 0, 0, 980, 900);
      const sceneShade = context.createLinearGradient(0, 300, 0, 900);
      sceneShade.addColorStop(0, "rgba(24,8,8,0)");
      sceneShade.addColorStop(1, "rgba(35,12,16,.88)");
      context.fillStyle = sceneShade;
      context.fillRect(0, 0, 980, 900);

      const panelShade = context.createLinearGradient(980, 0, 1600, 900);
      panelShade.addColorStop(0, "#6f1835");
      panelShade.addColorStop(1, "#2a1118");
      context.fillStyle = panelShade;
      context.fillRect(980, 0, 620, 900);
      context.fillStyle = "#e8c66e";
      context.fillRect(972, 0, 8, 900);

      context.save();
      studioRoundedPath(context, 1035, 130, 510, 520, 38);
      context.clip();
      drawStudioCover(context, personImage, personImage.naturalWidth, personImage.naturalHeight, 1035, 130, 510, 520);
      context.restore();
      context.strokeStyle = "#f1d27b";
      context.lineWidth = 8;
      studioRoundedPath(context, 1035, 130, 510, 520, 38);
      context.stroke();

      context.direction = "rtl";
      context.textAlign = "center";
      context.fillStyle = "#f5d77f";
      context.font = "900 38px Arial";
      context.fillText("مركز الشفلح", 1290, 76);
      context.fillStyle = "#fff7df";
      context.font = "900 48px Arial";
      context.fillText(visitorNameForRender.trim() || "مستكشف قطر لوّل", 1290, 724);
      context.fillStyle = "#f5d77f";
      context.font = "900 33px Arial";
      context.fillText("ذكرى من قطر لوّل", 1290, 782);
      context.fillStyle = "rgba(255,247,223,.82)";
      context.font = "700 25px Arial";
      context.fillText("رحلة إلى تراث قطر", 1290, 827);

      context.textAlign = "right";
      context.fillStyle = "#fff7df";
      context.font = "900 58px Arial";
      context.fillText("ذكرى من قطر لوّل", 910, 760);
      context.fillStyle = "#f5d77f";
      context.font = "900 34px Arial";
      context.fillText(`${sceneForRender.emoji} ${sceneForRender.name}`, 910, 818);

      canvas.toBlob(blob => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
        if (!blob || !studioActiveRef.current || renderRevision !== sessionRevisionRef.current) return;
        const nextResultUrl = URL.createObjectURL(blob);
        if (!studioActiveRef.current || renderRevision !== sessionRevisionRef.current) {
          URL.revokeObjectURL(nextResultUrl);
          return;
        }
        replaceResultObjectUrl(nextResultUrl);
        setFeedback("اكتملت الذكرى محليًا. يمكنك حفظها على جهازك الآن.");
        if (!reported.current) {
          reported.current = true;
          onComplete({ score: 100 });
        }
        tone(660, .14);
        window.setTimeout(() => tone(880, .24), 130);
        speak(winVoice("اكتملت ذكراك من قطر لوّل، وحصلت على ختم الاستوديو."));
      }, "image/png");
    } catch {
      if (!studioActiveRef.current || renderRevision !== sessionRevisionRef.current) return;
      setFeedback("تعذّر تجهيز الذكرى. جرّب صورة أخرى.");
    }
  };

  const changeScene = (nextSceneId: string) => {
    sessionRevisionRef.current += 1;
    setSceneId(nextSceneId);
    replaceResultObjectUrl(null);
  };

  const changeVisitorName = (nextName: string) => {
    sessionRevisionRef.current += 1;
    setVisitorName(nextName);
    replaceResultObjectUrl(null);
  };

  const retakePhoto = () => {
    cancelDownloadCleanup();
    stopCamera();
    clearImageMemory();
    setFeedback("تم حذف الصورة السابقة من الجلسة. افتح الكاميرا عندما تكون مستعدًا.");
    setPrivacyPromptOpen(true);
  };

  const saveImageLocally = () => {
    cancelDownloadCleanup();
    const savedPhotoUrl = photoUrlRef.current;
    const savedResultUrl = resultUrlRef.current;
    setFeedback("يتم حفظ الصورة على جهازك…");
    downloadCleanupTimerRef.current = window.setTimeout(() => {
      downloadCleanupTimerRef.current = null;
      const clearsCurrentPhoto = photoUrlRef.current === savedPhotoUrl;
      const clearsCurrentResult = resultUrlRef.current === savedResultUrl;
      if (clearsCurrentPhoto || clearsCurrentResult) sessionRevisionRef.current += 1;
      revokeStudioObjectUrl(savedPhotoUrl);
      revokeStudioObjectUrl(savedResultUrl);
      if (clearsCurrentPhoto) {
        photoUrlRef.current = null;
        setPhotoUrl(null);
      }
      if (clearsCurrentResult) {
        resultUrlRef.current = null;
        setResultUrl(null);
      }
      if (photoUrlRef.current === null && resultUrlRef.current === null) {
        setVisitorName("");
        setFeedback("تم حفظ الصورة على جهازك وحذفها من جلسة الاستوديو.");
      }
    }, 800);
  };

  const resetStudio = () => {
    cancelDownloadCleanup();
    stopCamera();
    clearImageMemory();
    setVisitorName("");
    setPrivacyPromptOpen(false);
    setFeedback("اختر مشهدًا، ثم التقط صورة أو اخترها من جهازك.");
  };
  const leaveStudio = () => {
    cancelDownloadCleanup();
    stopCamera();
    clearImageMemory();
    setVisitorName("");
    setPrivacyPromptOpen(false);
    onBack();
  };

  return <section className="studio-page min-h-screen p-3 sm:p-6">
    <div className="mx-auto max-w-6xl">
      <header className="studio-header"><button onClick={leaveStudio}><HomeIcon size={19}/> القرية</button><div><p>المحطة السادسة</p><h1>استوديو قطر لوّل</h1></div><span>🔒 الصورة خاصة</span></header>
      <div className="studio-shell">
        <div className="studio-title"><p>اصنع ذكراك التراثية</p><h2>صورتك بجانب مشهد من قطر لوّل</h2><span>اختر المشهد، ثم استخدم الكاميرا أو اختر صورة من جهازك.</span></div>

        <div className="studio-scenes" role="group" aria-label="اختر المشهد التراثي">{studioScenes.map(scene => <button key={scene.id} onClick={() => changeScene(scene.id)} aria-pressed={scene.id === sceneId} className={scene.id === sceneId ? "selected" : ""}><span className="studio-scene-image" style={{ backgroundImage: `url(${scene.image})` }} aria-hidden="true"/><b>{scene.emoji} {scene.name}</b><em>{scene.id === sceneId ? "مختار ✓" : "اختر"}</em></button>)}</div>

        <div className="studio-workspace">
          <div className="studio-source-card">
            <div className="studio-step-heading"><span>1</span><div><b>صورة الزائر</b><small>التقط صورة أو اخترها من جهازك</small></div></div>
            <label className="studio-name-label" htmlFor="studio-visitor-name">اسم الزائر <small>(اختياري)</small></label>
            <input id="studio-visitor-name" className="studio-name-input" value={visitorName} maxLength={30} onChange={event => changeVisitorName(event.target.value)} placeholder="اكتب الاسم على البطاقة"/>
            <div className="studio-photo-source">{cameraOpen ? <video ref={videoRef} muted playsInline aria-label="معاينة الكاميرا"/> : photoUrl ? <img src={photoUrl} alt="صورة الزائر المختارة"/> : <div><Camera size={54}/><b>الصورة تظهر هنا</b><small>لن تُرفع إلى الموقع</small></div>}</div>
            <div className="studio-photo-actions">{!cameraOpen && !photoUrl && <button onClick={openCameraPrivacyNotice}><Camera size={20}/> فتح الكاميرا</button>}{cameraOpen && <button onClick={capturePhoto} className="primary"><Camera size={20}/> التقط الصورة</button>}{photoUrl && !cameraOpen && <button onClick={retakePhoto}><RotateCcw size={20}/> إعادة التصوير</button>}<label><Upload size={20}/> اختيار صورة من الجهاز<input type="file" accept="image/*" onChange={chooseLocalPhoto}/></label></div>
            <p className="studio-privacy">🔒 تتم معالجة الصورة داخل متصفحك فقط؛ لا تُرفع إلى الموقع أو الإنترنت، وتُحذف من الجلسة بعد الحفظ أو المغادرة.</p>
          </div>

          <div className="studio-result-card">
            <div className="studio-step-heading"><span>2</span><div><b>ذكرى قطر لوّل</b><small>{selectedScene.name}</small></div></div>
            {resultUrl ? <div className="studio-result"><img src={resultUrl} alt={`ذكرى من قطر لوّل في ${selectedScene.name}`}/><a href={resultUrl} download="qatar-lol-keepsake.png" onClick={saveImageLocally}><Download size={21}/> حفظ الصورة</a></div> : <div className="studio-live-preview"><span className="studio-live-scene" style={{ backgroundImage: `url(${selectedScene.image})` }} aria-hidden="true"/><span className="studio-live-person">{photoUrl ? <img src={photoUrl} alt="معاينة صورة الزائر"/> : <span><Camera size={44}/><small>أضف صورتك</small></span>}</span><strong>ذكرى من قطر لوّل</strong></div>}
            {!resultUrl && <button className="studio-create-button" onClick={makeKeepsake} disabled={!photoUrl}><Camera size={21}/> أنشئ الذكرى</button>}
            {resultUrl && <button className="studio-reset-button" onClick={resetStudio}><RotateCcw size={19}/> صورة جديدة</button>}
          </div>
        </div>
        <p className="studio-feedback" role="status" aria-live="polite">{feedback}</p>
      </div>
      <Guide message={resultUrl ? "علومك طيبة! اكتملت ذكراك من قطر لوّل، وحصلت على ختم الاستوديو. اضغط حفظ الصورة عشان تنزّلها على جهازك." : photoUrl ? "صورتك جاهزة ويا المشهد. اضغط أنشئ الذكرى عشان نجهّز البطاقة." : "اختار مشهد تراثي، وبعدين افتح الكاميرا أو اختار صورة من جهازك. صورتك بتظل خاصة داخل جهازك."}/>
    </div>
    {privacyPromptOpen && <div className="studio-privacy-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setPrivacyPromptOpen(false); }}>
      <div className="studio-privacy-dialog" role="dialog" aria-modal="true" aria-labelledby="studio-privacy-title" aria-describedby="studio-privacy-description">
        <div className="studio-privacy-lock" aria-hidden="true">🔒</div>
        <h2 id="studio-privacy-title">خصوصيتك تهمنا 🔒</h2>
        <div id="studio-privacy-description">
          <p>تُستخدم الكاميرا لإنشاء صورتك داخل تجربة قطر لوّل فقط.</p>
          <p>لا يتم حفظ صورتك في الموقع أو رفعها إلى الإنترنت.</p>
          <p>بعد تنزيل الصورة أو مغادرة الصفحة يتم حذفها من الجلسة.</p>
        </div>
        <div className="studio-privacy-dialog-actions">
          <button ref={privacyConfirmRef} className="primary" onClick={startCamera}>السماح وفتح الكاميرا</button>
          <button onClick={() => { setPrivacyPromptOpen(false); setFeedback("لم تُفتح الكاميرا. يمكنك المتابعة من دون صورة أو اختيار صورة من جهازك."); }}>إلغاء</button>
        </div>
      </div>
    </div>}
  </section>;
}

const majlisRiddles = [
  {
    emoji: "🫖",
    clue: "لي فمٌ طويل ولا أتكلم، ويُسكب مني شراب الضيافة. من أنا؟",
    voiceClue: "لي فم طويل، وما أتكلم. ومنّي نصب قهوة الضيف. من أنا؟",
    answer: "الدلّة",
    options: ["الدلّة", "المبخرة", "الفانوس"],
    fact: "الدلّة من رموز الكرم، وتُقدَّم بها القهوة العربية للضيف.",
    voiceFact: "الدلّة من رموز الكرم، ومنها نقدّم القهوة العربية للضيف.",
  },
  {
    emoji: "✨",
    clue: "يوضع فيَّ الجمر والعود، وينتشر مني الطيب في المكان. من أنا؟",
    voiceClue: "ينحط فيني الجمر والعود، ومنّي تنتشر الريحة الطيبة. من أنا؟",
    answer: "المبخرة",
    options: ["السدو", "المبخرة", "المحمل"],
    fact: "تُستخدم المبخرة لتعطير المجلس والبيت بالعود والبخور.",
    voiceFact: "المبخرة نطيّب فيها المجلس والبيت بالعود والبخور.",
  },
  {
    emoji: "🏠",
    clue: "مكانٌ يستقبل الضيوف، وتجتمع فيه العائلة وتُروى الحكايات. ما هو؟",
    voiceClue: "مكان نستقبل فيه الضيوف، ونجتمع فيه، ونسمع السوالف. شنو هو؟",
    answer: "المجلس",
    options: ["السوق", "البحر", "المجلس"],
    fact: "المجلس فضاء اجتماعي تنتقل فيه الحكايات والمعارف وآداب الضيافة بين الأجيال.",
    voiceFact: "المجلس مكان يجمع الناس، وتنتقل فيه السوالف والمعارف وآداب الضيافة من جيل لجيل.",
  },
];

type MajlisScenePhase = "approach" | "offer" | "cup" | "incense";

function MajlisGame({ onBack, onComplete }: { onBack: () => void; onComplete: (reward: StationReward) => void }) {
  const [state, setState] = useState<"ready" | "playing" | "fact" | "ended">("ready");
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [showRoom, setShowRoom] = useState(false);
  const [scenePhase, setScenePhase] = useState<MajlisScenePhase>("approach");
  const sceneTimers = useRef<number[]>([]);
  const sceneRun = useRef(0);
  const riddle = majlisRiddles[current];

  const clearSceneSequence = () => {
    sceneRun.current += 1;
    sceneTimers.current.forEach(timer => window.clearTimeout(timer));
    sceneTimers.current = [];
    cancelSpeech();
  };
  const scheduleScene = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay);
    sceneTimers.current.push(timer);
  };
  const playMajlisScene = (withVoice = soundOn) => {
    clearSceneSequence();
    const run = sceneRun.current;
    setScenePhase("approach");

    if (!withVoice || !("speechSynthesis" in window)) {
      scheduleScene(() => run === sceneRun.current && setScenePhase("offer"), 3000);
      scheduleScene(() => run === sceneRun.current && setScenePhase("cup"), 3800);
      scheduleScene(() => run === sceneRun.current && setScenePhase("incense"), 6600);
      return;
    }

    const playIncenseVoice = () => {
      if (run !== sceneRun.current) return;
      speak("وهذي المبخرة. يمرّرها المضيف، وتفوح في المجلس ريحة العود الطيبة.", {
        rate: .85,
        onStart: () => run === sceneRun.current && setScenePhase("incense"),
        onError: () => run === sceneRun.current && setScenePhase("incense"),
      });
    };
    const playCupVoice = () => {
      if (run !== sceneRun.current) return;
      speak("شوفوا الفنجان. الحين الضيف ياخذه من يد المضيف.", {
        rate: .85,
        onStart: () => run === sceneRun.current && setScenePhase("cup"),
        onEnd: () => {
          if (run !== sceneRun.current) return;
          scheduleScene(playIncenseVoice, 1100);
        },
        onError: () => {
          if (run !== sceneRun.current) return;
          setScenePhase("cup");
          scheduleScene(() => run === sceneRun.current && setScenePhase("incense"), 2900);
        },
      });
    };
    speak("حيّاكم الله في مجلس لوّل. شوفوا المضيف. الحين بيصب القهوة العربية من الدلّة، ويقدّمها للضيف.", {
      rate: .85,
      onEnd: () => {
        if (run !== sceneRun.current) return;
        setScenePhase("offer");
        scheduleScene(playCupVoice, 650);
      },
      onError: () => {
        if (run !== sceneRun.current) return;
        scheduleScene(() => setScenePhase("offer"), 700);
        scheduleScene(() => setScenePhase("cup"), 1400);
        scheduleScene(() => setScenePhase("incense"), 4300);
      },
    });
  };

  const leave = () => {
    clearSceneSequence();
    onBack();
  };
  const start = () => {
    setCurrent(0);
    setScore(0);
    setFeedback("");
    setState("playing");
    if (soundOn) {
      tone(392, .13, "triangle");
      speak("المجلس كان مكان نستقبل فيه الضيوف، ونتبادل فيه السوالف والمعارف. والحين، اسمعوا اللغز الأول. " + majlisRiddles[0].voiceClue);
    }
  };
  const choose = (choice: string) => {
    if (choice === riddle.answer) {
      setScore(value => value + 1);
      setFeedback("إجابة صحيحة!");
      setState("fact");
      if (soundOn) {
        tone(620, .14, "triangle");
        window.setTimeout(() => tone(820, .2), 120);
        speak(winVoice(riddle.voiceFact));
      }
      return;
    }
    setFeedback("قريبة! جرّب إجابة أخرى.");
    if (soundOn) {
      tone(190, .18, "sawtooth");
      speak(retryVoice());
    }
  };
  const next = () => {
    setFeedback("");
    if (current === majlisRiddles.length - 1) {
      setState("ended");
      onComplete({ score: 120 });
      if (soundOn) {
        tone(660, .16, "triangle");
        window.setTimeout(() => tone(880, .28, "triangle"), 150);
        speak(winVoice("جاوبت عن الألغاز الثلاثة، وحصلت على ختم مجلس لوّل."));
      }
      return;
    }
    const nextIndex = current + 1;
    setCurrent(nextIndex);
    setState("playing");
    if (soundOn) speak(`الحين اللغز ${nextIndex + 1}. ${majlisRiddles[nextIndex].voiceClue}`);
  };
  const toggleRoom = () => {
    if (showRoom) {
      clearSceneSequence();
      setScenePhase("approach");
      setShowRoom(false);
      return;
    }
    setShowRoom(true);
    if (soundOn) {
      tone(440, .13, "triangle");
      window.setTimeout(() => tone(590, .18, "triangle"), 130);
    }
    playMajlisScene(soundOn);
  };

  useEffect(() => () => {
    sceneRun.current += 1;
    sceneTimers.current.forEach(timer => window.clearTimeout(timer));
    window.speechSynthesis?.cancel();
  }, []);

  return <section className="majlis-page min-h-screen p-3 sm:p-6">
    <div className="mx-auto max-w-6xl">
      <header className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-[#35181a]/90 px-4 py-3 text-white backdrop-blur-md">
        <button onClick={leave} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 hover:bg-white/20"><HomeIcon size={19}/> القرية</button>
        <div className="text-center"><p className="text-xs text-[#ffe3a0]">المحطة الرابعة</p><h1 className="text-xl font-black sm:text-2xl">مجلس لوّل</h1></div>
        <span className="rounded-xl bg-[#7b1734] px-3 py-2 font-black">🧩 {score}/3</span>
      </header>

      <button onClick={() => { const nextSound = !soundOn; setSoundOn(nextSound); if (showRoom) playMajlisScene(nextSound); else window.speechSynthesis?.cancel(); }} className="mb-3 mr-auto flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">{soundOn ? <Volume2 size={18}/> : <VolumeX size={18}/>} {soundOn ? "الصوت مفعّل" : "الصوت متوقف"}</button>

      <div className="majlis-board relative mx-auto aspect-[16/9] min-h-[470px] w-full overflow-hidden rounded-3xl border-2 border-[#edc875]/75 shadow-2xl">
        <div className="majlis-ambience" aria-hidden="true"/>
        <button
          onClick={toggleRoom}
          className="majlis-view-button"
          aria-pressed={showRoom}
        ><Eye size={19}/> {showRoom ? "العودة إلى النشاط" : "عرض المجلس"}</button>

        {showRoom && <div className={`majlis-live-scene scene-${scenePhase}`} aria-label="مشهد ضيافة قطرية متحرك داخل المجلس">
          <div className="majlis-object-badges" aria-label="العناصر التراثية المستخدمة في المشهد">
            <span>🏠 المجلس</span><span>🫖 الدلّة والفنجان</span><span>✨ المبخرة</span>
          </div>
          <div className="majlis-guests-stage">
            <img src="/assets/majlis-guests-waiting.png" alt="ضيفان قطريان في المجلس، وأحدهما يمد يده لاستلام القهوة" className="majlis-guests-image" draggable={false}/>
          </div>
          <div className="majlis-host-stage">
            <img src="/assets/majlis-host.png" alt="مضيف قطري يرتدي سديريًا عنابيًا ويقترب بالدلّة والفنجان" className="majlis-host-image majlis-host-before" draggable={false}/>
            <img src="/assets/majlis-host-after.png" alt="المضيف بعد أن سلّم الفنجان إلى الضيف" className="majlis-host-image majlis-host-after" draggable={false}/>
          </div>
          <span className="majlis-moving-finjan" aria-hidden="true"><i/></span>
          <div className="majlis-incense-wrap" aria-label="مبخرة العود">
            <i className="smoke-one"/><i className="smoke-two"/><i className="smoke-three"/>
            <img src="/assets/majlis-incense-ready.png" alt="مبخرة تراثية يخرج منها دخان العود عند ذكرها" draggable={false}/>
          </div>
          <button onClick={() => { if (!soundOn) setSoundOn(true); playMajlisScene(true); }} className="majlis-live-audio"><Volume2 size={18}/> أعد المشهد</button>
          <p className="sr-only" aria-live="polite">{scenePhase === "approach" ? "يقترب المضيف من الضيوف بالدلّة والفنجان." : scenePhase === "offer" ? "يمد المضيف الفنجان نحو الضيف." : scenePhase === "cup" ? "أخذ الضيف الفنجان من يد المضيف." : "بدأ دخان العود يتصاعد من المبخرة."}</p>
        </div>}

        {!showRoom && state === "ready" && <div className="majlis-overlay absolute inset-0 flex items-center p-5 text-center">
          <div className="majlis-panel majlis-side-panel max-w-xl rounded-3xl p-6 text-white backdrop-blur-md">
            <div className="text-6xl">☕</div>
            <h2 className="mt-2 text-4xl font-black text-[#ffe39a]">حكاية وثلاثة ألغاز</h2>
            <p className="mt-4 text-lg leading-8">كان المجلس مكانًا لاستقبال الضيوف وتبادل الحكايات والمعارف. استمع جيدًا ثم اختر الإجابة الصحيحة.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button onClick={start} className="rounded-2xl bg-[#7b1734] px-8 py-4 text-xl font-black shadow-xl hover:bg-[#922342]"><Play className="ml-2 inline"/> ابدأ الحكاية</button>
              <button onClick={() => soundOn && speak("المجلس كان مكان نستقبل فيه الضيوف، ونتبادل فيه السوالف والمعارف، ونتعلّم آداب الضيافة.")} className="rounded-2xl bg-white/10 px-6 py-4 font-black"><Volume2 className="ml-2 inline" size={20}/> استمع</button>
            </div>
          </div>
        </div>}

        {!showRoom && state === "playing" && <div className="majlis-riddle-wrap absolute inset-0 flex items-center p-4 sm:p-8">
          <div className="majlis-riddle-card majlis-side-panel w-full max-w-2xl rounded-3xl p-5 text-center text-white sm:p-7">
            <div className="majlis-progress" aria-label={`اللغز ${current + 1} من 3`}>{majlisRiddles.map((_, index) => <i key={index} className={index <= current ? "done" : ""}/>)}</div>
            <p className="mt-3 text-sm font-bold text-[#f4cf7a]">اللغز {current + 1} من 3</p>
            <div className="mt-2 text-5xl" aria-hidden="true">{riddle.emoji}</div>
            <h2 className="mx-auto mt-3 max-w-xl text-2xl font-black leading-10 sm:text-3xl">{riddle.clue}</h2>
            <button onClick={() => soundOn && speak(riddle.voiceClue)} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-[#ffe39a]"><Volume2 size={17}/> استمع إلى اللغز</button>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">{riddle.options.map(option => <button key={option} onClick={() => choose(option)} className="majlis-answer">{option}</button>)}</div>
            <p className="mt-4 min-h-7 font-bold text-[#ffe39a]" role="status" aria-live="polite">{feedback}</p>
          </div>
        </div>}

        {!showRoom && state === "fact" && <div className="majlis-overlay absolute inset-0 flex items-center p-5 text-center">
          <div className="majlis-panel majlis-side-panel max-w-lg rounded-3xl p-7 text-white backdrop-blur-md">
            <div className="text-6xl">✅</div>
            <h2 className="mt-2 text-3xl font-black text-[#ffe39a]">أحسنت… {riddle.answer}</h2>
            <p className="mt-4 rounded-2xl bg-white/10 p-4 text-lg leading-8">{riddle.fact}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3"><button onClick={next} className="rounded-2xl bg-[#7b1734] px-7 py-3 text-lg font-black">{current === 2 ? "شاهد الختم" : "اللغز التالي"}</button><button onClick={() => soundOn && speak(riddle.voiceFact)} className="rounded-2xl bg-white/10 px-5 py-3 font-black"><Volume2 className="ml-2 inline" size={19}/> استمع إلى المعلومة</button></div>
          </div>
        </div>}

        {!showRoom && state === "ended" && <div className="majlis-overlay absolute inset-0 flex items-center p-5 text-center">
          <div className="majlis-panel majlis-side-panel max-w-lg rounded-3xl p-7 text-white backdrop-blur-md">
            <div className="majlis-stamp mx-auto">🏅</div>
            <h2 className="mt-2 text-4xl font-black text-[#ffe17d]">ختم مجلس لوّل</h2>
            <p className="mt-3 text-xl">أجبت عن <strong className="text-[#ffe17d]">3 من 3</strong> ألغاز تراثية</p>
            <p className="mt-4 leading-7 text-white/85">المجلس جزء من التراث الثقافي غير المادي المسجّل لدى اليونسكو بمشاركة قطر.</p>
            <a href="https://ich.unesco.org/en/RL/majlis-a-cultural-and-social-space-01076" target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-bold text-[#ffe39a] underline underline-offset-4">مصدر المعرفة: اليونسكو</a>
            <div className="mt-5 flex flex-wrap justify-center gap-3"><button onClick={start} className="rounded-2xl bg-[#7b1734] px-6 py-3 font-black"><RotateCcw className="ml-2 inline" size={19}/> أعد الألغاز</button><button onClick={leave} className="rounded-2xl bg-white/10 px-6 py-3 font-black"><HomeIcon className="ml-2 inline" size={19}/> القرية</button></div>
          </div>
        </div>}
      </div>

      <Guide
        message={showRoom ? "حيّاكم الله في مجلس لوّل. شوفوا شلون نقدّم القهوة العربية، وراقبوا المبخرة يوم نذكرها." : state === "ready" ? "وهني وصلنا الفريج. البيوت متقاربة، والكل يعرف الثاني، والعيال يلعبون برّا، والرجال يجتمعون في المجلس. تعالوا ندخل، ونسمع سالفة من سوالف أهل قطر أول." : state === "playing" ? `أنت في اللغز ${current + 1} من ثلاث. اسمع السؤال، واختار الإجابة.` : state === "fact" ? "صح عليك! اسمع المعلومة، وبعدين روح للغز اللي بعده." : "كفو عليك! جاوبت عن الألغاز الثلاثة، وحصلت على ختم مجلس لوّل."}
      />
    </div>
  </section>;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("gate");
  const [notice, setNotice] = useState("");
  const [progress, setProgress] = useState<JourneyProgress>(initialProgress);
  const [simpleMode, setSimpleMode] = useState(false);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const storedProgress = window.localStorage.getItem("qatar-lol-progress");
        const storedSimpleMode = window.localStorage.getItem("qatar-lol-simple-mode");
        if (storedProgress) {
          const parsed = JSON.parse(storedProgress) as Partial<JourneyProgress>;
          const validIds = new Set(stations.map(station => station.id));
          setProgress({
            completed: Array.isArray(parsed.completed) ? parsed.completed.filter((id): id is StationId => validIds.has(id as StationId)) : [],
            shells: Number.isFinite(parsed.shells) ? Math.max(0, Number(parsed.shells)) : 0,
            pearls: Number.isFinite(parsed.pearls) ? Math.max(0, Number(parsed.pearls)) : 0,
            score: Number.isFinite(parsed.score) ? Math.max(0, Number(parsed.score)) : 0,
          });
        }
        setSimpleMode(storedSimpleMode === "true");
      } catch {
        setProgress(initialProgress);
      } finally {
        setStorageReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem("qatar-lol-progress", JSON.stringify(progress));
    window.localStorage.setItem("qatar-lol-simple-mode", String(simpleMode));
  }, [progress, simpleMode, storageReady]);

  const completeStation = useCallback((station: StationId, reward: StationReward) => {
    setProgress(current => {
      if (current.completed.includes(station)) return current;
      return {
        completed: [...current.completed, station],
        shells: current.shells + (reward.shells ?? 0),
        pearls: current.pearls + (reward.pearls ?? 0),
        score: current.score + Math.max(0, reward.score),
      };
    });
  }, []);
  const completeSouq = useCallback((reward: StationReward) => completeStation("souq", reward), [completeStation]);
  const completeSea = useCallback((reward: StationReward) => completeStation("sea", reward), [completeStation]);
  const completeDhow = useCallback((reward: StationReward) => completeStation("dhow", reward), [completeStation]);
  const completeMajlis = useCallback((reward: StationReward) => completeStation("majlis", reward), [completeStation]);
  const completeGames = useCallback((reward: StationReward) => completeStation("games", reward), [completeStation]);
  const completeStudio = useCallback((reward: StationReward) => completeStation("studio", reward), [completeStation]);
  const goVillage = useCallback(() => setScreen("village"), []);

  const journeyGuideMessage = progress.completed.length === stations.length ? finalJourneyGuideMessage : villageGuideMessage;
  const screenGuideMessage = screen === "village" ? journeyGuideMessage : screen === "souq" ? "يا مرحبا في سوق قطر لوّل. قرّبوا، واختاروا الشي اللي ودّكم تعرفون حكايته." : screen === "sea" ? "الحين بنروح للبحر. شدّ حيلك يا غواص، واجمع المحار، ويمكن تحصل لك دانة!" : screen === "dhow" ? "يا مرحبا في رحلة النوخذة. حرّك المحمل، واجمع علامات المسار، وانتبه من الصخور." : screen === "games" ? "حيّاكم في فريج الألعاب! اختاروا اللعبة اللي ودّكم تبدأون فيها، وكمّلوا الألعاب عشان تحصلون الختم الكامل." : screen === "studio" ? "هني استوديو قطر لوّل. اختاروا مشهد، والتقطوا صورة، وبعدين نزّلوا ذكراكم التراثية." : "وهني وصلنا المجلس. شوفوا الضيافة، وبعدين حلّوا الألغاز الثلاثة.";
  const toggleSimpleMode = () => {
    const next = !simpleMode;
    setSimpleMode(next);
    speak(next ? "زين، شغّلنا الوضع المبسّط. الأزرار صارت أكبر، والكلام أقصر، والحركة أهدأ." : "تم، سكّرنا الوضع المبسّط.");
  };

  let content: React.ReactNode;
  if (screen === "gate") {
    content = <section className="hero flex min-h-screen items-center justify-center px-5 py-12 text-center"><div className="relative z-10 max-w-3xl"><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d8b76a]/40 bg-[#2a1118]/70 px-5 py-2 text-sm text-[#f5d994] backdrop-blur-md"><span className="h-2 w-2 animate-pulse rounded-full bg-[#f2c35d]"/> تجربة تراثية تفاعلية</div><p className="mb-3 text-lg font-bold tracking-[.25em] text-[#e7c57a]">مركز الشفلح يقدّم</p><h1 className="title-shadow text-6xl font-black sm:text-8xl">بوابة قطر لوّل</h1><p className="mx-auto mt-5 max-w-xl text-xl leading-9 text-[#f8e9c8] sm:text-2xl">عُد بالزمن مئة عام… وعِش حكاية أهل قطر.</p><div className="gate-actions mt-9"><button onClick={() => setScreen("village")} className="gate-button rounded-2xl px-10 py-5 text-xl font-black transition hover:-translate-y-1">افتح بوابة الزمن ←</button><button onClick={toggleSimpleMode} className="gate-simple-mode" aria-pressed={simpleMode}><Accessibility size={22}/> {simpleMode ? "الوضع المبسّط مفعّل" : "الوضع المبسّط"}</button></div></div></section>;
  } else if (screen === "sea") {
    content = <PearlGame onBack={goVillage} onComplete={completeSea}/>;
  } else if (screen === "souq") {
    content = <SouqGame onBack={goVillage} onComplete={completeSouq}/>;
  } else if (screen === "dhow") {
    content = <NokhathaGame onBack={goVillage} onComplete={completeDhow}/>;
  } else if (screen === "games") {
    content = <FareejGame onBack={goVillage} onComplete={completeGames}/>;
  } else if (screen === "majlis") {
    content = <MajlisGame onBack={goVillage} onComplete={completeMajlis}/>;
  } else if (screen === "studio") {
    content = <PhotoStudio onBack={goVillage} onComplete={completeStudio}/>;
  } else {
    content = <section className="village min-h-screen px-4 py-6 sm:px-8">
      <header className="village-intro mx-auto max-w-6xl">
        <div><p>القرية الرئيسية</p><h1>بوابة قطر لوّل</h1><span className="optional-detail">اختر محطتك، واجمع الأختام، واكتشف حكايات أهل قطر.</span></div>
        <button onClick={() => speak(journeyGuideMessage)}><Volume2 size={21}/> استمع إلى ترحيب أبي راشد</button>
      </header>
      <div className="mx-auto max-w-6xl py-7 text-center sm:py-9">
        <p className="text-[#e6c678]">اختر محطتك التالية</p><h2 className="mt-1 text-3xl font-black sm:text-5xl">من أين تريد أن تبدأ رحلتك؟</h2>
        <div className="village-stations-grid mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{stations.map(station => {
          const Icon = station.icon;
          const done = progress.completed.includes(station.id);
          return <button key={station.id} onClick={() => station.route ? setScreen(station.route) : setNotice(station.title)} aria-label={`${station.title}: ${station.route ? done ? "مكتملة، افتحها مرة أخرى" : "ابدأ المحطة" : "قريبًا"}`} className={`station group relative min-h-48 overflow-hidden rounded-3xl border p-6 text-right transition hover:-translate-y-1 ${station.route ? "available" : "coming-soon"}${done ? " completed" : ""}`}>
            <span className="station-backdrop" style={{ backgroundImage: `url(${station.image})` }} aria-hidden="true"/><span className="station-shade" aria-hidden="true"/>
            <span className="station-status">{done ? "اكتمل ✓" : station.route ? "ابدأ الرحلة" : "قريبًا"}</span>
            <span className="station-content"><Icon size={37}/><h3>{station.title}</h3><p className="optional-detail">{station.desc}</p></span>
          </button>;
        })}</div>
      </div>
      {notice && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5" onClick={() => setNotice("")}><div className="rounded-3xl border border-[#e1bd65]/50 bg-[#2a1218] p-7 text-center" onClick={event => event.stopPropagation()}><h3 className="text-3xl font-black text-[#f1cf76]">{notice}</h3><p className="mt-4">سنفعّل هذه المحطة في المرحلة القادمة.</p><button onClick={() => setNotice("")} className="mt-5 rounded-xl bg-[#7b1734] px-6 py-3 font-black">حسنًا</button></div></div>}
      <Guide message={journeyGuideMessage}/>
    </section>;
  }

  return <main dir="rtl" className={`min-h-screen bg-[#150b0d] text-[#fff7df]${simpleMode ? " simple-mode" : ""}`}>
    {screen !== "gate" && <JourneyBar progress={progress} current={screen === "village" ? null : screen} simpleMode={simpleMode} onToggleSimple={toggleSimpleMode} onListen={() => speak(screenGuideMessage)}/>}
    {content}
  </main>;
}
