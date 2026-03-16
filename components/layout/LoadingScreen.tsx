// components/layout/LoadingScreen.tsx
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Colors, Typography } from "../../constants/theme";
import ScreenWrapper from "./ScreenWrapper";

export default function LoadingScreen() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulse]);

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Animated.View style={[styles.logoContainer, { opacity: pulse }]}>
          <Text style={styles.logoGlyph}>◈</Text>
        </Animated.View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.bg.glass,
    borderWidth: 1.5,
    borderColor: Colors.border.strong,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary[400],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoGlyph: {
    fontSize: 36,
    color: Colors.primary[300],
    fontFamily: Typography.fonts.heading,
  },
});
