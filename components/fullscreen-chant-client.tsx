"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  projectId: string;
  projectName: string;
  initialCount: number;
  vowText: string;
  dedicationText: string;
  statueUrl: string;
  musicUrl: string;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

type TextPanelMode = "none" | "vow" | "dedication";

export default function FullscreenChantClient({
  projectId,
  projectName,
  initialCount,
  vowText,
  dedicationText,
  statueUrl,
  musicUrl,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [count, setCount] = useState(initialCount);
  const [recognizedCount, setRecognizedCount] = useState(0);
  const [textPanelMode, setTextPanelMode] = useState<TextPanelMode>("none");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState("");
  const [micTestVisible, setMicTestVisible] = useState(false);
  const [micTestRunning, setMicTestRunning] = useState(false);
  const [micTestLevel, setMicTestLevel] = useState(0);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("请先发愿，再开始念佛。");
  const [offeringFlowers, setOfferingFlowers] = useState(false);
  const [flowerSeeds, setFlowerSeeds] = useState<number[]>([]);

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const countRef = useRef(initialCount);

  // 防重复计数
  const lastCountAtRef = useRef(0);
  const lastCountTextRef = useRef("");

  useEffect(() => {
    countRef.current = count;
  }, [count]);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    setRecognitionSupported(supported);
    loadDevices();

    return () => {
      stopMicTest();
      stopRecognition();
    };
  }, []);

  async function loadDevices() {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tempStream.getTracks().forEach((track) => track.stop());

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const mics = allDevices.filter((d) => d.kind === "audioinput");
      setDevices(mics);
      if (mics.length > 0) {
        setSelectedMicId(mics[0].deviceId);
      }
    } catch {
      setStatusMsg("暂时无法读取麦克风列表，请先允许浏览器使用麦克风。");
    }
  }

  async function saveCountToDb(newCount: number, delta: number) {
    const { error: updateError } = await supabase
      .from("projects")
      .update({ count: newCount })
      .eq("id", projectId);

    if (updateError) {
      setStatusMsg(`保存总数失败：${updateError.message}`);
      return;
    }

    if (delta !== 0) {
      const { error: recordError } = await supabase.from("chant_records").insert({
        project_id: projectId,
        count_added: delta,
      });

      if (recordError) {
        setStatusMsg(`写入记录失败：${recordError.message}`);
      }
    }
  }

  async function increaseCountByOne() {
    const newCount = countRef.current + 1;
    setCount(newCount);
    setRecognizedCount((prev) => prev + 1);
    countRef.current = newCount;
    await saveCountToDb(newCount, 1);
  }

  async function handleManualAdd(delta: number) {
    const newCount = Math.max(0, countRef.current + delta);
    const realDelta = newCount - countRef.current;
    setCount(newCount);
    countRef.current = newCount;
    await saveCountToDb(newCount, realDelta);
  }

  async function startMicTest() {
    try {
      stopMicTest();
      setMicTestVisible(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
      });

      mediaStreamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      setMicTestRunning(true);
      setStatusMsg("麦克风测试中。请对着麦克风念一句佛号。");

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg =
          dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setMicTestLevel(Math.min(100, Math.round(avg)));
        animationRef.current = requestAnimationFrame(tick);
      };

      tick();
    } catch {
      setStatusMsg("麦克风测试启动失败，请检查浏览器权限。");
      setMicTestVisible(true);
    }
  }

  function stopMicTest() {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setMicTestRunning(false);
    setMicTestLevel(0);
  }

  function closeMicTestPanel() {
    stopMicTest();
    setMicTestVisible(false);
  }

  function normalizeText(text: string) {
    return text.replace(/\s+/g, "").trim();
  }

  function looksLikeOneRecitation(text: string) {
    const t = normalizeText(text);

    if (!t) return false;

    return (
      t.includes("南无阿弥陀佛") ||
      t.includes("阿弥陀佛") ||
      t.includes("南无地藏王菩萨") ||
      t.includes("地藏王菩萨") ||
      t.includes("南无观世音菩萨") ||
      t.includes("观世音菩萨")
    );
  }

  async function tryCountOneBySpeech(text: string) {
    const t = normalizeText(text);
    if (!looksLikeOneRecitation(t)) return;

    const now = Date.now();

    // 防止同一句被浏览器重复吐出来
    const tooSoon = now - lastCountAtRef.current < 700;
    const sameText = t === lastCountTextRef.current;

    if (tooSoon && sameText) return;
    if (tooSoon) return;

    lastCountAtRef.current = now;
    lastCountTextRef.current = t;

    await increaseCountByOne();
  }

  function startRecognition() {
    if (!recognitionSupported) {
      setStatusMsg("当前浏览器不支持语音识别，建议使用最新版 Chrome。");
      return;
    }

    stopRecognition();

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setRecognizing(true);
      setStatusMsg("识别已开始，请平稳、均匀地一声一声念佛。");
      lastCountAtRef.current = 0;
      lastCountTextRef.current = "";
    };

    recognition.onresult = async (event: any) => {
      // 只取最新一条结果，尽量减少重复累计
      const i = event.results.length - 1;
      if (i < 0) return;

      const transcript = event.results[i][0]?.transcript ?? "";
      if (!transcript.trim()) return;

      await tryCountOneBySpeech(transcript);
    };

    recognition.onerror = (event: any) => {
      setStatusMsg(`识别出错：${event.error || "未知错误"}`);
    };

    recognition.onend = () => {
      setRecognizing(false);
      setStatusMsg("识别已停止。");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopRecognition() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setRecognizing(false);
  }

  async function enterRealFullscreen() {
    try {
      const docElm = document.documentElement;
      if (docElm.requestFullscreen) {
        await docElm.requestFullscreen();
      }
    } catch {
      setStatusMsg("浏览器未能进入真正全屏，但你仍可继续使用此页面。");
    }
  }

  async function exitFullScreen() {
    try {
      stopRecognition();
      stopMicTest();
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        window.close();
      }
    } catch {
      window.close();
    }
  }

  function startFlowerOfferingThenShowDedication() {
    stopRecognition();
    setOfferingFlowers(true);
    setStatusMsg("鲜花敬献中……");

    const seeds = Array.from({ length: 56 }, (_, i) => i + 1);
    setFlowerSeeds(seeds);

    setTimeout(() => {
      setOfferingFlowers(false);
      setFlowerSeeds([]);
      setTextPanelMode("dedication");
      setStatusMsg("请开始念回向文。");
    }, 4200);
  }

  function toggleVowText() {
    setTextPanelMode((prev) => (prev === "vow" ? "none" : "vow"));
  }

  function toggleDedicationText() {
    setTextPanelMode((prev) => (prev === "dedication" ? "none" : "dedication"));
  }

  const bottomText =
    textPanelMode === "vow"
      ? vowText || "暂无发愿文"
      : textPanelMode === "dedication"
      ? dedicationText || "暂无回向文"
      : "";

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_10%,rgba(54,105,186,0.25),transparent_18%),radial-gradient(circle_at_50%_18%,rgba(105,164,255,0.16),transparent_26%),linear-gradient(180deg,#071327_0%,#0a1f3f_26%,#0b2b55_58%,#0a2346_78%,#08182f_100%)] text-[#f5e7bf]">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_16%,rgba(255,255,255,0.12),transparent_20%),radial-gradient(circle_at_50%_100%,rgba(234,194,91,0.08),transparent_28%)]" />

      <div className="relative h-screen w-screen">
        <div className="absolute inset-0 flex items-center justify-center px-[14vw]">
          {statueUrl ? (
            <img
              src={statueUrl}
              alt="佛像"
              className="max-h-[96vh] max-w-[70vw] object-contain drop-shadow-[0_20px_80px_rgba(255,214,120,0.18)] select-none"
            />
          ) : (
            <div className="flex h-[78vh] w-[52vw] items-center justify-center rounded-[40px] border border-[#6d84a9] bg-white/10 text-3xl text-[#d9c78f]">
              暂无佛像，请先在项目中选择佛像
            </div>
          )}
        </div>

        <div className="absolute right-[4vw] top-[16vh] w-[18vw] min-w-[220px] max-w-[320px] rounded-[30px] border border-[#4f6c98] bg-[linear-gradient(180deg,rgba(7,18,39,0.86),rgba(15,35,68,0.78))] px-6 py-7 text-center text-[#f9e7b8] shadow-[0_22px_60px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <div className="text-[18px] tracking-[0.25em] text-[#e9cd7f]">总计数</div>
          <div className="mt-2 text-[clamp(60px,7vw,110px)] font-bold leading-none">
            {count}
          </div>
          <div className="mt-4 border-t border-white/10 pt-4 text-sm text-[#f0ddb0]">
            本次识别：<span className="text-3xl font-bold">{recognizedCount}</span>
          </div>
        </div>

        <div className="absolute left-[3vw] top-[24vh] flex w-[12vw] min-w-[138px] flex-col gap-3">
          <button
            onClick={toggleVowText}
            className={`rounded-2xl px-4 py-3 text-base font-semibold shadow ${
              textPanelMode === "vow"
                ? "bg-[linear-gradient(180deg,#f0d78a,#d2a94a)] text-[#4d3510]"
                : "bg-white/12 text-[#f1dfad] backdrop-blur-md border border-[#5c78a2]"
            }`}
          >
            发愿文
          </button>

          <button
            onClick={toggleDedicationText}
            className={`rounded-2xl px-4 py-3 text-base font-semibold shadow ${
              textPanelMode === "dedication"
                ? "bg-[linear-gradient(180deg,#f0d78a,#d2a94a)] text-[#4d3510]"
                : "bg-white/12 text-[#f1dfad] backdrop-blur-md border border-[#5c78a2]"
            }`}
          >
            回向文
          </button>

          <button
            onClick={startMicTest}
            className="rounded-2xl bg-[linear-gradient(180deg,#f0d78a,#d2a94a)] px-4 py-3 text-base font-semibold text-[#4d3510] shadow"
          >
            麦克风测试
          </button>

          <button
            onClick={enterRealFullscreen}
            className="rounded-2xl border border-[#5c78a2] bg-white/12 px-4 py-3 text-base font-semibold text-[#f1dfad] shadow backdrop-blur-md"
          >
            真正全屏
          </button>
        </div>

        <div className="absolute right-[3vw] bottom-[6vh] flex w-[24vw] min-w-[330px] flex-wrap justify-end gap-3">
          <button
            onClick={startRecognition}
            className="rounded-2xl bg-[linear-gradient(180deg,#f0d78a,#d2a94a)] px-6 py-4 text-lg font-semibold text-[#4b3410] shadow-[0_10px_30px_rgba(165,120,20,0.22)]"
          >
            开始识别
          </button>

          <button
            onClick={stopRecognition}
            className="rounded-2xl border border-[#5c78a2] bg-white/12 px-6 py-4 text-lg font-semibold text-[#f1dfad] shadow backdrop-blur-md"
          >
            停止识别
          </button>

          <button
            onClick={() => handleManualAdd(1)}
            className="rounded-2xl border border-[#5c78a2] bg-white/12 px-6 py-4 text-lg font-semibold text-[#f1dfad] shadow backdrop-blur-md"
          >
            手动 +1
          </button>

          <button
            onClick={() => handleManualAdd(-1)}
            className="rounded-2xl border border-[#5c78a2] bg-white/12 px-6 py-4 text-lg font-semibold text-[#f1dfad] shadow backdrop-blur-md"
          >
            手动 -1
          </button>

          <button
            onClick={startFlowerOfferingThenShowDedication}
            className="rounded-2xl bg-[linear-gradient(180deg,#f6e6b8,#ddb567)] px-6 py-4 text-lg font-semibold text-[#5c4317] shadow"
          >
            念佛结束
          </button>

          <button
            onClick={exitFullScreen}
            className="rounded-2xl bg-[linear-gradient(180deg,#5b3a2a,#3b2418)] px-6 py-4 text-lg font-semibold text-white shadow"
          >
            退出全屏
          </button>
        </div>

        {bottomText && (
          <div className="absolute bottom-[2.2vh] left-1/2 w-[66vw] max-w-[1100px] -translate-x-1/2 rounded-[30px] border border-[#5d79a5] bg-[linear-gradient(180deg,rgba(10,25,52,0.92),rgba(13,33,67,0.90))] px-8 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.30)] backdrop-blur-md">
            <div className="mb-3 text-center text-2xl font-bold text-[#f0d78a]">
              {textPanelMode === "vow" ? "发愿文" : "回向文"}
            </div>
            <div className="max-h-[22vh] overflow-auto whitespace-pre-wrap text-center text-[clamp(20px,1.55vw,30px)] leading-[2.1] text-[#f8efcf]">
              {bottomText}
            </div>
          </div>
        )}

        {musicUrl ? (
          <div className="absolute left-[2.8vw] bottom-[5.5vh] w-[14vw] min-w-[180px] rounded-[24px] border border-[#5c78a2] bg-white/10 p-3 shadow backdrop-blur-md">
            <div className="mb-2 text-sm text-[#d9c88e]">佛乐播放</div>
            <audio controls autoPlay loop className="w-full" src={musicUrl} />
          </div>
        ) : null}

        <div className="absolute left-[2.8vw] bottom-[18vh] w-[14vw] min-w-[180px] rounded-[24px] border border-[#5c78a2] bg-white/10 px-4 py-4 text-sm text-[#f4e7bd] shadow backdrop-blur-md">
          <div className="font-semibold text-[#f0d78a]">
            {recognizing ? "识别中" : "未识别"}
          </div>
          <div className="mt-2 leading-6 text-[#f5ebc8]">{statusMsg}</div>
        </div>

        {micTestVisible && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(4,10,22,0.45)] backdrop-blur-[2px]">
            <div className="w-[min(720px,88vw)] rounded-[34px] border border-[#6c86ad] bg-[linear-gradient(180deg,#f7f1e3,#efe5d0)] p-8 shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
              <div className="mb-6 text-3xl font-bold text-[#7d5c20]">麦克风选择</div>

              <select
                value={selectedMicId}
                onChange={(e) => setSelectedMicId(e.target.value)}
                className="w-full rounded-[22px] border border-[#d9c6a1] bg-white px-5 py-4 text-2xl text-[#57401a] shadow-sm"
              >
                {devices.length === 0 && <option value="">没有读取到麦克风</option>}
                {devices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `麦克风 ${index + 1}`}
                  </option>
                ))}
              </select>

              <div className="mt-4 text-lg leading-8 text-[#8d7347]">
                提示：浏览器原生语音识别大多会使用系统默认麦克风。这里的麦克风选择主要用于测试输入设备。
              </div>

              <div className="mt-8 flex flex-wrap gap-5">
                <button
                  onClick={startMicTest}
                  className="rounded-[24px] bg-[linear-gradient(180deg,#dfc06d,#c99d43)] px-8 py-5 text-2xl font-semibold text-[#4e3611] shadow"
                >
                  麦克风测试
                </button>
                <button
                  onClick={closeMicTestPanel}
                  className="rounded-[24px] bg-[#e7dcc1] px-8 py-5 text-2xl font-semibold text-[#735a2f] shadow"
                >
                  停止测试
                </button>
              </div>

              <div className="mt-8 h-6 w-full overflow-hidden rounded-full bg-[#e2d3b2]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#c18d2d,#dfba62,#f3df9f)] transition-all duration-150"
                  style={{ width: `${micTestLevel}%` }}
                />
              </div>

              <div className="mt-5 text-2xl text-[#8d7347]">
                {micTestRunning ? `当前测试音量：${micTestLevel}` : "麦克风测试未启动"}
              </div>
            </div>
          </div>
        )}

        {offeringFlowers && (
          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
            {flowerSeeds.map((seed, index) => {
              const left = 8 + ((index * 17) % 84);
              const delay = (index % 12) * 0.12;
              const duration = 2.8 + (index % 5) * 0.35;
              const size = 36 + (index % 6) * 12;
              return (
                <div
                  key={seed}
                  className="absolute bottom-[-80px] animate-[flowerRise_var(--dur)_ease-out_forwards]"
                  style={
                    {
                      left: `${left}%`,
                      animationDelay: `${delay}s`,
                      ["--dur" as any]: `${duration}s`,
                    } as React.CSSProperties
                  }
                >
                  <div
                    className="flex items-center justify-center rounded-full bg-[radial-gradient(circle,#ffe7f1_0%,#f6b6cb_45%,#ef8cae_70%,#d85f8d_100%)] text-white shadow-[0_10px_25px_rgba(190,90,120,0.35)]"
                    style={{ width: size, height: size }}
                  >
                    ✿
                  </div>
                </div>
              );
            })}

            <div className="absolute bottom-[7vh] left-1/2 -translate-x-1/2 text-center">
              <div className="rounded-full bg-[rgba(9,24,49,0.82)] px-8 py-4 text-3xl font-bold text-[#f0d78a] shadow backdrop-blur-md">
                鲜花敬献中……
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes flowerRise {
          0% {
            transform: translateY(0) scale(0.7);
            opacity: 0;
          }
          18% {
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translateY(-34vh) scale(1.25);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

function TextDirectoryCard({
  item,
  editingTextId,
  editingTitle,
  editingContent,
  setEditingTitle,
  setEditingContent,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onUse,
}: {
  item: ChantText;
  editingTextId: string | null;
  editingTitle: string;
  editingContent: string;
  setEditingTitle: (v: string) => void;
  setEditingContent: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onUse: () => void;
}) {
  const isEditing = editingTextId === item.id;

  return (
    <div className="rounded-2xl border border-[#5b78a3] bg-white/6 p-4">
      {isEditing ? (
        <div className="space-y-3">
          <input
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            className="w-full rounded-2xl border border-[#5b78a3] bg-white/10 px-4 py-3 text-[#f8efcf]"
          />
          <textarea
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            className="min-h-32 w-full rounded-2xl border border-[#5b78a3] bg-white/10 px-4 py-3 text-[#f8efcf]"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onSaveEdit}
              className="rounded-xl bg-white px-3 py-2 font-semibold text-black"
            >
              保存
            </button>
            <button
              onClick={onCancelEdit}
              className="rounded-xl bg-white px-3 py-2 font-semibold text-black"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-xl font-semibold text-[#f5ebc8]">{item.title}</div>
          <div className="mt-2 line-clamp-3 whitespace-pre-wrap text-[#d8cfb1]">
            {item.content}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={onUse}
              className="rounded-xl bg-white px-3 py-2 font-semibold text-black"
            >
              设为当前项目使用
            </button>
            <button
              onClick={onStartEdit}
              className="rounded-xl bg-white px-3 py-2 font-semibold text-black"
            >
              修改
            </button>
            <button
              onClick={onDelete}
              className="rounded-xl bg-white px-3 py-2 font-semibold text-black"
            >
              删除
            </button>
          </div>
        </>
      )}
    </div>
  );
}