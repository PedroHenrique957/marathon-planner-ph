import React, { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download, Calendar, Upload, Plus, Trash2, ListVideo, Clock, ArrowRight, CheckCircle2, EyeOff, Eye, Film, FileSpreadsheet, ArrowLeft, CalendarCheck, Bookmark, Save, X } from "lucide-react";
import { supabase } from "./supabaseClient";
import type { Session } from "@supabase/supabase-js";

type Episode = {
  id: string;
  title: string;
  sxe?: string;     
  duration: number;
};

type TimeBlock = { id: string; start: string; end: string; };
type WeekSchedule = {
  dom: TimeBlock[]; seg: TimeBlock[]; ter: TimeBlock[]; 
  qua: TimeBlock[]; qui: TimeBlock[]; sex: TimeBlock[]; sab: TimeBlock[];
};

type SchedulePreset = {
  id: string;
  name: string;
  schedule: WeekSchedule;
};

type ScheduledItem = {
  episodeTitle: string;
  sxe?: string;
  dayName: string;
  dateStr: string;
  timeStr: string;
  duration: number;
};

const dayKeys: (keyof WeekSchedule)[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

const dayNames: Record<keyof WeekSchedule, string> = {
  dom: "Domingo", seg: "Segunda-feira", ter: "Terça-feira", 
  qua: "Quarta-feira", qui: "Quinta-feira", sex: "Sexta-feira", sab: "Sábado"
};

const getMinutesBetween = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  if (isNaN(h1) || isNaN(h2)) return 0;
  
  const startMin = (h1 * 60) + m1;
  let endMin = (h2 * 60) + m2;
  if (endMin < startMin) endMin += 24 * 60;
  return endMin - startMin;
};

const formatMinutesToDisplay = (totalMins: number): string => {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return h > 0 ? `${h}h${m > 0 ? m + 'm' : ''}` : `${m}m`;
};

const parseEpisodeData = (rawText: string) => {
  let text = (rawText || "").replace(/["'`]/g, "").trim();
  let sxe = "";

  const sxeRegex = /([SsT]\d{1,4}[Ee]\d{1,4}|\b\d{1,4}[xX]\d{1,4}\b)/i;
  const sxeMatch = text.match(sxeRegex);
  if (sxeMatch) {
    sxe = sxeMatch[0].toUpperCase().replace('T', 'S');
    text = text.replace(sxeRegex, ""); 
  }

  const dateRegex = /(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/;
  text = text.replace(dateRegex, "");

  let title = text.replace(/^[-\s,]+|[-\s,]+$/g, '').replace(/\s{2,}/g, ' ').trim();
  if (!title) title = (rawText || "").replace(/["'`]/g, "").trim();

  return { title: title || "Episódio", sxe };
};

type ScheduleBuilderProps = {
  schedule: WeekSchedule;
  presets: SchedulePreset[];
  onAddBlock: (day: keyof WeekSchedule) => void;
  onRemoveBlock: (day: keyof WeekSchedule, blockId: string) => void;
  onBlockChange: (day: keyof WeekSchedule, blockId: string, field: 'start' | 'end', value: string) => void;
  onSavePreset: (name: string) => void;
  onLoadPreset: (presetSchedule: WeekSchedule) => void;
  onDeletePreset: (presetId: string) => void;
  onExportPresets: () => void;
  onImportPresets: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

function ScheduleBuilder({ 
  schedule, 
  presets, 
  onAddBlock, 
  onRemoveBlock, 
  onBlockChange, 
  onSavePreset, 
  onLoadPreset, 
  onDeletePreset,
  onExportPresets,
  onImportPresets
}: ScheduleBuilderProps) {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const presetFileInputRef = useRef<HTMLInputElement>(null);

  const totalWeeklyMinutes = (Object.keys(schedule) as Array<keyof WeekSchedule>).reduce((acc, day) => {
    return acc + schedule[day].reduce((dayAcc, block) => dayAcc + getMinutesBetween(block.start, block.end), 0);
  }, 0);

  return (
    <Card className="relative bg-white shadow-sm border-slate-200">
      <CardHeader className="px-6 pt-6 pb-5 border-b bg-slate-50/50">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="flex items-center gap-2.5 text-xl font-bold"><Clock className="w-6 h-6 text-blue-600" /> Grade Semanal</CardTitle>
            <CardDescription className="mt-2 text-sm">Configure a sua rotina ou gerencie os seus presets</CardDescription>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="default" onClick={() => setIsLoadModalOpen(true)} className="h-10 gap-2 px-4 text-sm font-semibold text-blue-700 bg-white border-blue-200 hover:bg-blue-50 shadow-2xs rounded-xl">
              <Bookmark className="w-4 h-4" /> Carregar Preset
            </Button>
            <Button size="default" onClick={() => setIsSaveModalOpen(true)} className="h-10 gap-2 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-2xs rounded-xl">
              <Save className="w-4 h-4" /> Salvar Preset
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        <div className="space-y-4">
          {dayKeys.map((day) => {
            const blocks = schedule[day] || [];
            const dailyMinutes = blocks.reduce((acc, block) => acc + getMinutesBetween(block.start, block.end), 0);
            return (
              <div key={day} className="flex flex-col justify-between gap-4 p-5 transition-colors border border-slate-200 rounded-2xl bg-slate-50/40 hover:border-slate-300 sm:flex-row sm:items-start">
                
                <div className="flex items-center gap-3.5 pt-2 shrink-0">
                  <Label className="text-base font-bold w-36 text-slate-900">{dayNames[day]}</Label>
                  <span className="px-3 py-1 text-sm font-semibold bg-white border rounded-lg text-slate-700 border-slate-200 shadow-2xs">
                    {dailyMinutes > 0 ? formatMinutesToDisplay(dailyMinutes) : 'Livre'}
                  </span>
                </div>

                <div className="flex flex-col items-start flex-1 gap-3 sm:max-w-md">
                  {blocks.map((block) => (
                    <div key={block.id} className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs w-full sm:w-auto">
                      <Input 
                        type="text" 
                        maxLength={5}
                        placeholder="06:00"
                        value={block.start} 
                        onChange={(e) => onBlockChange(day, block.id, 'start', e.target.value)} 
                        className="w-32 px-2 text-base font-bold text-center bg-slate-50/80 h-11 border-slate-200 focus-visible:ring-blue-500"
                      />
                      <span className="text-sm font-semibold text-slate-400">às</span>
                      <Input 
                        type="text" 
                        maxLength={5}
                        placeholder="07:00"
                        value={block.end} 
                        onChange={(e) => onBlockChange(day, block.id, 'end', e.target.value)} 
                        className="w-32 px-2 text-base font-bold text-center bg-slate-50/80 h-11 border-slate-200 focus-visible:ring-blue-500"
                      />
                      <Button variant="ghost" size="icon" onClick={() => onRemoveBlock(day, block.id)} className="w-10 h-10 ml-2 text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0"><Trash2 className="w-5 h-5" /></Button>
                    </div>
                  ))}

                  {blocks.length === 0 && <span className="text-sm italic text-slate-400">Nenhum horário definido.</span>}

                  <Button variant="outline" size="default" onClick={() => onAddBlock(day)} className="h-10 px-4 mt-1 text-sm font-semibold bg-white text-slate-700 hover:text-blue-600 hover:border-blue-200 shadow-2xs rounded-xl">
                    <Plus className="w-4 h-4 mr-1.5 text-blue-600" /> Adicionar horário
                  </Button>
                </div>

              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between pt-6 mt-4 border-t-2 border-slate-100">
          <span className="text-base font-bold text-slate-700">Total na semana</span>
          <span className="px-4 py-1.5 text-xl font-extrabold text-blue-700 rounded-xl bg-blue-50">{formatMinutesToDisplay(totalWeeklyMinutes)}</span>
        </div>
      </CardContent>

      {isSaveModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 duration-200 bg-slate-900/40 backdrop-blur-xs rounded-xl animate-in fade-in">
          <div className="w-full max-w-md p-6 space-y-5 bg-white border shadow-xl rounded-2xl border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2.5 text-base font-bold text-slate-900"><Save className="w-5 h-5 text-blue-600" /> Salvar Novo Preset</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsSaveModalOpen(false)} className="w-8 h-8 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></Button>
            </div>
            <div className="space-y-2.5">
              <Label className="text-sm font-bold text-slate-700">Nome do Preset</Label>
              <Input 
                placeholder="Ex: Rotina de Férias, Semanal Padrão..." 
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="h-12 text-base bg-slate-50"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" size="default" onClick={() => setIsSaveModalOpen(false)} className="px-5 text-sm h-11">Cancelar</Button>
              <Button size="default" onClick={() => {
                if (!presetName.trim()) return alert("Insira um nome para o preset!");
                onSavePreset(presetName.trim());
                setPresetName("");
                setIsSaveModalOpen(false);
              }} className="px-5 text-sm font-semibold text-white bg-blue-600 h-11 hover:bg-blue-700">Salvar Preset</Button>
            </div>
          </div>
        </div>
      )}

      {isLoadModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 duration-200 bg-slate-900/40 backdrop-blur-xs rounded-xl animate-in fade-in">
          <div className="w-full max-w-md p-6 space-y-5 bg-white border shadow-xl rounded-2xl border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2.5 text-base font-bold text-slate-900"><Bookmark className="w-5 h-5 text-blue-600" /> Carregar Preset</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsLoadModalOpen(false)} className="w-8 h-8 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></Button>
            </div>
            
            <div className="pr-1 space-y-3 overflow-y-auto max-h-60">
              {presets.length === 0 ? (
                <p className="py-6 text-sm text-center border border-dashed text-slate-400 bg-slate-50 rounded-xl">Nenhum preset salvo ainda.</p>
              ) : (
                presets.map((preset) => (
                  <div key={preset.id} className="flex items-center justify-between p-3.5 transition-all border bg-slate-50 border-slate-200 rounded-xl hover:border-blue-300">
                    <span className="text-base font-bold text-slate-800 truncate max-w-[220px]">{preset.name}</span>
                    <div className="flex items-center gap-2">
                      <Button size="default" onClick={() => {
                        onLoadPreset(preset.schedule);
                        setIsLoadModalOpen(false);
                      }} className="px-4 text-xs font-semibold text-white bg-blue-600 h-9 hover:bg-blue-700 shadow-2xs">Carregar</Button>
                      <Button variant="ghost" size="icon" onClick={() => onDeletePreset(preset.id)} className="w-9 h-9 text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 space-y-2 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-500">Backup em Ficheiro:</p>
              <input type="file" accept=".json" ref={presetFileInputRef} onChange={onImportPresets} className="hidden" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => presetFileInputRef.current?.click()} className="flex-1 h-10 text-xs font-semibold gap-1.5 bg-slate-50">
                  <Upload className="w-4 h-4 text-blue-600" /> Importar (JSON)
                </Button>
                <Button variant="outline" onClick={onExportPresets} className="flex-1 h-10 text-xs font-semibold gap-1.5 bg-slate-50">
                  <Download className="w-4 h-4 text-blue-600" /> Exportar (JSON)
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="default" onClick={() => setIsLoadModalOpen(false)} className="w-full text-sm font-semibold h-11">Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [inputMethod, setInputMethod] = useState<'manual' | 'csv' | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);

  const [schedule, setSchedule] = useState<WeekSchedule>({
    dom: [{ id: "1", start: "13:30", end: "17:00" }],
    seg: [{ id: "2", start: "06:00", end: "07:00" }],
    ter: [{ id: "3", start: "06:00", end: "07:00" }],
    qua: [{ id: "4", start: "06:00", end: "07:00" }],
    qui: [{ id: "5", start: "06:00", end: "07:00" }],
    sex: [{ id: "6", start: "06:00", end: "07:00" }],
    sab: [{ id: "7", start: "13:30", end: "17:00" }]
  });

  const [presets, setPresets] = useState<SchedulePreset[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [manualTitle, setManualTitle] = useState("");
  const [manualDuration, setManualDuration] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) {
        fetchUserPresets(currentSession.user.id);
      } else {
        loadLocalPresets();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, currentSession: Session | null) => {
      setSession(currentSession);
      if (currentSession) {
        fetchUserPresets(currentSession.user.id);
      } else {
        loadLocalPresets();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserPresets = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_presets')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao carregar presets da nuvem:', error);
    } else if (data) {
      if (data.length === 0) {
        const localSaved = localStorage.getItem("marathon_planner_presets");
        if (localSaved) {
          try {
            const localPresets = JSON.parse(localSaved);
            if (Array.isArray(localPresets) && localPresets.length > 0) {
              for (const p of localPresets) {
                await supabase.from('user_presets').insert([{
                  user_id: userId,
                  name: p.name,
                  schedule: p.schedule
                }]);
              }
              localStorage.removeItem("marathon_planner_presets");
              return fetchUserPresets(userId);
            }
          } catch (e) {
            console.error("Erro ao migrar presets locais:", e);
          }
        }
      }

      const formattedPresets = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        schedule: item.schedule
      }));
      setPresets(formattedPresets);
    }
  };

  const loadLocalPresets = () => {
    try {
      const saved = localStorage.getItem("marathon_planner_presets");
      if (saved) {
        setPresets(JSON.parse(saved));
      } else {
        setPresets([
          {
            id: "default-1",
            name: "Rotina Matinal Rápida",
            schedule: {
              dom: [{ id: "d1", start: "13:30", end: "17:00" }],
              seg: [{ id: "s1", start: "06:00", end: "07:00" }],
              ter: [{ id: "t1", start: "06:00", end: "07:00" }],
              qua: [{ id: "q1", start: "06:00", end: "07:00" }],
              qui: [{ id: "qu1", start: "06:00", end: "07:00" }],
              sex: [{ id: "se1", start: "06:00", end: "07:00" }],
              sab: [{ id: "sa1", start: "13:30", end: "17:00" }]
            }
          }
        ]);
      }
    } catch (e) {}
  };

  const handleEmailPasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput.trim()) {
      return alert("Insere o e-mail e a palavra-passe!");
    }
    
    setLoadingAuth(true);
    
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: emailInput,
      password: passwordInput,
    });

    if (loginError) {
      const { error: signUpError } = await supabase.auth.signUp({
        email: emailInput,
        password: passwordInput,
      });
      
      if (signUpError) {
        alert("Erro de autenticação: " + signUpError.message);
      } else {
        alert("Conta criada e sessão iniciada com sucesso!");
      }
    }
    
    setLoadingAuth(false);
    setEmailInput("");
    setPasswordInput("");
  };

  const handleAddBlock = (day: keyof WeekSchedule) => setSchedule(prev => ({ 
    ...prev, 
    [day]: [...prev[day], { id: Math.random().toString(), start: "", end: "" }] 
  }));

  const handleRemoveBlock = (day: keyof WeekSchedule, blockId: string) => setSchedule(prev => ({ ...prev, [day]: prev[day].filter(block => block.id !== blockId) }));

  const handleBlockChange = (day: keyof WeekSchedule, blockId: string, field: 'start' | 'end', value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    let formatted = digits;
    if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    }

    setSchedule(prev => ({ 
      ...prev, 
      [day]: prev[day].map(block => block.id === blockId ? { ...block, [field]: formatted } : block) 
    }));
  };

  const handleSavePreset = async (name: string) => {
    const scheduleCopy = JSON.parse(JSON.stringify(schedule));

    if (session) {
      const { data, error } = await supabase
        .from('user_presets')
        .insert([{ user_id: session.user.id, name, schedule: scheduleCopy }])
        .select();

      if (error) {
        alert("Erro ao salvar preset na nuvem: " + error.message);
      } else if (data) {
        setPresets(prev => [...prev, { id: data[0].id, name, schedule: scheduleCopy }]);
        alert("Preset guardado na nuvem com sucesso!");
      }
    } else {
      const newPreset: SchedulePreset = {
        id: Math.random().toString(),
        name,
        schedule: scheduleCopy
      };
      const updated = [...presets, newPreset];
      setPresets(updated);
      try {
        localStorage.setItem("marathon_planner_presets", JSON.stringify(updated));
      } catch (e) {}
    }
  };

  const handleLoadPreset = (presetSchedule: WeekSchedule) => {
    setSchedule(JSON.parse(JSON.stringify(presetSchedule)));
  };

  const handleDeletePreset = async (presetId: string) => {
    if (session) {
      const { error } = await supabase
        .from('user_presets')
        .delete()
        .eq('id', presetId);

      if (error) {
        alert("Erro ao apagar preset: " + error.message);
        return;
      }
    }

    const updated = presets.filter(p => p.id !== presetId);
    setPresets(updated);
    if (!session) {
      try {
        localStorage.setItem("marathon_planner_presets", JSON.stringify(updated));
      } catch (e) {}
    }
  };

  const handleExportPresets = () => {
    if (presets.length === 0) return alert("Não há presets para exportar!");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(presets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "maratona_presets.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportPresets = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = JSON.parse(content);
        if (Array.isArray(imported)) {
          const merged = [...presets];
          imported.forEach((p: SchedulePreset) => {
            if (!merged.some(existing => existing.name === p.name)) {
              merged.push(p);
            }
          });
          setPresets(merged);
          if (!session) {
            localStorage.setItem("marathon_planner_presets", JSON.stringify(merged));
          }
          alert("Presets importados com sucesso!");
        } else {
          alert("O formato do ficheiro de presets é inválido.");
        }
      } catch (err) {
        alert("Erro ao ler o ficheiro de presets.");
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = "";
  };

  const totalWeeklyMinutes = (Object.keys(schedule) as Array<keyof WeekSchedule>).reduce((acc, day) => {
    return acc + schedule[day].reduce((dayAcc, block) => dayAcc + getMinutesBetween(block.start, block.end), 0);
  }, 0);

  const totalContentMinutes = episodes.reduce((acc, curr) => acc + (curr.duration || 0), 0);

  const handleAddManual = () => {
    if (!manualTitle || !manualDuration) return;
    const { title, sxe } = parseEpisodeData(manualTitle);
    
    setEpisodes(prev => [...prev, { 
      id: Math.random().toString(), 
      title, 
      sxe, 
      duration: Number(manualDuration) || 30 
    }]);
    setManualTitle(""); 
    setManualDuration("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;
        
        const lines = text.split(/\r\n|\n/);
        const importedEpisodes: Episode[] = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const lowerLine = line.toLowerCase();
          if (lowerLine.startsWith("ordem") || lowerLine.startsWith("serie") || lowerLine.startsWith("titulo")) {
            continue;
          }

          const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^["']\vert{}["']$/g, "").trim());
          if (cols.length === 0) continue;

          const numbers = cols.map(c => Number(c)).filter(n => !isNaN(n) && n > 0);

          if (numbers.length > 0) {
            const duration = numbers[numbers.length - 1];
            const textCols = cols.filter(c => isNaN(Number(c)) && !c.startsWith('http'));
            const rawText = textCols.join(" ");

            const { title, sxe: parsedSxe } = parseEpisodeData(rawText);

            let finalSxe = parsedSxe;
            if (!finalSxe && numbers.length >= 3) {
              const s = numbers[numbers.length - 3];
              const ep = numbers[numbers.length - 2];
              if (s < 100 && ep < 1000) {
                finalSxe = `S${String(s).padStart(2, '0')}E${String(ep).padStart(2, '0')}`;
              }
            }

            importedEpisodes.push({
              id: Math.random().toString(),
              title: title || `Episódio ${importedEpisodes.length + 1}`,
              sxe: finalSxe || undefined,
              duration: duration > 0 ? duration : 30
            });
          }
        }

        if (importedEpisodes.length > 0) {
          setEpisodes(prev => [...prev, ...importedEpisodes]);
        } else {
          alert("Nenhum episódio válido encontrado no arquivo.");
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao processar o arquivo CSV.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const generateChronogram = (): ScheduledItem[] => {
    if (episodes.length === 0 || totalWeeklyMinutes === 0) return [];

    const scheduleList: ScheduledItem[] = [];
    let episodeIndex = 0;
    
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const todayRef = new Date();
    todayRef.setHours(0, 0, 0, 0);
    const nowMinutes = (new Date().getHours() * 60) + new Date().getMinutes();

    let safetyCounter = 0;

    while (episodeIndex < episodes.length && safetyCounter < 730) {
      const dayOfWeekIndex = currentDate.getDay(); 
      const currentDayKey = dayKeys[dayOfWeekIndex];
      const dayBlocks = schedule[currentDayKey] || [];

      const dateStr = currentDate.toLocaleDateString('pt-BR');
      const dayName = dayNames[currentDayKey];
      const isToday = currentDate.getTime() === todayRef.getTime();

      for (const block of dayBlocks) {
        if (!block.start || !block.end || episodeIndex >= episodes.length) continue;

        let [startH, startM] = block.start.split(':').map(Number);
        let blockStartMinutes = (startH * 60) + startM;
        let blockEndMinutes = (Number(block.end.split(':')[0]) * 60) + Number(block.end.split(':')[1]);
        if (blockEndMinutes < blockStartMinutes) blockEndMinutes += 24 * 60;

        if (isToday && blockEndMinutes <= nowMinutes) {
          continue;
        }

        let currentBlockMinutes = blockStartMinutes;
        if (isToday && nowMinutes > blockStartMinutes && nowMinutes < blockEndMinutes) {
          currentBlockMinutes = nowMinutes;
        }

        while (episodeIndex < episodes.length && currentBlockMinutes < blockEndMinutes) {
          const ep = episodes[episodeIndex];
          const epDuration = ep.duration || 30;

          const h = Math.floor(currentBlockMinutes / 60) % 24;
          const m = currentBlockMinutes % 60;
          const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

          scheduleList.push({
            episodeTitle: ep.title,
            sxe: ep.sxe,
            dayName,
            dateStr,
            timeStr,
            duration: epDuration
          });

          currentBlockMinutes += epDuration;
          episodeIndex++;
        }
      }

      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);
      currentDate = nextDate;

      safetyCounter++;
    }

    return scheduleList;
  };

  const fullChronogram = generateChronogram();

  const handleExportCSV = () => {
    if (fullChronogram.length === 0) return alert("A agenda está vazia!");

    let csvContent = "\uFEFFOrdem,Serie,Episodio,Duracao(min),Data,Horario,DiaSemana\n";
    
    fullChronogram.forEach((item, index) => {
      const safeTitle = (item.episodeTitle || "").replace(/,/g, " "); 
      csvContent += `${index + 1},${safeTitle},${item.sxe || ""},${item.duration},${item.dateStr},${item.timeStr},${item.dayName}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "agenda_cronologica_maratona.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen py-10 overflow-x-hidden font-sans bg-slate-100 text-slate-900">
      
      {/* Barra de Autenticação Responsiva no Topo */}
      <div className="flex justify-end max-w-xl px-4 mx-auto mb-6 md:max-w-3xl lg:max-w-6xl">
        {session ? (
          <div className="flex items-center justify-between w-full gap-3 px-4 py-2 bg-white border sm:justify-end rounded-xl border-slate-200 shadow-2xs sm:w-auto">
            <span className="text-xs font-semibold text-slate-600 truncate max-w-[200px]">
              {session.user.email}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => supabase.auth.signOut()} 
              className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 shrink-0"
            >
              Sair
            </Button>
          </div>
        ) : (
          <form onSubmit={handleEmailPasswordAuth} className="flex flex-col items-stretch w-full gap-2 p-2 bg-white border shadow-sm sm:flex-row sm:items-center rounded-2xl border-slate-200 sm:w-auto">
            <Input 
              type="email" 
              placeholder="O seu e-mail..." 
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full h-10 text-xs sm:h-9 sm:w-44 bg-slate-50 border-slate-200"
            />
            <Input 
              type="password" 
              placeholder="Palavra-passe..." 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full h-10 text-xs sm:h-9 sm:w-36 bg-slate-50 border-slate-200"
            />
            <Button 
              type="submit"
              size="sm" 
              disabled={loadingAuth}
              className="w-full h-10 px-4 text-xs font-semibold text-white bg-blue-600 sm:h-9 hover:bg-blue-700 sm:w-auto"
            >
              {loadingAuth ? "A entrar..." : "Entrar / Criar"}
            </Button>
          </form>
        )}
      </div>

      {step === 1 && (
        <div className="max-w-xl px-4 mx-auto space-y-8 duration-300 animate-in fade-in">
          <div className="flex flex-col items-center justify-center pt-6 space-y-4 text-center">
            <div className="flex items-center justify-center w-20 h-20 p-3 mb-2 bg-blue-100 rounded-full shadow-inner">
              <img 
                src="/logo-maratona.png" 
                alt="Logo Maratona" 
                className="object-contain w-12 h-12" 
              />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Maratona de Filmes e Séries</h1>
            <p className="max-w-md text-lg text-slate-500">Olá, como prefere adicionar os conteúdos que deseja assistir?</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div onClick={() => setInputMethod('manual')} className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-5 bg-white shadow-sm hover:border-blue-500 ${inputMethod === 'manual' ? 'border-blue-600 ring-2 ring-blue-100 bg-blue-50/20' : 'border-slate-200'}`}>
              <div className="p-4 text-blue-600 bg-blue-50 rounded-xl"><Film className="w-7 h-7" /></div>
              <div className="flex-1"><h3 className="text-lg font-bold text-slate-800">Adicionar Manualmente</h3><p className="text-sm text-slate-500">Insira o título e a duração item por item.</p></div>
            </div>

            <div onClick={() => setInputMethod('csv')} className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-5 bg-white shadow-sm hover:border-blue-500 ${inputMethod === 'csv' ? 'border-blue-600 ring-2 ring-blue-100 bg-blue-50/20' : 'border-slate-200'}`}>
              <div className="p-4 text-indigo-600 bg-indigo-50 rounded-xl"><FileSpreadsheet className="w-7 h-7" /></div>
              <div className="flex-1"><h3 className="text-lg font-bold text-slate-800">Importar Arquivo CSV</h3><p className="text-sm text-slate-500">Carregue a sua lista inteira de uma só vez.</p></div>
            </div>
          </div>

          {inputMethod === 'csv' && (
            <div className="p-6 space-y-4 bg-white border rounded-2xl border-slate-200 animate-in fade-in">
              <Label className="text-base font-bold text-slate-700">Selecione o seu arquivo CSV</Label>
              <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <Button variant="outline" className="w-full gap-2 text-base border-2 border-dashed h-14 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-5 h-5" /> Escolher arquivo do computador
              </Button>
              {episodes.length > 0 && <p className="text-sm font-semibold text-center text-green-600">✓ {episodes.length} episódios carregados com sucesso!</p>}
            </div>
          )}

          {inputMethod === 'manual' && (
            <div className="p-6 space-y-4 bg-white border rounded-2xl border-slate-200 animate-in fade-in">
              <Label className="text-base font-bold text-slate-700">Adicionar à Lista</Label>
              <div className="flex gap-3">
                <Input placeholder="Ex: The Simpsons S01E01" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} className="h-12 text-base bg-white"/>
                <Input type="number" placeholder="Min" value={manualDuration} onChange={(e) => setManualDuration(e.target.value)} className="h-12 text-base bg-white w-28"/>
                <Button onClick={handleAddManual} className="h-12 px-6 text-white bg-slate-900"><Plus className="w-5 h-5" /></Button>
              </div>
              <p className="text-sm text-slate-400">Total adicionado até agora: <strong className="text-slate-700">{episodes.length} itens</strong></p>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button size="lg" disabled={!inputMethod || episodes.length === 0} onClick={() => setStep(2)} className="w-full h-16 gap-3 text-lg font-bold text-white bg-blue-600 shadow-lg hover:bg-blue-700 shadow-blue-600/20">
              Avançar para Grade de Horários <ArrowRight className="w-6 h-6" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-3xl px-4 mx-auto space-y-6 duration-300 animate-in fade-in">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(1)} className="gap-2 text-base text-slate-600"><ArrowLeft className="w-5 h-5" /> Voltar</Button>
            <span className="text-sm font-bold tracking-wider uppercase text-slate-400">Etapa 2 de 3</span>
          </div>

          <div className="mb-4 space-y-2 text-center">
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Defina a sua rotina</h1>
            <p className="text-base text-slate-500">Informe os horários livres em que pretende assistir conteúdos durante a semana.</p>
          </div>

          <ScheduleBuilder 
            schedule={schedule} 
            presets={presets}
            onAddBlock={handleAddBlock} 
            onRemoveBlock={handleRemoveBlock} 
            onBlockChange={handleBlockChange} 
            onSavePreset={handleSavePreset}
            onLoadPreset={handleLoadPreset}
            onDeletePreset={handleDeletePreset}
            onExportPresets={handleExportPresets}
            onImportPresets={handleImportPresets}
          />

          <div className="flex justify-end pt-4">
            <Button size="lg" onClick={() => setStep(3)} className="w-full h-16 gap-3 text-lg font-bold text-white bg-blue-600 shadow-lg hover:bg-blue-700 shadow-blue-600/20">
              Gerar Cronograma Final <ArrowRight className="w-6 h-6" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-6xl px-4 mx-auto duration-300 animate-in fade-in">
          
          <div className="flex flex-col justify-between gap-4 mb-8 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="p-3.5 text-white bg-blue-600 shadow-sm rounded-xl"><Calendar className="w-8 h-8" /></div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Maratona de Séries</h1>
                <div className="flex items-center gap-2 text-base font-medium text-green-600"><CheckCircle2 className="w-5 h-5" /> Cronograma gerado com sucesso!</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" size="default" onClick={() => setStep(2)} className="px-4 text-sm font-semibold bg-white h-11 text-slate-700 border-slate-200">Ajustar Horários</Button>
              <Button variant="outline" size="default" onClick={() => setShowSchedule(!showSchedule)} className="px-4 text-sm font-semibold bg-white h-11 text-slate-700 border-slate-200">
                {showSchedule ? <><EyeOff className="w-4 h-4 mr-2 text-slate-400" /> Esconder Grade</> : <><Eye className="w-4 h-4 mr-2 text-blue-600" /> Ver Grade</>}
              </Button>
            </div>
          </div>

          <div className={`grid gap-6 transition-all duration-500 ${showSchedule ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1 max-w-4xl mx-auto'}`}>
            
            {showSchedule && (
              <div className="space-y-6 lg:col-span-5">
                <ScheduleBuilder 
                  schedule={schedule} 
                  presets={presets}
                  onAddBlock={handleAddBlock} 
                  onRemoveBlock={handleRemoveBlock} 
                  onBlockChange={handleBlockChange} 
                  onSavePreset={handleSavePreset}
                  onLoadPreset={handleLoadPreset}
                  onDeletePreset={handleDeletePreset}
                  onExportPresets={handleExportPresets}
                  onImportPresets={handleImportPresets}
                />
              </div>
            )}

            <div className={`space-y-6 ${showSchedule ? 'lg:col-span-7' : 'w-full'} transition-all duration-300`}>
              
              <Card className="bg-white shadow-sm border-slate-200">
                <CardContent className="flex flex-col items-center justify-between gap-4 p-6 sm:flex-row">
                  <div>
                    <h3 className="text-sm font-bold tracking-wider uppercase text-slate-400">Resumo da Maratona</h3>
                    <p className="text-2xl font-bold text-slate-800">{episodes.length} Episódios programados</p>
                    <p className="text-sm text-slate-500">Tempo total de conteúdo: {formatMinutesToDisplay(totalContentMinutes)}</p>
                  </div>
                  <Button variant="outline" size="default" onClick={() => setStep(1)} className="px-4 text-sm font-semibold h-11">
                    Adicionar mais itens
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm flex flex-col h-[560px] bg-white">
                <CardHeader className="px-6 py-4 border-b bg-slate-50/50">
                  <CardTitle className="flex items-center gap-2.5 text-xl font-bold"><CalendarCheck className="w-6 h-6 text-blue-600" /> Agenda Detalhada</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-5 overflow-y-auto">
                  {fullChronogram.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-3 text-slate-400">
                      <ListVideo className="w-16 h-16 opacity-20" />
                      <p className="text-base text-center">As faixas horárias de hoje já passaram ou a grade está vazia. O sistema ajustou para o próximo dia útil.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {fullChronogram.map((item, index) => (
                        <div key={index} className="flex flex-col justify-between gap-3 p-4 transition-all bg-white border shadow-sm sm:flex-row sm:items-center rounded-2xl border-slate-100 hover:border-blue-200 group">
                          
                          <div className="flex items-center flex-1 gap-4 overflow-hidden">
                            <span className="text-sm font-bold w-7 text-slate-400 shrink-0">{index + 1}.</span>
                            
                            <div className="flex flex-col flex-1 gap-2 overflow-hidden sm:flex-row sm:items-center">
                              <span className="text-base font-bold truncate text-slate-800">{item.episodeTitle}</span>
                              
                              {item.sxe && (
                                <span className="px-2.5 py-1 text-xs font-bold tracking-wider text-blue-700 bg-blue-100 rounded-lg border border-blue-200 w-fit">
                                  {item.sxe}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-2.5 text-sm font-medium border rounded-xl shrink-0 text-slate-600 bg-slate-50 border-slate-200">
                            <span className="font-bold text-blue-700 capitalize">{item.dayName}</span>
                            <span className="text-slate-300">|</span>
                            <span>{item.dateStr}</span>
                            <span className="text-slate-300">|</span>
                            <span className="font-extrabold text-slate-900 bg-white px-2.5 py-1 rounded-lg shadow-2xs">{item.timeStr}</span>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="p-5 border-t bg-slate-50/80">
                   <Button onClick={handleExportCSV} className="w-full gap-3 text-lg font-bold text-white shadow-md h-14 bg-slate-900 hover:bg-slate-800 rounded-xl">
                      <Download className="w-6 h-6" /> Exportar Maratona Detalhada (CSV)
                   </Button>
                </CardFooter>
              </Card>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}