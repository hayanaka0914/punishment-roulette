"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MainOption = {
  id: number;
  text: string;
  isBoss: boolean;
};

type BigOption = {
  id: number;
  text: string;
};

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const MAIN_STORAGE_KEY = "punishment_main_options_v4";
const BIG_STORAGE_KEY = "punishment_big_options_v4";
const SOUND_STORAGE_KEY = "punishment_sound_enabled_v2";

const defaultMainOptions: MainOption[] = [
  { id: 1, text: "腕立て10回", isBoss: false },
  { id: 2, text: "変顔で写真", isBoss: false },
  { id: 3, text: "モノマネ30秒", isBoss: false },
  { id: 4, text: "大罰ゲームへ", isBoss: true },
];

const defaultBigOptions: BigOption[] = [
  { id: 1, text: "激辛チャレンジ" },
  { id: 2, text: "黒歴史を1つ話す" },
  { id: 3, text: "次の1曲を本気で歌う" },
  { id: 4, text: "全員にジュースをおごる" },
  { id: 5, text: "恥ずかしい一言を叫ぶ" },
  { id: 6, text: "3分間敬語縛り" },
];

const wheelColors = [
  "#f3f4f6",
  "#e5e7eb",
  "#d1d5db",
  "#9ca3af",
  "#f3f4f6",
  "#e5e7eb",
  "#d1d5db",
  "#9ca3af",
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function createSlicePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function getWinnerIndex(rotation: number, count: number) {
  const normalized = ((rotation % 360) + 360) % 360;
  const step = 360 / count;
  const pointerWorldAngle = (360 - normalized) % 360;
  return Math.floor(pointerWorldAngle / step) % count;
}

function buildSpinRotation(currentRotation: number) {
  const extraRotation = 360 * 7 + Math.random() * 360;
  return currentRotation + extraRotation;
}

function splitLabel(label: string) {
  if (label.length <= 8) return [label];

  const separators = [" ", "・", "、", "/", "→"];
  for (const separator of separators) {
    if (label.includes(separator)) {
      return label.split(separator).filter(Boolean).slice(0, 3);
    }
  }

  if (label.length <= 12) {
    return [label.slice(0, Math.ceil(label.length / 2)), label.slice(Math.ceil(label.length / 2))];
  }

  const first = label.slice(0, 6);
  const second = label.slice(6, 12);
  const third = label.slice(12);
  return [first, second, third].filter(Boolean);
}

function RouletteWheel({
  options,
  rotation,
  spinning,
  large = false,
}: {
  options: string[];
  rotation: number;
  spinning: boolean;
  large?: boolean;
}) {
  const size = 420;
  const center = size / 2;
  const radius = 188;
  const count = Math.max(options.length, 1);
  const step = 360 / count;

  const slices = useMemo(() => {
    return options.map((label, index) => {
      const startAngle = index * step;
      const endAngle = (index + 1) * step;
      const middleAngle = startAngle + step / 2;
      const textRadius = radius * 0.66;
      const textPoint = polarToCartesian(center, center, textRadius, middleAngle);
      const lines = splitLabel(label || "未入力");

      return {
        label,
        index,
        path: createSlicePath(center, center, radius, startAngle, endAngle),
        fill: wheelColors[index % wheelColors.length],
        textX: textPoint.x,
        textY: textPoint.y,
        rotate: middleAngle,
        lines,
      };
    });
  }, [options, step]);

  return (
    <div className="flex flex-col items-center">
      <div className={`relative w-full ${large ? "max-w-[92vw] sm:max-w-[760px]" : "max-w-[380px] sm:max-w-[430px]"}`}>
        <div className="absolute left-1/2 top-[-8px] z-30 h-0 w-0 -translate-x-1/2 rotate-180 border-l-[20px] border-r-[20px] border-b-[32px] border-l-transparent border-r-transparent border-b-black" />

        <div
          className="relative aspect-square w-full rounded-full border-[8px] border-white bg-white shadow-xl sm:border-[10px]"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 4.6s cubic-bezier(0.14, 0.88, 0.18, 1)" : "none",
          }}
        >
          <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full rounded-full">
            <circle cx={center} cy={center} r={radius} fill="#f9fafb" />

            {slices.map((slice) => (
              <g key={`${slice.label}-${slice.index}`}>
                <path d={slice.path} fill={slice.fill} stroke="#ffffff" strokeWidth="3" />
                <g transform={`translate(${slice.textX} ${slice.textY}) rotate(${slice.rotate})`}>
                  {slice.lines.map((line, i) => (
                    <text
                      key={`${slice.index}-${i}`}
                      x="0"
                      y={(i - (slice.lines.length - 1) / 2) * 16}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={large ? "15" : "14"}
                      fontWeight="700"
                      fill="#111827"
                    >
                      {line}
                    </text>
                  ))}
                </g>
              </g>
            ))}

            <circle cx={center} cy={center} r="22" fill="#ffffff" stroke="#d1d5db" strokeWidth="3" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [screen, setScreen] = useState<"main" | "big">("main");
  const [mainOptions, setMainOptions] = useState<MainOption[]>(defaultMainOptions);
  const [bigOptions, setBigOptions] = useState<BigOption[]>(defaultBigOptions);
  const [mainRotation, setMainRotation] = useState(0);
  const [bigRotation, setBigRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState("");
  const [mounted, setMounted] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [installMessage, setInstallMessage] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [resultFlash, setResultFlash] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const tickIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);

    try {
      const savedMain = localStorage.getItem(MAIN_STORAGE_KEY);
      const savedBig = localStorage.getItem(BIG_STORAGE_KEY);
      const savedSound = localStorage.getItem(SOUND_STORAGE_KEY);

      if (savedMain) {
        const parsed = JSON.parse(savedMain) as MainOption[];
        if (Array.isArray(parsed) && parsed.length > 0) setMainOptions(parsed);
      }

      if (savedBig) {
        const parsed = JSON.parse(savedBig) as BigOption[];
        if (Array.isArray(parsed) && parsed.length > 0) setBigOptions(parsed);
      }

      if (savedSound !== null) {
        setSoundEnabled(savedSound === "true");
      }
    } catch (error) {
      console.error("localStorage load error:", error);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(MAIN_STORAGE_KEY, JSON.stringify(mainOptions));
  }, [mainOptions, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(BIG_STORAGE_KEY, JSON.stringify(bigOptions));
  }, [bigOptions, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(SOUND_STORAGE_KEY, String(soundEnabled));
  }, [soundEnabled, mounted]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as DeferredInstallPrompt);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (tickIntervalRef.current) window.clearInterval(tickIntervalRef.current);
    };
  }, []);

  const getAudioContext = () => {
    if (typeof window === "undefined") return null;
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      audioContextRef.current = new AudioCtx();
    }
    return audioContextRef.current;
  };

  const playTone = (frequency: number, duration: number, type: OscillatorType, gainValue: number, delay = 0) => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const startAt = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
  };

  const playSpinStartSound = () => {
    playTone(220, 0.22, "sawtooth", 0.05, 0);
    playTone(310, 0.28, "triangle", 0.035, 0.05);
  };

  const playTickSound = () => {
    playTone(950, 0.045, "square", 0.018, 0);
  };

  const playResultSound = (boss = false) => {
    if (boss) {
      playTone(180, 0.18, "sawtooth", 0.06, 0);
      playTone(150, 0.25, "sawtooth", 0.06, 0.11);
      playTone(120, 0.35, "sawtooth", 0.06, 0.25);
      return;
    }

    playTone(523.25, 0.15, "triangle", 0.04, 0);
    playTone(659.25, 0.15, "triangle", 0.04, 0.12);
    playTone(783.99, 0.22, "triangle", 0.05, 0.24);
  };

  const startTickLoop = () => {
    if (!soundEnabled) return;
    stopTickLoop();
    playTickSound();
    tickIntervalRef.current = window.setInterval(() => {
      playTickSound();
    }, 130);
  };

  const stopTickLoop = () => {
    if (tickIntervalRef.current) {
      window.clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
  };

  const flashResult = () => {
    setResultFlash(true);
    window.setTimeout(() => setResultFlash(false), 850);
  };

  const mainBossCount = mainOptions.filter((option) => option.isBoss).length;
  const canSpinMain = mainOptions.length === 4 && mainBossCount === 1;
  const canSpinBig = bigOptions.length >= 2;

  const mainTexts = mainOptions.map((option) => option.text || (option.isBoss ? "大罰ゲームへ" : "未入力"));
  const bigTexts = bigOptions.map((option) => option.text || "未入力");

  const spinMain = () => {
    if (spinning || !canSpinMain) return;

    setSpinning(true);
    setResult("");
    playSpinStartSound();
    startTickLoop();

    const nextRotation = buildSpinRotation(mainRotation);
    setMainRotation(nextRotation);

    window.setTimeout(() => {
      stopTickLoop();
      const winnerIndex = getWinnerIndex(nextRotation, mainOptions.length);
      const winner = mainOptions[winnerIndex];
      setSpinning(false);
      flashResult();

      if (winner.isBoss) {
        playResultSound(true);
        setResult("大罰ゲームへ進みます");
        if (navigator.vibrate) navigator.vibrate([100, 60, 100]);
        window.setTimeout(() => {
          setResult("");
          setScreen("big");
        }, 1300);
      } else {
        playResultSound(false);
        setResult(`結果：${winner.text || "未入力"}`);
        if (navigator.vibrate) navigator.vibrate(80);
      }
    }, 4600);
  };

  const spinBig = () => {
    if (spinning || !canSpinBig) return;

    setSpinning(true);
    setResult("");
    playSpinStartSound();
    startTickLoop();

    const nextRotation = buildSpinRotation(bigRotation);
    setBigRotation(nextRotation);

    window.setTimeout(() => {
      stopTickLoop();
      const winnerIndex = getWinnerIndex(nextRotation, bigOptions.length);
      const winner = bigOptions[winnerIndex];
      setSpinning(false);
      flashResult();
      playResultSound(true);
      setResult(`結果：${winner.text || "未入力"}`);
      if (navigator.vibrate) navigator.vibrate([150, 70, 150]);
    }, 4600);
  };

  const handleInstallClick = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallMessage(
        choice.outcome === "accepted"
          ? "ホーム画面に追加しました"
          : "追加はキャンセルされました"
      );
      setInstallPrompt(null);
      return;
    }

    setInstallMessage(
      "iPhone / iPad は共有メニューから『ホーム画面に追加』、Android Chrome はブラウザメニューから追加してください。"
    );
  };

  const updateMainText = (id: number, text: string) => {
    setMainOptions((prev) => prev.map((option) => (option.id === id ? { ...option, text } : option)));
  };

  const updateBigText = (id: number, text: string) => {
    setBigOptions((prev) => prev.map((option) => (option.id === id ? { ...option, text } : option)));
  };

  const setBossOption = (id: number) => {
    setMainOptions((prev) => prev.map((option) => ({ ...option, isBoss: option.id === id })));
  };

  const addMainOption = () => {
    if (mainOptions.length >= 4) return;
    const nextId = mainOptions.length > 0 ? Math.max(...mainOptions.map((o) => o.id)) + 1 : 1;
    setMainOptions((prev) => [...prev, { id: nextId, text: `通常罰ゲーム${prev.length + 1}`, isBoss: false }]);
  };

  const addBigOption = () => {
    const nextId = bigOptions.length > 0 ? Math.max(...bigOptions.map((o) => o.id)) + 1 : 1;
    setBigOptions((prev) => [...prev, { id: nextId, text: `大罰ゲーム${prev.length + 1}` }]);
  };

  const deleteMainOption = (id: number) => {
    setMainOptions((prev) => {
      const target = prev.find((option) => option.id === id);
      const next = prev.filter((option) => option.id !== id);
      if (next.length === 0) return next;
      if (target?.isBoss && !next.some((option) => option.isBoss)) {
        next[0] = { ...next[0], isBoss: true };
      }
      return next;
    });
  };

  const deleteBigOption = (id: number) => {
    setBigOptions((prev) => prev.filter((option) => option.id !== id));
  };

  const resetAll = () => {
    setMainOptions(defaultMainOptions);
    setBigOptions(defaultBigOptions);
    setResult("");
    setScreen("main");
    setMainRotation(0);
    setBigRotation(0);
  };

  const currentTexts = screen === "main" ? mainTexts : bigTexts;
  const currentRotation = screen === "main" ? mainRotation : bigRotation;

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900">
      {showFullscreen && (
        <div className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center overflow-auto bg-white p-4">
          <div className="mb-4 flex w-full max-w-5xl items-center justify-between gap-3">
            <button
              onClick={() => setShowFullscreen(false)}
              className="min-h-[48px] rounded-2xl border border-gray-300 bg-white px-5 py-3 text-base font-semibold"
            >
              閉じる
            </button>
          </div>

          <div className="w-full max-w-5xl rounded-[32px] bg-white p-4 shadow-xl sm:p-8">
            <RouletteWheel options={currentTexts} rotation={currentRotation} spinning={spinning} large />

            <div className={`mx-auto mt-6 w-full max-w-3xl rounded-3xl px-5 py-5 text-center shadow transition ${resultFlash ? "scale-[1.02] bg-gray-900 text-white" : "bg-gray-100 text-gray-900"}`}>
              {result ? <p className="text-xl font-bold sm:text-3xl">{result}</p> : <p className="text-lg font-semibold text-gray-500 sm:text-2xl"> </p>}
            </div>

            <div className="mx-auto mt-5 flex w-full max-w-3xl flex-col gap-3 sm:flex-row">
              {screen === "main" ? (
                <button
                  onClick={spinMain}
                  disabled={!canSpinMain || spinning}
                  className="min-h-[58px] flex-1 rounded-2xl bg-black px-5 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {spinning ? "回転中..." : "回す"}
                </button>
              ) : (
                <>
                  <button
                    onClick={spinBig}
                    disabled={!canSpinBig || spinning}
                    className="min-h-[58px] flex-1 rounded-2xl bg-black px-5 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {spinning ? "回転中..." : "回す"}
                  </button>
                  <button
                    onClick={() => {
                      setScreen("main");
                      setResult("");
                    }}
                    className="min-h-[58px] rounded-2xl border border-gray-300 bg-white px-5 py-4 text-lg font-semibold"
                  >
                    戻る
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl p-4 pb-10 sm:p-6">
        <div className="mb-4 rounded-3xl bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              onClick={() => setShowFullscreen(true)}
              className="min-h-[48px] rounded-2xl bg-black px-5 py-3 text-base font-bold text-white"
            >
              全画面表示
            </button>
            <button
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="min-h-[48px] rounded-2xl border border-gray-300 bg-white px-5 py-3 text-base font-semibold"
            >
              {soundEnabled ? "音をOFF" : "音をON"}
            </button>
            <button
              onClick={handleInstallClick}
              className="min-h-[48px] rounded-2xl border border-gray-300 bg-white px-5 py-3 text-base font-semibold"
            >
              ホーム画面に追加
            </button>
            <button
              onClick={resetAll}
              className="min-h-[48px] rounded-2xl border border-gray-300 bg-white px-5 py-3 text-base font-semibold"
            >
              リセット
            </button>
          </div>

          {installMessage && (
            <p className="mt-3 rounded-2xl bg-gray-100 px-4 py-3 text-sm leading-6 text-gray-700">
              {installMessage}
            </p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl bg-white p-4 shadow-xl sm:p-6">
            <div className="flex flex-col items-center">
              <RouletteWheel options={currentTexts} rotation={currentRotation} spinning={spinning} />

              <div className={`mt-6 w-full max-w-xl rounded-2xl p-4 text-center transition ${resultFlash ? "bg-black text-white scale-[1.02]" : "bg-gray-100 text-gray-900"}`}>
                {result ? (
                  <p className="text-lg font-bold sm:text-2xl">{result}</p>
                ) : (
                  <p className="text-sm text-gray-500 sm:text-base"> </p>
                )}
              </div>

              <div className="mt-5 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
                {screen === "main" ? (
                  <button
                    onClick={spinMain}
                    disabled={!canSpinMain || spinning}
                    className="min-h-[54px] flex-1 rounded-2xl bg-black px-5 py-3 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {spinning ? "回転中..." : "回す"}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={spinBig}
                      disabled={!canSpinBig || spinning}
                      className="min-h-[54px] flex-1 rounded-2xl bg-black px-5 py-3 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                      {spinning ? "回転中..." : "回す"}
                    </button>
                    <button
                      onClick={() => {
                        setScreen("main");
                        setResult("");
                      }}
                      className="min-h-[54px] rounded-2xl border border-gray-300 bg-white px-5 py-3 text-base font-semibold"
                    >
                      戻る
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl bg-white p-4 shadow-xl sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">通常</h2>
                <button
                  onClick={addMainOption}
                  disabled={mainOptions.length >= 4}
                  className="min-h-[44px] rounded-xl bg-black px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  追加
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {mainOptions.map((option, index) => (
                  <div key={option.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-gray-700">選択肢 {index + 1}</span>
                      <button
                        onClick={() => deleteMainOption(option.id)}
                        className="min-h-[40px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold"
                      >
                        削除
                      </button>
                    </div>

                    <input
                      value={option.text}
                      onChange={(e) => updateMainText(option.id, e.target.value)}
                      placeholder="入力"
                      className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-500"
                    />

                    <div className="mt-3">
                      <label className="flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-3 py-2">
                        <input
                          type="radio"
                          name="boss-option"
                          checked={option.isBoss}
                          onChange={() => setBossOption(option.id)}
                        />
                        <span className="text-sm font-medium text-gray-800">大罰ゲーム行き</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-xl sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">大罰ゲーム</h2>
                <button
                  onClick={addBigOption}
                  className="min-h-[44px] rounded-xl bg-black px-4 py-2 text-sm font-bold text-white"
                >
                  追加
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {bigOptions.map((option, index) => (
                  <div key={option.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-gray-700">選択肢 {index + 1}</span>
                      <button
                        onClick={() => deleteBigOption(option.id)}
                        className="min-h-[40px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold"
                      >
                        削除
                      </button>
                    </div>

                    <input
                      value={option.text}
                      onChange={(e) => updateBigText(option.id, e.target.value)}
                      placeholder="入力"
                      className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
