/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111A14',
    // Fondo con un toque de verde: las tarjetas blancas se separan sin necesidad de sombras.
    background: '#F4F7F4',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E4ECE6',
    border: '#D5DDD7',
    // 6,2:1 sobre el fondo y 6,7:1 sobre las tarjetas (WCAG AA).
    textSecondary: '#55615A',
    // Verde de acción; contraste 5,3:1 con onPrimary (WCAG AA para texto normal).
    primary: '#1E7A4C',
    onPrimary: '#FFFFFF',
    // Verde suave de lo seleccionado; su texto da 8,1:1.
    primarySoft: '#DCEFE4',
    onPrimarySoft: '#14532D',
    // Rojo de error; 5,6:1 sobre el fondo claro.
    danger: '#C62828',
    // Tonos de las insignias de estado: fondo suave y texto con contraste de al menos 7:1.
    successBg: '#DCEFE4',
    successText: '#14532D',
    warningBg: '#FBE9C6',
    warningText: '#6B4000',
    dangerBg: '#FADADA',
    dangerText: '#8E1B1B',
    infoBg: '#DCE8FA',
    infoText: '#123F7A',
    neutralBg: '#E4ECE6',
    neutralText: '#35423A',
  },
  dark: {
    text: '#F2F5F3',
    background: '#0E1411',
    backgroundElement: '#18201B',
    backgroundSelected: '#26322A',
    border: '#2E3A32',
    // 8,6:1 sobre el fondo oscuro.
    textSecondary: '#A9B5AD',
    // En oscuro el verde se aclara y el texto encima pasa a casi negro: 9,6:1.
    primary: '#5FCB8F',
    onPrimary: '#06210F',
    primarySoft: '#17382A',
    onPrimarySoft: '#A6E8C4',
    // 8,1:1 sobre el fondo oscuro.
    danger: '#FF8A80',
    successBg: '#17382A',
    successText: '#A6E8C4',
    warningBg: '#3D2F0E',
    warningText: '#F5CF7A',
    dangerBg: '#44191A',
    dangerText: '#FFB4AC',
    infoBg: '#16294A',
    infoText: '#A9C8FA',
    neutralBg: '#26322A',
    neutralText: '#C9D3CC',
  },
} as const;

/** Tono de una insignia o de un aviso. Siempre acompaña a un símbolo y a un texto (RNF06). */
export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** Colores de fondo y de texto de un tono en el tema dado. */
export function toneColors(
  theme: (typeof Colors)['light'] | (typeof Colors)['dark'],
  tone: Tone,
): { background: string; text: string } {
  return { background: theme[`${tone}Bg`], text: theme[`${tone}Text`] };
}

/**
 * Colores de los puntos del mapa por estado (RF05). Son iguales en claro y en oscuro porque van
 * sobre las teselas, que no cambian con el tema; el borde blanco los separa del fondo.
 */
export const MapMarkerColors = {
  approved: '#E65100',
  in_progress: '#1565C0',
  resolved: '#2E7D32',
  stroke: '#FFFFFF',
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Radios de las esquinas: controles, tarjetas y píldoras. */
export const Radius = { control: 12, card: 16, pill: 999 } as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
