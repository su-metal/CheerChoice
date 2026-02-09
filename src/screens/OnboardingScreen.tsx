import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useRef, useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BorderRadius, Colors, Spacing, Typography } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';
import { t } from '../i18n';

const ONBOARDING_COMPLETE_KEY = '@CheerChoice:onboardingComplete';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

type Slide = {
  key: string;
  emoji: string;
  titleKey: string;
  bodyKey: string;
};

const slides: Slide[] = [
  {
    key: 'concept',
    emoji: '📸',
    titleKey: 'onboarding.page1Title',
    bodyKey: 'onboarding.page1Body',
  },
  {
    key: 'how',
    emoji: '🍽️ → 🏋️',
    titleKey: 'onboarding.page2Title',
    bodyKey: 'onboarding.page2Body',
  },
  {
    key: 'message',
    emoji: '💜',
    titleKey: 'onboarding.page3Title',
    bodyKey: 'onboarding.page3Body',
  },
];

export default function OnboardingScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    navigation.replace('Home');
  };

  const handleSkip = () => {
    completeOnboarding().catch((error) => {
      console.error('Error completing onboarding:', error);
    });
  };

  const handleNext = () => {
    if (currentIndex >= slides.length - 1) {
      completeOnboarding().catch((error) => {
        console.error('Error completing onboarding:', error);
      });
      return;
    }
    listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topRow}>
        <View />
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(
            event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width
          );
          setCurrentIndex(Math.max(0, Math.min(slides.length - 1, nextIndex)));
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.title}>{t(item.titleKey)}</Text>
            <Text style={styles.body}>{t(item.bodyKey)}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((slide, index) => (
            <View
              key={slide.key}
              style={[styles.dot, index === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>
            {currentIndex === slides.length - 1
              ? t('onboarding.getStarted')
              : t('onboarding.next')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  skipText: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    fontWeight: '600',
  },
  slide: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  emoji: {
    fontSize: 72,
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h3,
    color: Colors.text,
    textAlign: 'center',
  },
  body: {
    ...Typography.body,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: Colors.divider,
  },
  dotActive: {
    width: 22,
    backgroundColor: Colors.primary,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...Typography.button,
    color: Colors.surface,
  },
});
