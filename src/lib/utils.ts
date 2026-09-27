// src/utils.ts

export type Episode = {
  id: string;
  title: string;
  sxe?: string;     
  duration: number;
};

export type TimeBlock = { id: string; start: string; end: string; };
export type WeekSchedule = {
  dom: TimeBlock[]; seg: TimeBlock[]; ter: TimeBlock[]; 
  qua: TimeBlock[]; qui: TimeBlock[]; sex: TimeBlock[]; sab: TimeBlock[];
};

export type SchedulePreset = {
  id: string;
  name: string;
  schedule: WeekSchedule;
};

export type ScheduledItem = {
  episodeTitle: string;
  sxe?: string;
  dayName: string;
  dateStr: string;
  timeStr: string;
  duration: number;
};

export const dayKeys: (keyof WeekSchedule)[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

export const dayNames: Record<keyof WeekSchedule, string> = {
  dom: "Domingo", seg: "Segunda-feira", ter: "Terça-feira", 
  qua: "Quarta-feira", qui: "Quinta-feira", sex: "Sexta-feira", sab: "Sábado"
};

export const getMinutesBetween = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  if (isNaN(h1) || isNaN(h2)) return 0;
  
  const startMin = (h1 * 60) + m1;
  let endMin = (h2 * 60) + m2;
  if (endMin < startMin) endMin += 24 * 60;
  return endMin - startMin;
};

export const formatMinutesToDisplay = (totalMins: number): string => {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return h > 0 ? `${h}h${m > 0 ? m + 'm' : ''}` : `${m}m`;
};

export const parseEpisodeData = (rawText: string) => {
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