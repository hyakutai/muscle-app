"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Youtube, Link as LinkIcon, Calendar as CalIcon, Folder, FolderOpen, Plus, Image as ImageIcon, Trash2, Edit2, X, Clock } from "lucide-react";
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";

// --- 型定義 ---
type MediaItem = { id: string; title: string; url: string; type: "youtube" | "link" | "image"; };
type FolderType = { id: string; name: string; items: MediaItem[]; };
type BodyPart = '胸' | '腕' | '腹筋' | '背中' | '尻' | '足';
type TrainingRecord = { date: string; memo: string; stamps: BodyPart[]; };

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
  const [isLoaded, setIsLoaded] = useState(false); // データ読み込み完了フラグ

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  
  const [folders, setFolders] = useState<FolderType[]>(initialFolders);
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [records, setRecords] = useState<Record<string, TrainingRecord>>({});
  
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);

  // --- データの読み込み (初回起動時のみ) ---
  useEffect(() => {
    const savedFolders = localStorage.getItem("muscleAppFolders");
    const savedRecords = localStorage.getItem("muscleAppRecords");
    
    if (savedFolders) setFolders(JSON.parse(savedFolders));
    if (savedRecords) setRecords(JSON.parse(savedRecords));
    
    setIsLoaded(true); // 読み込み完了
  }, []);

  // --- データの自動保存 (データが変更されるたび) ---
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("muscleAppFolders", JSON.stringify(folders));
    } catch (e) {
      alert("保存容量の上限に達しました。不要な写真を削除してください。");
    }
  }, [folders, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("muscleAppRecords", JSON.stringify(records));
  }, [records, isLoaded]);

  // タイマー
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) interval = setInterval(() => setTime(t => t + 10), 10);
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const ms10 = Math.floor((ms % 1000) / 10);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms10.toString().padStart(2, "0")}`;
  };

  // --- フォルダ操作 ---
  const handleAddFolder = () => {
    const folderName = window.prompt("新しいフォルダ名を入力してください:");
    if (folderName && folderName.trim() !== "") setFolders([...folders, { id: Date.now().toString(), name: folderName, items: [] }]);
  };

  const handleEditFolder = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    const newName = window.prompt("フォルダ名を変更:", folder.name);
    if (newName && newName.trim() !== "") setFolders(folders.map(f => f.id === folderId ? { ...f, name: newName } : f));
  };

  const handleAddLink = (folderId: string) => {
    if (!newLinkUrl) return;
    const isYt = newLinkUrl.includes("youtube") || newLinkUrl.includes("youtu.be");
    const newItem: MediaItem = { id: Date.now().toString(), title: isYt ? "YouTube動画" : "参考リンク", url: newLinkUrl, type: isYt ? "youtube" : "link" };
    setFolders(folders.map(f => f.id === folderId ? { ...f, items: [...f.items, newItem] } : f));
    setNewLinkUrl(""); 
  };

  const handleAddImage = (folderId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const newItem: MediaItem = { id: Date.now().toString(), title: file.name, url: reader.result as string, type: "image" };
      setFolders(folders.map(f => f.id === folderId ? { ...f, items: [...f.items, newItem] } : f));
    };
    reader.readAsDataURL(file); 
  };

  const handleDeleteItem = (folderId: string, itemId: string) => {
    if(window.confirm("このアイテムを削除しますか？")) setFolders(folders.map(f => f.id === folderId ? { ...f, items: f.items.filter(i => i.id !== itemId) } : f));
  };

  // --- スタンプ・メモ ---
  const currentDateKey = format(selectedDate, "yyyy-MM-dd");
  const currentRecord = records[currentDateKey] || { memo: "", stamps: [], date: currentDateKey };

  const toggleStamp = (part: BodyPart) => {
    const newStamps = currentRecord.stamps.includes(part) ? currentRecord.stamps.filter(p => p !== part) : [...currentRecord.stamps, part];
    setRecords({ ...records, [currentDateKey]: { ...currentRecord, stamps: newStamps } });
  };
  const updateMemo = (text: string) => {
    setRecords({ ...records, [currentDateKey]: { ...currentRecord, memo: text } });
  };

  const renderCalendar = () => {
    const start = viewMode === "week" ? startOfWeek(selectedDate, { weekStartsOn: 1 }) : startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 });
    const end = viewMode === "week" ? addDays(start, 6) : endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 });
    const days = [];
    let day = start;
    while (day <= end) { days.push(day); day = addDays(day, 1); }

    return (
      <div className={`grid grid-cols-7 gap-1 text-center ${viewMode === "month" ? "text-sm" : "text-base"}`}>
        {["月", "火", "水", "木", "金", "土", "日"].map(d => <div key={d} className="text-gray-400 text-xs py-1">{d}</div>)}
        {days.map((d, idx) => {
          const dKey = format(d, "yyyy-MM-dd");
          const rec = records[dKey];
          const isSelected = isSameDay(d, selectedDate);
          return (
            <div key={idx} onClick={() => setSelectedDate(d)} className={`p-2 rounded-lg cursor-pointer flex flex-col items-center justify-start relative min-h-[50px] ${!isSameMonth(d, selectedDate) && viewMode === "month" ? "text-gray-300" : "text-gray-800"} ${isSelected ? "bg-blue-600 text-white shadow-lg" : "hover:bg-gray-100"}`}>
              <span className="mb-1">{format(d, "d")}</span>
              {rec?.stamps?.length > 0 && (
                <div className="flex flex-wrap justify-center gap-[2px] w-full px-1">
                  {rec.stamps.map(part => <div key={part} className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : partColors[part]}`}></div>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Next.jsの仕様上、ローカルデータ読み込み前に画面を描画するとエラーになるため、ロード完了を待つ
  if (!isLoaded) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>;

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 text-gray-900 font-sans overflow-hidden border-x border-gray-200 shadow-2xl relative">
      
      {/* 画像ポップアップ */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-full max-h-full flex flex-col items-center">
            <button onClick={() => setSelectedImage(null)} className="absolute -top-12 right-0 bg-white/20 text-white p-2 rounded-full hover:bg-white/40"><X size={24} /></button>
            <img src={selectedImage} alt="拡大画像" className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}

      {/* 上部：フォルダエリア */}
      <div className="bg-white p-4 border-b border-gray-200 flex-shrink-0 z-20 shadow-sm relative">
        <h2 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2"><Folder size={16} /> トレーニングフォルダ</h2>
        <div className="flex overflow-x-auto gap-3 pb-2 snap-x hide-scrollbar">
          {folders.map((folder) => (
            <button key={folder.id} onClick={() => setExpandedFolderId(expandedFolderId === folder.id ? null : folder.id)} className={`snap-start flex-shrink-0 flex flex-col items-center justify-center p-3 rounded-xl border transition-all min-w-[88px] ${expandedFolderId === folder.id ? "bg-blue-50 border-blue-400 shadow-inner" : "bg-white border-gray-200 shadow-sm hover:bg-gray-50"}`}>
              {expandedFolderId === folder.id ? <FolderOpen size={28} className="text-blue-500 mb-1" /> : <Folder size={28} className="text-gray-400 mb-1" />}
              <span className={`text-xs font-semibold ${expandedFolderId === folder.id ? "text-blue-600" : "text-gray-600"} truncate w-full text-center`}>{folder.name}</span>
            </button>
          ))}
          <button onClick={handleAddFolder} className="snap-start flex-shrink-0 flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-500 min-w-[88px] hover:bg-gray-200"><Plus size={24} className="mb-1" /><span className="text-xs font-medium">追加</span></button>
        </div>

        {expandedFolderId && (
          <div className="mt-3 bg-gray-50 rounded-xl border border-gray-200 p-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex justify-between items-center mb-3 px-1">
              <span className="text-sm font-bold text-gray-700">{folders.find(f => f.id === expandedFolderId)?.name}</span>
              <button onClick={() => handleEditFolder(expandedFolderId)} className="text-gray-400 hover:text-blue-500 p-1"><Edit2 size={16} /></button>
            </div>
            <div className="flex gap-2 mb-3 items-center">
              <input type="text" placeholder="URLを入力..." value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} className="flex-1 bg-white border border-gray-300 rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
              <button onClick={() => handleAddLink(expandedFolderId)} className="bg-blue-600 text-white p-1.5 rounded"><LinkIcon size={14} /></button>
              <label className="bg-gray-200 text-gray-700 p-1.5 rounded cursor-pointer"><ImageIcon size={14} /><input type="file" accept="image/*" className="hidden" onChange={(e) => handleAddImage(expandedFolderId, e)} /></label>
            </div>
            {folders.find(f => f.id === expandedFolderId)?.items.length === 0 ? (
              <p className="text-xs text-center text-gray-400 py-4">アイテムがありません</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {folders.find(f => f.id === expandedFolderId)?.items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 shadow-sm group">
                    {item.type === "image" ? (
                       <img src={item.url} alt="saved" className="w-12 h-12 object-cover rounded bg-gray-100 border flex-shrink-0 cursor-pointer hover:opacity-80" onClick={() => setSelectedImage(item.url)} />
                    ) : (
                      <div className={`p-2 rounded-full flex-shrink-0 ${item.type === 'youtube' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {item.type === 'youtube' ? <Youtube size={16} /> : <LinkIcon size={16} />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{item.type === "image" ? "保存した写真" : item.title}</p>
                      {item.type !== "image" && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline truncate block">{item.url}</a>}
                    </div>
                    <button onClick={() => handleDeleteItem(expandedFolderId, item.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 中部：カレンダー */}
      <div className="flex-shrink-0 bg-white p-4 z-10 border-b border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-bold text-lg flex items-center gap-2"><CalIcon size={18} />{format(selectedDate, "yyyy年 M月", { locale: ja })}</h2>
          <button onClick={() => setViewMode(viewMode === "week" ? "month" : "week")} className="text-xs bg-gray-100 border border-gray-200 px-3 py-1 rounded-full text-gray-600">
            {viewMode === "week" ? "月表示へ" : "週表示へ"}
          </button>
        </div>
        {renderCalendar()}
      </div>

      {/* 下部：スタンプ＆メモ */}
      <div className="flex-1 bg-gray-50 p-4 flex flex-col min-h-0">
        <div className="mb-4">
          <label className="text-xs font-bold text-gray-500 mb-2 block">{format(selectedDate, "M月d日", { locale: ja })} の記録</label>
          <div className="flex flex-wrap gap-2">
            {(['胸', '腕', '腹筋', '背中', '尻', '足'] as BodyPart[]).map(part => {
              const isActive = currentRecord.stamps.includes(part);
              return (
                <button key={part} onClick={() => toggleStamp(part)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isActive ? `${partColors[part]} text-white shadow-md scale-105` : "bg-white text-gray-500 border border-gray-200"}`}>
                  {part}
                </button>
              );
            })}
          </div>
        </div>
        <textarea className="flex-1 w-full bg-white border border-gray-200 rounded-lg p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500 pb-20" placeholder="今日の種目、重量など..." value={currentRecord.memo} onChange={(e) => updateMemo(e.target.value)}></textarea>
      </div>

      {/* 時計アイコン */}
      <button 
        onClick={() => setIsTimerOpen(true)} 
        className={`absolute bottom-6 right-6 bg-gray-900 text-white p-4 rounded-full shadow-2xl hover:bg-gray-800 transition-all z-40 active:scale-95 ${isTimerOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"}`}
      >
        <Clock size={24} />
      </button>

      {/* タイマー画面 (ボトムシート) */}
      {isTimerOpen && <div className="absolute inset-0 bg-black/10 z-40" onClick={() => setIsTimerOpen(false)}></div>}
      
      <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 flex flex-col items-center justify-center p-6 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] h-[33vh] min-h-[250px] ${isTimerOpen ? "translate-y-0" : "translate-y-full"}`}>
        <button onClick={() => setIsTimerOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 bg-gray-100 rounded-full"><X size={20} /></button>
        <h3 className="text-sm font-bold text-gray-500 mb-4 absolute top-6 left-6 flex items-center gap-2"><Clock size={16} /> ストップウォッチ</h3>
        <div className="bg-gray-900 text-white px-8 py-4 rounded-2xl shadow-inner font-mono text-4xl tracking-wider tabular-nums mb-6 w-full text-center">{formatTime(time)}</div>
        <div className="flex gap-6">
          <button onClick={() => setTime(0)} className="bg-gray-100 border border-gray-200 text-gray-600 p-4 rounded-full shadow-sm hover:bg-gray-200 active:scale-95 transition-all"><RotateCcw size={28} /></button>
          <button onClick={() => setIsRunning(!isRunning)} className={`p-4 rounded-full shadow-lg text-white active:scale-95 transition-all ${isRunning ? "bg-orange-500 hover:bg-orange-600 shadow-orange-500/30" : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/30"}`}>
            {isRunning ? <Pause size={28} /> : <Play size={28} />}
          </button>
        </div>
      </div>

    </div>
  );
}