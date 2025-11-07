export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

export interface FontSettings {
  fontFamily: string;
  isEnabled: boolean;
  textTransform: TextTransform;
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
  | 'CHECK_FEATURE_SUPPORT';

export interface ChromeMessage {
  type: MessageType;
  payload?: any;
} 