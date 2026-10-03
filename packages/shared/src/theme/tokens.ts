export interface ThemePalette {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  fg: string;
  muted: string;
  primary: string;
  primaryFg: string;
  accent: string;
  info: string;
  success: string;
  warning: string;
  danger: string;
}

export const lightTheme: ThemePalette = {
  bg: '#F3F1EC',
  surface: '#FBFAF7',
  surface2: '#EEEBE3',
  border: '#E0DBCF',
  fg: '#202B27',
  muted: '#68736D',
  primary: '#3E7C6D',
  primaryFg: '#FFFFFF',
  accent: '#C68A3A',
  info: '#4F7FA8',
  success: '#4F8A5B',
  warning: '#C98B2E',
  danger: '#C4574A',
};

export const darkTheme: ThemePalette = {
  bg: '#141C1A',
  surface: '#1B2623',
  surface2: '#223029',
  border: '#2C3B36',
  fg: '#E7EDE9',
  muted: '#93A39B',
  primary: '#6DB4A2',
  primaryFg: '#0F1A17',
  accent: '#E0AE62',
  info: '#7FA8CC',
  success: '#7DBB8A',
  warning: '#E2B35C',
  danger: '#E3857A',
};

export type ThemeMode = 'light' | 'dark';

export const tokens = {
  light: lightTheme,
  dark: darkTheme,
};

export function getConfidenceColor(confidence: 'CONFIRMED' | 'PROBABLE' | 'UNVERIFIED', isDark = false): string {
  const current = isDark ? darkTheme : lightTheme;
  switch (confidence) {
    case 'CONFIRMED':
      return current.success;
    case 'PROBABLE':
      return current.warning;
    case 'UNVERIFIED':
    default:
      return current.danger;
  }
}

export const DEFAULT_MAP_STYLES = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
};
