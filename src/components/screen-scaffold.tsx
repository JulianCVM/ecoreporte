import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

type Props = {
  title: string;
  description?: string;
  /** Requisitos que la pantalla todavía no cumple (se borran al implementarlos). */
  pending?: readonly string[];
  /** La pantalla va debajo de un encabezado nativo, que ya deja libre la barra de estado. */
  hasHeader?: boolean;
  /** Lo que va encima del título (la marca en las pantallas de entrada). */
  header?: ReactNode;
  children?: ReactNode;
};

// Con encabezado nativo, sumar el borde de arriba deja un hueco del alto de la barra de estado.
const EDGES_UNDER_HEADER = ['left', 'right', 'bottom'] as const;

export function ScreenScaffold({
  title,
  description,
  pending,
  hasHeader,
  header,
  children,
}: Props) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={hasHeader ? EDGES_UNDER_HEADER : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          {header}
          <View style={styles.heading}>
            <ThemedText type="title" accessibilityRole="header">
              {title}
            </ThemedText>
            {description ? <ThemedText themeColor="textSecondary">{description}</ThemedText> : null}
          </View>
          {children}
          {pending && pending.length > 0 ? (
            <Card>
              <ThemedText type="smallBold" themeColor="textSecondary">
                En construcción
              </ThemedText>
              {pending.map((item) => (
                <ThemedText key={item} type="small" themeColor="textSecondary">
                  • {item}
                </ThemedText>
              ))}
            </Card>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  heading: { gap: Spacing.one },
});
