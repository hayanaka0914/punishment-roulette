"use client";

import { useEffect, useMemo, useState } from "react";

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

const MAIN_STORAGE_KEY = "punishment_main_options_v2";
const BIG_STORAGE_KEY = "punishment_big_options_v2";

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
  "#fca5a5",
  "#93c5fd",
  "#86efac",
  "#fde68a",
  "#c4b5fd",
  "#f9a8d4",
  "#fdba74",
  "#67e8f9",
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
  const extraRotation = 360 * 6 + Math.random() * 360;
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
}: {
  options: string[];
  rotation: number;
  spinning: boolean;
}) {
  const size = 360;
  const center = size / 2;
  const radius = 160;
  const count = Math.max(options.length, 1);
  const step = 360 / count;

  const slices = useMemo(() => {
    return options.map((label, index) => {
      const startAngle = index * step;
      const endAngle = (index + 1) * step;
      const middleAngle = startAngle + step / 2;
      const textRadius = radius * 0.67;
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
      <div className="relative w-full max-w-[360px]">
        <div className="absolute left-1/2 top-[-10px] z-30 h-0 w-0 -translate-x-1/2 rotate-180 border-l-[18px] border-r-[18px] border-b-[28px] border-l-transparent border-r-transparent border-b-slate-950 drop-shadow" />

        <div
          className="relative aspect-square w-full rounded-full border-[8px] border-white bg-white shadow-2xl sm:border-[10px]"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 4.2s cubic-bezier(0.15, 0.85, 0.2, 1)" : "none",
          }}
        >
          <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full rounded-full">
            <circle cx={center} cy={center} r={radius} fill="#e5e7eb" />

            {slices.map((slice) => (
              <g key={`${slice.label}-${slice.index}`}>
                <path d={slice.path} fill={slice.fill} stroke="#ffffff" strokeWidth="2" />
                <g transform={`translate(${slice.textX} ${slice.textY}) rotate(${slice.rotate})`}>
                  {slice.lines.map((line, i) => (
                    <text
                      key={`${slice.index}-${i}`}
                      x="0"
                      y={(i - (slice.lines.length - 1) / 2) * 15}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="13"
                      fontWeight="700"
                      fill="#0f172a"
                    >
                      {line}
                    </text>
                  ))}
                </g>
              </g>
            ))}

            <circle cx={center} cy={center} r="18" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
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

  useEffect(() => {
    setMounted(true);

    try {
      const savedMain = localStorage.getItem(MAIN_STORAGE_KEY);
      const savedBig = localStorage.getItem(BIG_STORAGE_KEY);

      if (savedMain) {
        const parsed = JSON.parse(savedMain) as MainOption[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMainOptions(parsed);
        }
      }

      if (savedBig) {
        const parsed = JSON.parse(savedBig) as BigOption[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBigOptions(parsed);
        }
      }
    } catch (error) {
      console.error("localStorage load error:", error);
    }
  }, []);

    useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(() => {
          console.log("Service Worker registered");
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
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
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as DeferredInstallPrompt);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const mainBossCount = mainOptions.filter((option) => option.isBoss).length;
  const canSpinMain = mainOptions.length === 4 && mainBossCount === 1;
  const canSpinBig = bigOptions.length >= 2;

  const mainTexts = mainOptions.map((option) =>
    option.isBoss ? option.text || "大罰ゲームへ" : option.text || "未入力"
  );
  const bigTexts = bigOptions.map((option) => option.text || "未入力");

  const spinMain = () => {
    if (spinning || !canSpinMain) return;

    setSpinning(true);
    setResult("");

    const nextRotation = buildSpinRotation(mainRotation);
    setMainRotation(nextRotation);

    window.setTimeout(() => {
      const winnerIndex = getWinnerIndex(nextRotation, mainOptions.length);
      const winner = mainOptions[winnerIndex];
      setSpinning(false);

      if (winner.isBoss) {
        setResult("大罰ゲームへ進みます…");
        window.setTimeout(() => {
          setResult("");
          setScreen("big");
        }, 1200);
      } else {
        setResult(`結果：${winner.text || "未入力"}`);
      }
    }, 4200);
  };

  const spinBig = () => {
    if (spinning || !canSpinBig) return;

    setSpinning(true);
    setResult("");

    const nextRotation = buildSpinRotation(bigRotation);
    setBigRotation(nextRotation);

    window.setTimeout(() => {
      const winnerIndex = getWinnerIndex(nextRotation, bigOptions.length);
      const winner = bigOptions[winnerIndex];
      setSpinning(false);
      setResult(`大罰ゲーム決定：${winner.text || "未入力"}`);
    }, 4200);
  };

  const handleInstallClick = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallMessage("ホーム画面への追加が完了しました。必要ならいったん閉じてアイコンから開いてください。");
      } else {
        setInstallMessage("インストールはキャンセルされました。あとでまた追加できます。");
      }
      setInstallPrompt(null);
      return;
    }

    setInstallMessage(
      "iPhone / iPad は共有メニューから『ホーム画面に追加』、Android Chrome はブラウザメニューまたは画面内のインストール案内から追加してください。"
    );
  };

  const updateMainText = (id: number, text: string) => {
    setMainOptions((prev) => prev.map((option) => (option.id === id ? { ...option, text } : option)));
  };

  const updateBigText = (id: number, text: string) => {
    setBigOptions((prev) => prev.map((option) => (option.id === id ? { ...option, text } : option)));
  };

  const setBossOption = (id: number) => {
    setMainOptions((prev) =>
      prev.map((option) => ({
        ...option,
        isBoss: option.id === id,
      }))
    );
  };

  const addMainOption = () => {
    if (mainOptions.length >= 4) return;

    const nextId = mainOptions.length > 0 ? Math.max(...mainOptions.map((o) => o.id)) + 1 : 1;
    setMainOptions((prev) => [
      ...prev,
      {
        id: nextId,
        text: `通常罰ゲーム${prev.length + 1}`,
        isBoss: false,
      },
    ]);
  };

  const addBigOption = () => {
    const nextId = bigOptions.length > 0 ? Math.max(...bigOptions.map((o) => o.id)) + 1 : 1;
    setBigOptions((prev) => [
      ...prev,
      {
        id: nextId,
        text: `大罰ゲーム${prev.length + 1}`,
      },
    ]);
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
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-200 text-slate-900">
      <div className="mx-auto max-w-6xl p-4 pb-10 sm:p-6">
        <div className="mb-4 rounded-3xl bg-white/80 p-4 shadow-sm backdrop-blur sm:p-6">
          <h1 className="text-2xl font-bold sm:text-3xl">
            {screen === "main" ? "罰ゲームルーレット" : "大罰ゲームルーレット"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
            矢印は180度反転済みです。さらに、ホーム画面追加しやすいようにインストール導線も入れています。
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleInstallClick}
              className="min-h-[48px] rounded-2xl bg-emerald-600 px-5 py-3 text-base font-bold text-white"
            >
              ホーム画面に追加しやすくする
            </button>
            <button
              onClick={resetAll}
              className="min-h-[48px] rounded-2xl border border-slate-300 bg-white px-5 py-3 text-base font-bold"
            >
              初期状態に戻す
            </button>
          </div>

          {installMessage && (
            <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
              {installMessage}
            </p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl bg-white p-4 shadow-xl sm:p-6">
            <div className="flex flex-col items-center">
              <RouletteWheel options={currentTexts} rotation={currentRotation} spinning={spinning} />

              <div className="mt-6 w-full max-w-xl rounded-2xl bg-slate-50 p-4 text-center">
                {result ? (
                  <p className="text-lg font-bold sm:text-xl">{result}</p>
                ) : (
                  <p className="text-sm text-slate-500 sm:text-base">
                    {screen === "main" ? "通常ルーレットを回してください" : "大罰ゲームルーレットを回してください"}
                  </p>
                )}
              </div>

              <div className="mt-5 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
                {screen === "main" ? (
                  <button
                    onClick={spinMain}
                    disabled={!canSpinMain || spinning}
                    className="min-h-[52px] flex-1 rounded-2xl bg-slate-900 px-5 py-3 text-base font-bold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {spinning ? "回転中..." : "通常ルーレットを回す"}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={spinBig}
                      disabled={!canSpinBig || spinning}
                      className="min-h-[52px] flex-1 rounded-2xl bg-red-700 px-5 py-3 text-base font-bold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {spinning ? "回転中..." : "大罰ゲームルーレットを回す"}
                    </button>

                    <button
                      onClick={() => {
                        setScreen("main");
                        setResult("");
                      }}
                      className="min-h-[52px] rounded-2xl border border-slate-300 bg-white px-5 py-3 text-base font-bold"
                    >
                      戻る
                    </button>
                  </>
                )}
              </div>

              <div className="mt-4 w-full max-w-xl rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                {screen === "main" ? (
                  <>
                    <p>通常ルーレットの条件</p>
                    <p>・選択肢はちょうど4つ必要</p>
                    <p>・大罰ゲーム行きのマスは1つだけ必要</p>
                    <p className="mt-2 font-semibold text-slate-800">
                      現在: {mainOptions.length}/4、 大罰ゲーム行き: {mainBossCount}個
                    </p>
                  </>
                ) : (
                  <>
                    <p>大罰ゲームルーレットの条件</p>
                    <p>・選択肢は2つ以上必要</p>
                    <p className="mt-2 font-semibold text-slate-800">現在: {bigOptions.length}個</p>
                  </>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl bg-white p-4 shadow-xl sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">通常ルーレット設定</h2>
                <button
                  onClick={addMainOption}
                  disabled={mainOptions.length >= 4}
                  className="min-h-[44px] rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  追加
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {mainOptions.map((option, index) => (
                  <div key={option.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-700">選択肢 {index + 1}</span>
                      <button
                        onClick={() => deleteMainOption(option.id)}
                        className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold"
                      >
                        削除
                      </button>
                    </div>

                    <input
                      value={option.text}
                      onChange={(e) => updateMainText(option.id, e.target.value)}
                      placeholder="選択肢を入力"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-slate-500"
                    />

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-3 py-2">
                        <input
                          type="radio"
                          name="boss-option"
                          checked={option.isBoss}
                          onChange={() => setBossOption(option.id)}
                        />
                        <span className="text-sm font-medium">このマスを「大罰ゲーム行き」にする</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-xl sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">大罰ゲーム設定</h2>
                <button
                  onClick={addBigOption}
                  className="min-h-[44px] rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white"
                >
                  追加
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {bigOptions.map((option, index) => (
                  <div key={option.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-700">大罰ゲーム {index + 1}</span>
                      <button
                        onClick={() => deleteBigOption(option.id)}
                        className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold"
                      >
                        削除
                      </button>
                    </div>

                    <input
                      value={option.text}
                      onChange={(e) => updateBigText(option.id, e.target.value)}
                      placeholder="大罰ゲーム内容を入力"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-slate-500"
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