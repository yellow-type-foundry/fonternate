export type TextTransform = 'none' | 'lowercase' | 'uppercase';

export interface FontCapabilities {
  ss: number[];              // available ssXX numbers, e.g., [1,2,3,5]
  swashLevels: number[];     // allowed swash levels, e.g., [0,1,2]
  supportsLIGA: boolean;
  supportsDLIG: boolean;
  supportsCALT: boolean;
}

export interface AppState {
  fontName: string;                 // Base font family name (e.g., "Monarch"), without weight suffix
  fontWeight: string;               // Weight suffix (e.g., "regular", "bold"), default "regular"
  textTransform: TextTransform;     // default "none"
  stylisticSets: Set<number>;       // 1..9; multi-select; default empty
  swashLevel: number;               // 0..9; default 0
  liga: boolean;                    // standard ligatures; default true
  dlig: boolean;                    // discretionary ligatures; default false
  calt: boolean;                    // contextual alternates; default true
  textStyles: Set<string>;          // e.g., ['h1', 'h2', 'p']; multi-select; default empty
  capabilities: FontCapabilities;   // detected per selected font
  loading: boolean;                 // while applying or probing features
  error?: string | null;            // UX toast/message
  lastFontName?: string;            // for "Previous Font" (full name with weight)
}

// Legacy types for backward compatibility
export interface FontSettings {
  fontFamily: string;
  isEnabled: boolean;
  textTransform: TextTransform;
  fontWeight: number;
  openTypeFeatures: {
    ss01: boolean;
    ss02: boolean;
    ss03: boolean;
    ss04: boolean;
    ss05: boolean;
    ss06: boolean;
    ss07: boolean;
    ss08: boolean;
    ss09: boolean;
    ss10: boolean;
    ss11: boolean;
    ss12: boolean;
    ss13: boolean;
    ss14: boolean;
    ss15: boolean;
    ss16: boolean;
    ss17: boolean;
    ss18: boolean;
    ss19: boolean;
    ss20: boolean;
    swsh: boolean;
    calt: boolean;
    dlig: boolean;
    liga: boolean;
  };
}

export interface FontTestState {
  settings: FontSettings;
  isLoading: boolean;
  error: string | null;
}

export type MessageType = 
  | 'UPDATE_FONT_SETTINGS'
  | 'GET_FONT_SETTINGS'
  | 'TOGGLE_EXTENSION'
  | 'RESET_FONTS'
  | 'CHECK_FEATURE_SUPPORT'
  | 'CHECK_FONT_WEIGHTS'
  | 'DETECT_CAPABILITIES'
  | 'APPLY_FONT'
  | 'REVERT_TO_PREVIOUS_FONT'
  | 'RESET_ALL';

export interface ChromeMessage {
  type: MessageType;
  payload?: any;
  tabId?: number; // Tab ID when message comes from popup
} 