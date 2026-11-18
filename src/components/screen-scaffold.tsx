import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

type Props = {
  title: string;
  description?: string;
  /** Requisitos que la pantalla todavía no cumple (se borran al implementarlos). */
  pending?: readonly string[];
  children?: ReactNode;
};

export function ScreenScaffold({ title, description, pending, children }: Props) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" accessibilityRole="header">
            {title}
          </ThemedText>
          {description ? <ThemedText themeColor="textSecondary">{description}</ThemedText> : null}
          {children}
          {pending && pending.length > 0 ? (
            <ThemedView type="backgroundElement" style={styles.pending}>
              <ThemedText type="smallBold">En construcción</ThemedText>
              {pending.map((item) => (
                <ThemedText key={item} type="small">
                  • {item}
                </ThemedText>
              ))}
            </ThemedView>
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
  pending: { gap: Spacing.one, padding: Spacing.three, borderRadius: Spacing.three },
});
