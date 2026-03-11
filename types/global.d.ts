declare interface qari {
    id: number;
    name: string;
    picUrl?: string;
}

declare interface surah {
    id: number;
    surahNo: number;
    qariId: number;
    name: string;
    url: string;
    durationSeconds?: number;
    fileSizeMb?: number;
    createdAt?: number;
}

declare interface SurahAudioData {
  current: surah & { qariName: string }
  previous_surah?: surah & { qariName: string } | null;
  next_surah?: surah & { qariName: string } | null;
}