// app/(auth)/account-activated.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";

export default function AccountActivatedScreen() {
  const router = useRouter();

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons
            name="checkmark-circle"
            size={72}
            color={Colors.teal[300]}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Account Activated</Text>
          <Text style={styles.subtitle}>
            Your email has been verified and your account is ready to use.{"\n\n"}
            Sign in to get started with Vestigia.
          </Text>
          <Button
            label="Sign In"
            onPress={() => router.replace("/(auth)/login")}
            size="lg"
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing["3xl"],
    justifyContent: "center",
  },
  iconWrap: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes["2xl"],
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    lineHeight: 22,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },
});
