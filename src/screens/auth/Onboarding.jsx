import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@react-native-vector-icons/ionicons/static';

const ONBOARDING_KEY = '@excloth/onboarding_completed';

const slides = [
  {
    title: 'Find your next\nfavourite.',
    description: 'Explore a considered collection of everyday essentials and standout pieces.',
    icon: 'shirt-outline',
  },
  {
    title: 'Style, made\nyour own.',
    description: 'Browse by category, discover new arrivals, and save the pieces you love.',
    icon: 'sparkles-outline',
  },
  {
    title: 'A better way\nto shop.',
    description: 'Your cart, checkout, and order updates—together in one simple experience.',
    icon: 'bag-check-outline',
  },
];

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
  },
  topBar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2.4,
  },
  skip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  skipText: {
    color: '#555555',
    fontSize: 14,
    fontWeight: '600',
  },
  slide: {
    flex: 1,
    paddingTop: 16,
  },
  hero: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#101010',
  },
  heroIndex: {
    position: 'absolute',
    top: 20,
    left: 20,
    color: '#BDBDBD',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  heroRule: {
    position: 'absolute',
    top: 48,
    left: 20,
    width: 28,
    height: 1,
    backgroundColor: '#777777',
  },
  iconFrame: {
    width: 154,
    height: 154,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#656565',
    borderRadius: 77,
  },
  heroIcon: {
    color: '#FFFFFF',
  },
  heroCaption: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    color: '#BDBDBD',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.8,
  },
  copy: {
    paddingTop: 26,
  },
  title: {
    color: '#111111',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 39,
    letterSpacing: -0.8,
  },
  description: {
    maxWidth: 340,
    marginTop: 12,
    color: '#666666',
    fontSize: 15,
    lineHeight: 23,
  },
  footer: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D0D0D0',
  },
  activeDot: {
    width: 24,
    backgroundColor: '#111111',
  },
  button: {
    minWidth: 152,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#111111',
    paddingHorizontal: 18,
  },
  buttonText: {
    marginRight: 12,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

const Onboarding = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  const listRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const slideWidth = width - 48;
  const heroHeight = Math.min(320, Math.max(190, height * 0.34));

  const finishOnboarding = async () => {
    if (finishing) {
      return;
    }

    setFinishing(true);

    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (error) {
      if (__DEV__) {
        console.warn('Unable to save onboarding status:', error.message);
      }
    }

    navigation.replace('Login');
  };

  const goForward = () => {
    if (activeIndex === slides.length - 1) {
      finishOnboarding();
      return;
    }

    listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.content}>
        <View style={styles.topBar}>
          <Text style={styles.brand}>EXCLOTH</Text>
          {activeIndex < slides.length - 1 ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Skip introduction"
              onPress={finishOnboarding}
              disabled={finishing}
              style={styles.skip}
              hitSlop={8}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          ) : <View style={styles.skip} />}
        </View>

        <FlatList
          ref={listRef}
          data={slides}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.icon}
          onMomentumScrollEnd={event => {
            setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / slideWidth));
          }}
          getItemLayout={(_, index) => ({
            length: slideWidth,
            offset: slideWidth * index,
            index,
          })}
          renderItem={({ item, index }) => (
            <View style={[styles.slide, { width: slideWidth }]}>
              <View style={[styles.hero, { height: heroHeight }]}>
                <Text style={styles.heroIndex}>{`0${index + 1} / 03`}</Text>
                <View style={styles.heroRule} />
                <View style={styles.iconFrame}>
                  <Ionicons name={item.icon} size={76} color="#FFFFFF" style={styles.heroIcon} />
                </View>
                <Text style={styles.heroCaption}>EXCLOTH / YOUR EDIT</Text>
              </View>
              <View style={styles.copy}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            </View>
          )}
        />

        <View style={styles.footer}>
          <View style={styles.pagination} accessibilityLabel={`Page ${activeIndex + 1} of ${slides.length}`}>
            {slides.map((slide, index) => (
              <View key={slide.icon} style={[styles.dot, index === activeIndex && styles.activeDot]} />
            ))}
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={activeIndex === slides.length - 1 ? 'Start shopping' : 'Continue'}
            onPress={goForward}
            disabled={finishing}
            activeOpacity={0.85}
            style={styles.button}
          >
            {finishing ? <ActivityIndicator color="#FFFFFF" /> : (
              <>
                <Text style={styles.buttonText}>{activeIndex === slides.length - 1 ? 'Start shopping' : 'Continue'}</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export { ONBOARDING_KEY };
export default Onboarding;
