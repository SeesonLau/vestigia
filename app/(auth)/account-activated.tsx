// app/(auth)/account-activated.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { S } from "../../constants/strings";

export default function AccountActivatedScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={72} color={colors.success} />
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            {S.auth.accountActivated}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSec }]}>
            Your email has been verified and your account is ready to use.{"\n\n"}
            Sign in to get started with {S.app.name}.
          </Text>
          <Button
            label={S.auth.signIn}
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
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes["2xl"],
    fontFamily: Typography.fonts.heading,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    lineHeight: 22,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },
});
