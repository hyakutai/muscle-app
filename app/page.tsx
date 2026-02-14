"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Play, Pause, RotateCcw, Youtube, Link as LinkIcon, Calendar as CalIcon, 
  Folder, FolderOpen, Plus, Image as ImageIcon, Trash2, Edit2, X, Clock, 
  TrendingUp, Dumbbell 
} from "lucide-react";
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

// --- 型定義 ---
type MediaItem = { id: string; title: string; url: string; type: "youtube" | "link" | "image"; };
type FolderType = { id: string; name: string; items: MediaItem[]; };
type BodyPart = '胸' | '腕' | '腹筋' | '背中' | '尻' | '足';
type TrainingRecord = { date: string; memo: string; stamps: BodyPart[]; weight: string; };

const partColors: Record<BodyPart, string> = {
  '胸': 'bg-red-500', '腕': 'bg-orange-500', '腹筋': 'bg-yellow-500',
  '背中': 'bg-blue-500', '尻': 'bg-pink-500', '足': 'bg-green-500',
};

// 初期データ
const initialFolders: FolderType[] = [
  { id: "f1", name: "胸トレ解説", items: [{ id: "m1", title: "ベンチプレス基本", url: "https://www.youtube.com/watch?v=example", type: "youtube" }] },
  { id: "f2", name: "背中メニュー", items: [] },
];

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  
  const [folders, setFolders] = useState<FolderType[]>(initialFolders);
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [records, setRecords] = useState<Record<string, TrainingRecord>>({});
  
  // --- タイマー＆ストップウォッチ管理 ---
  const [timerMode, setTimerMode] = useState<"stopwatch" | "timer">("stopwatch");
  const [swTime, setSwTime] = useState(0);
  const [swRunning, setSwRunning] = useState(false);
  const [timerTime, setTimerTime] = useState(180000);
  const [timerInitial, setTimerInitial] = useState(180000);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isTimerFinished, setIsTimerFinished] = useState(false);
  const [inputMin, setInputMin] = useState(3);
  const [inputSec, setInputSec] = useState(0);

  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);

  // --- データの読み込み ---
  useEffect(() => {
    const savedFolders = localStorage.getItem("muscleAppFolders");
    const savedRecords = localStorage.getItem("muscleAppRecords");
    if (savedFolders) setFolders(JSON.parse(savedFolders));
    if (savedRecords) setRecords(JSON.parse(savedRecords));
    setIsLoaded(true);
  }, []);

  // --- データの自動保存 ---
  useEffect(() => {
    if (!isLoaded) return;
    try { localStorage.setItem("muscleAppFolders", JSON.stringify(folders)); } catch (e) { alert("容量上限です。画像を減らしてください。"); }
  }, [folders, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("muscleAppRecords", JSON.stringify(records));
  }, [records, isLoaded]);

  // --- ストップウォッチ計測 ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (swRunning) interval = setInterval(() => setSwTime(t => t + 10), 10);
    return () => clearInterval(interval);
  }, [swRunning]);

  // --- タイマー計測 ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timerTime > 0) {
      interval = setInterval(() => {
        setTimerTime(t => {
          if (t <= 10) {
            setIsTimerFinished(true);
            setTimerRunning(false);
            return 0;
          }
          return t - 10;
        });
      }, 10);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerTime]);

  const formatTime = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const ms10 = Math.floor((ms % 1000) / 10);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms10.toString().padStart(2, "0")}`;
  };

  const setPresetTimer = (minutes: number) => {
    const ms = minutes * 60 * 1000;
    setTimerInitial(ms);
    setTimerTime(ms);
    setInputMin(minutes);
    setInputSec(0);
    setTimerRunning(false);
    setIsTimerFinished(false);
  };

  const handleCustomTimerSet = () => {
    const ms = (inputMin * 60 + inputSec) * 1000;
    setTimerInitial(ms);
    setTimerTime(ms);
    setTimerRunning(false);
    setIsTimerFinished(false);
  };

  // --- フォルダ・リンク操作 ---
  const handleAddFolder = () => {
    const name = window.prompt("フォルダ名:");
    if (name?.trim()) setFolders([...folders, { id: Date.now().toString(), name, items: [] }]);
  };
  const handleEditFolder = (fid: string) => {
    const folder = folders.find(f => f.id === fid);
    if (!folder) return;
    const name = window.prompt("変更後の名前:", folder.name);
    if (name?.trim()) setFolders(folders.map(f => f.id === fid ? { ...f, name } : f));
  };
  const handleAddLink = (fid: string) => {
    if (!newLinkUrl) return;
    const isYt = newLinkUrl.includes("youtube") || newLinkUrl.includes("youtu.be");
    const item: MediaItem = { id: Date.now().toString(), title: isYt ? "YouTube" : "Link", url: newLinkUrl, type: isYt ? "youtube" : "link" };
    setFolders(folders.map(f => f.id === fid ? { ...f, items: [...f.items, item] } : f));
    setNewLinkUrl(""); 
  };
  const handleAddImage = (fid: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const item: MediaItem = { id: Date.now().toString(), title: file.name, url: reader.result as string, type: "image" };
      setFolders(folders.map(f => f.id === fid ? { ...f, items: [...f.items, item] } : f));
    };
    reader.readAsDataURL(file); 
  };
  const handleDeleteItem = (fid: string, iid: string) => {
    if(confirm("削除しますか？")) setFolders(folders.map(f => f.id === fid ? { ...f, items: f.items.filter(i => i.id !== iid) } : f));
  };

  // --- 記録操作 ---
  const currentDateKey = format(selectedDate, "yyyy-MM-dd");
  const currentRecord = records[currentDateKey] || { memo: "", stamps: [], weight: "", date: currentDateKey };

  const toggleStamp = (part: BodyPart) => {
    const newStamps = currentRecord.stamps.includes(part) ? currentRecord.stamps.filter(p => p !== part) : [...currentRecord.stamps, part];
    setRecords({ ...records, [currentDateKey]: { ...currentRecord, stamps: newStamps } });
  };
  const updateMemo = (text: string) => setRecords({ ...records, [currentDateKey]: { ...currentRecord, memo: text } });
  const updateWeight = (val: string) => setRecords({ ...records, [currentDateKey]: { ...currentRecord, weight: val } });

  // --- グラフ用データ ---
  const graphData = useMemo(() => {
    const data = Object.values(records)
      .filter(r => r.weight && !isNaN(parseFloat(r.weight)))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return data;
  }, [records]);

  // --- カレンダー描画 ---
  const renderCalendar = () => {
    const start = viewMode === "week" ? startOfWeek(selectedDate, { weekStartsOn: 1 }) : startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 });
    const end = viewMode === "week" ? addDays(start, 6) : endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 });
    const days = [];
    let d = start;
    while (d <= end) { days.push(d); d = addDays(d, 1); }

    return (
      <div className={`grid grid-cols-7 gap-1 text-center ${viewMode === "month" ? "text-sm" : "text-base"}`}>
        {["月", "火", "水", "木", "金", "土", "日"].map(day => <div key={day} className="text-gray-400 text-xs py-1">{day}</div>)}
        {days.map((day, idx) => {
          const dKey = format(day, "yyyy-MM-dd");
          const rec = records[dKey];
          const isSelected = isSameDay(day, selectedDate);
          return (
            <div key={idx} onClick={() => setSelectedDate(day)} className={`p-2 rounded-lg cursor-pointer flex flex-col items-center justify-start relative min-h-[50px] ${!isSameMonth(day, selectedDate) && viewMode === "month" ? "text-gray-300" : "text-gray-800"} ${isSelected ? "bg-blue-600 text-white shadow-lg" : "hover:bg-gray-100"}`}>
              <span className="mb-1 text-xs">{format(day, "d")}</span>
              {rec?.stamps?.length > 0 && (
                <div className="flex flex-wrap justify-center gap-[2px] w-full px-1">
                  {rec.stamps.map(p => <div key={p} className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : partColors[p]}`}></div>)}
                </div>
              )}
              {rec?.weight && <div className={`w-1 h-1 mt-0.5 rounded-full ${isSelected ? "bg-purple-200" : "bg-purple-500"}`}></div>}
            </div>
          );
        })}
      </div>
    );
  };

  // --- グラフ描画 (SVG) ---
  const renderGraph = () => {
    if (graphData.length < 2) return <div className="h-40 flex items-center justify-center text-gray-400 text-sm">データが不足しています（2日以上記録してください）</div>;
    
    const height = 200;
    const width = 300;
    const padding = 20;
    
    const weights = graphData.map(d => parseFloat(d.weight));
    const minW = Math.min(...weights) - 1;
    const maxW = Math.max(...weights) + 1;
    
    const points = graphData.map((d, i) => {
      const x = padding + (i / (graphData.length - 1)) * (width - padding * 2);
      const y = height - padding - ((parseFloat(d.weight) - minW) / (maxW - minW)) * (height - padding * 2);
      return { x, y, val: d.weight, date: format(parseISO(d.date), 'M/d') };
    });

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#eee" strokeWidth="1" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#eee" strokeWidth="1" />
        <polyline points={points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill="#3b82f6" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="10" fill="#666">{p.val}</text>
            <text x={p.x} y={height - 5} textAnchor="middle" fontSize="8" fill="#999">{p.date}</text>
          </g>
        ))}
      </svg>
    );
  };

  if (!isLoaded) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>;

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 text-gray-900 font-sans overflow-hidden border-x border-gray-200 shadow-2xl relative">
      {/* 画像ポップアップ */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} className="max-w-full max-h-[80vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
          <button onClick={() => setSelectedImage(null)} className="absolute top-8 right-8 text-white"><X size={32}/></button>
        </div>
      )}

      {/* グラフモーダル */}
      {isGraphOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setIsGraphOpen(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><TrendingUp className="text-blue-500" /> 体重推移</h3>
              <button onClick={() => setIsGraphOpen(false)} className="bg-gray-100 p-1 rounded-full"><X size={20} /></button>
            </div>
            <div className="w-full h-64 bg-gray-50 rounded-xl border border-gray-100 p-2">
              {renderGraph()}
            </div>
          </div>
        </div>
      )}

      {/* --- 上部：フォルダ --- */}
      <div className="bg-white p-4 border-b border-gray-200 flex-shrink-0 z-20 shadow-sm relative">
        <h2 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2"><Folder size={16} /> トレーニングフォルダ</h2>
        <div className="flex overflow-x-auto gap-3 pb-2 snap-x hide-scrollbar">
          {folders.map((f) => (
            <button key={f.id} onClick={() => setExpandedFolderId(expandedFolderId === f.id ? null : f.id)} className={`snap-start flex-shrink-0 flex flex-col items-center justify-center p-3 rounded-xl border transition-all min-w-[88px] ${expandedFolderId === f.id ? "bg-blue-50 border-blue-400 shadow-inner" : "bg-white border-gray-200 shadow-sm"}`}>
              {expandedFolderId === f.id ? <FolderOpen size={28} className="text-blue-500 mb-1" /> : <Folder size={28} className="text-gray-400 mb-1" />}
              <span className={`text-xs font-semibold ${expandedFolderId === f.id ? "text-blue-600" : "text-gray-600"} truncate w-full text-center`}>{f.name}</span>
            </button>
          ))}
          <button onClick={handleAddFolder} className="snap-start flex-shrink-0 flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-500 min-w-[88px] hover:bg-gray-200"><Plus size={24} className="mb-1" /><span className="text-xs font-medium">追加</span></button>
        </div>
        {expandedFolderId && (
          <div className="mt-3 bg-gray-50 rounded-xl border border-gray-200 p-3 animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-3 px-1">
              <span className="text-sm font-bold text-gray-700">{folders.find(f => f.id === expandedFolderId)?.name}</span>
              <button onClick={() => handleEditFolder(expandedFolderId)} className="text-gray-400 hover:text-blue-500"><Edit2 size={16} /></button>
            </div>
            <div className="flex gap-2 mb-3 items-center">
              <input type="text" placeholder="URL..." value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} className="flex-1 bg-white border border-gray-300 rounded px-2 py-1.5 text-xs outline-none" />
              <button onClick={() => handleAddLink(expandedFolderId)} className="bg-blue-600 text-white p-1.5 rounded"><LinkIcon size={14} /></button>
              <label className="bg-gray-200 text-gray-700 p-1.5 rounded cursor-pointer"><ImageIcon size={14} /><input type="file" accept="image/*" className="hidden" onChange={(e) => handleAddImage(expandedFolderId, e)} /></label>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {folders.find(f => f.id === expandedFolderId)?.items.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                  {item.type === "image" ? (
                     <img src={item.url} className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80" onClick={() => setSelectedImage(item.url)} />
                  ) : (
                    <div className={`p-2 rounded-full ${item.type === 'youtube' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                      {item.type === 'youtube' ? <Youtube size={16} /> : <LinkIcon size={16} />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{item.type === "image" ? "写真" : item.title}</p>
                    {item.type !== "image" && <a href={item.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline truncate block">{item.url}</a>}
                  </div>
                  <button onClick={() => handleDeleteItem(expandedFolderId, item.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- 中部：カレンダー --- */}
      <div className="flex-shrink-0 bg-white p-4 z-10 border-b border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-bold text-lg flex items-center gap-2"><CalIcon size={18} />{format(selectedDate, "yyyy年 M月", { locale: ja })}</h2>
          <div className="flex gap-2">
            <button onClick={() => setIsGraphOpen(true)} className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded-full flex items-center gap-1 font-bold">
              <TrendingUp size={14}/> グラフ
            </button>
            <button onClick={() => setViewMode(viewMode === "week" ? "month" : "week")} className="text-xs bg-gray-100 border border-gray-200 px-3 py-1 rounded-full text-gray-600">
              {viewMode === "week" ? "月" : "週"}
            </button>
          </div>
        </div>
        {renderCalendar()}
      </div>

      {/* --- 下部：入力エリア --- */}
      <div className="flex-1 bg-gray-50 p-4 flex flex-col min-h-0">
        <div className="mb-4">
          <label className="text-xs font-bold text-gray-500 mb-2 block">{format(selectedDate, "M月d日", { locale: ja })} の記録</label>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {(['胸', '腕', '腹筋', '背中', '尻', '足'] as BodyPart[]).map(p => {
              const isActive = currentRecord.stamps.includes(p);
              return (
                <button key={p} onClick={() => toggleStamp(p)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isActive ? `${partColors[p]} text-white shadow-md scale-105` : "bg-white text-gray-500 border border-gray-200"}`}>
                  {p}
                </button>
              );
            })}
          </div>

          {/* 体重入力 (修正：step="0.1"を追加し、valueのundefinedエラーを回避) */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 mb-3 shadow-sm">
            <div className="bg-purple-100 p-1.5 rounded-full text-purple-600"><Dumbbell size={16}/></div>
            <input 
              type="number" 
              step="0.1" // ここで小数を許可
              placeholder="体重" 
              className="flex-1 text-sm outline-none font-medium"
              value={currentRecord.weight ?? ""} // ここでエラー回避（古いデータ対策）
              onChange={(e) => updateWeight(e.target.value)}
            />
            <span className="text-xs text-gray-400 font-bold mr-2">kg</span>
          </div>
        </div>
        
        <textarea className="flex-1 w-full bg-white border border-gray-200 rounded-lg p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500 pb-20" placeholder="メモ..." value={currentRecord.memo} onChange={(e) => updateMemo(e.target.value)}></textarea>
      </div>

      {/* --- 時計アイコン --- */}
      <button 
        onClick={() => setIsTimerOpen(true)} 
        className={`absolute bottom-6 right-6 bg-gray-900 text-white p-4 rounded-full shadow-2xl hover:bg-gray-800 transition-all z-40 active:scale-95 ${isTimerOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"}`}
      >
        <Clock size={24} />
      </button>

      {/* --- タイマー画面 --- */}
      {isTimerOpen && <div className="absolute inset-0 bg-black/10 z-40" onClick={() => setIsTimerOpen(false)}></div>}
      <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 flex flex-col p-6 transition-transform duration-300 h-[45vh] min-h-[350px] ${isTimerOpen ? "translate-y-0" : "translate-y-full"}`}>
        <div className="flex justify-center mb-6 bg-gray-100 p-1 rounded-full self-center">
          <button onClick={() => setTimerMode("stopwatch")} className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${timerMode === "stopwatch" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"}`}>ウォッチ</button>
          <button onClick={() => setTimerMode("timer")} className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${timerMode === "timer" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"}`}>タイマー</button>
        </div>
        <button onClick={() => setIsTimerOpen(false)} className="absolute top-4 right-4 text-gray-400 p-2 bg-gray-50 rounded-full hover:bg-gray-100"><X size={20}/></button>

        {timerMode === "stopwatch" ? (
          <div className="flex flex-col items-center w-full">
            <div className="bg-gray-900 text-white px-8 py-5 rounded-2xl shadow-inner font-mono text-5xl tracking-widest tabular-nums mb-8 w-full text-center">
              {formatTime(swTime)}
            </div>
            <div className="flex gap-6 w-full justify-center">
              <button onClick={() => setSwTime(0)} className="bg-gray-100 text-gray-600 w-16 h-16 rounded-full flex items-center justify-center shadow-sm active:scale-95"><RotateCcw size={24}/></button>
              <button onClick={() => setSwRunning(!swRunning)} className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-colors ${swRunning ? "bg-orange-500" : "bg-blue-600"}`}>
                {swRunning ? <Pause size={32}/> : <Play size={32} className="ml-1"/>}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full">
            <div className={`px-8 py-4 rounded-2xl shadow-inner font-mono text-5xl tracking-widest tabular-nums mb-4 w-full text-center transition-colors duration-200 ${isTimerFinished ? "bg-red-600 text-white animate-pulse" : "bg-gray-900 text-white"}`}>
              {formatTime(timerTime)}
            </div>
            <div className="flex gap-2 mb-4 items-center">
               <input type="number" value={inputMin} onChange={e => setInputMin(Number(e.target.value))} className="w-12 p-1 text-center border rounded bg-gray-50" />
               <span className="text-sm font-bold">分</span>
               <input type="number" value={inputSec} onChange={e => setInputSec(Number(e.target.value))} className="w-12 p-1 text-center border rounded bg-gray-50" />
               <span className="text-sm font-bold">秒</span>
               <button onClick={handleCustomTimerSet} className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">セット</button>
            </div>
            <div className="flex gap-2 mb-6">
              {[1, 3, 5].map(m => (
                <button key={m} onClick={() => setPresetTimer(m)} className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600 border border-gray-200 hover:bg-gray-200">
                  {m}分
                </button>
              ))}
            </div>
            <div className="flex gap-6 w-full justify-center">
              <button onClick={() => { setTimerTime(timerInitial); setIsTimerFinished(false); setTimerRunning(false); }} className="bg-gray-100 text-gray-600 w-16 h-16 rounded-full flex items-center justify-center shadow-sm active:scale-95"><RotateCcw size={24}/></button>
              <button onClick={() => { if(isTimerFinished) setTimerTime(timerInitial); setIsTimerFinished(false); setTimerRunning(!timerRunning); }} className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-colors ${timerRunning ? "bg-orange-500" : "bg-green-600"}`}>
                {timerRunning ? <Pause size={32}/> : <Play size={32} className="ml-1"/>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}