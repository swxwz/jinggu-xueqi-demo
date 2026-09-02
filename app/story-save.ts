export type TextScale = 'medium' | 'large' | 'xlarge';
export type VolumeLevel = 'low' | 'medium' | 'high';
export type TrackId = 'morning' | 'mystery' | 'warm';

export type SaveSettings = {
  musicOn: boolean;
  selectedTrackId: TrackId;
  volume: VolumeLevel;
  textScale: TextScale;
  reducedMotion: boolean;
};

export type ChoiceRecord = {
  sceneId: string;
  chapter: string;
  sceneTitle: string;
  tone: string;
  label: string;
  result: string;
  createdAt: string;
};

export type ChoiceCheckpoint<TState> = {
  sceneId: string;
  state: TState;
  trail: ChoiceRecord[];
  lastChoiceResult: string | null;
  chapter: string;
  title: string;
  createdAt: string;
  selectedTone: string;
  selectedLabel: string;
  result: string;
  critical: boolean;
};

export type StorySave<TState> = {
  version: '1.1' | '1.2';
  updatedAt: string;
  currentSceneId: string;
  currentState: TState;
  choiceHistory: ChoiceCheckpoint<TState>[];
  choiceTrail: ChoiceRecord[];
  lastChoiceResult: string | null;
  currentEndingId: string | null;
  unlockedEndings: string[];
  scrollPosition: number;
  settings: SaveSettings;
};

type ReadResult<TState> = {
  available: boolean;
  save: StorySave<TState> | null;
};

const AUTO_SAVE_KEY = 'interactive-fiction:chunshan-tea:auto-save';

export function readStorySave<TState>(): ReadResult<TState> {
  try {
    const raw = window.localStorage.getItem(AUTO_SAVE_KEY);
    if (!raw) return { available: true, save: null };
    const value = JSON.parse(raw) as StorySave<TState>;
    if (!['1.1', '1.2'].includes(value.version) || !value.currentSceneId || !value.settings) {
      return { available: true, save: null };
    }
    return { available: true, save: value };
  } catch {
    return { available: false, save: null };
  }
}

export function writeStorySave<TState>(save: StorySave<TState>): boolean {
  try {
    window.localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
