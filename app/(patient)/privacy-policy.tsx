// app/(patient)/privacy-policy.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function Body({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.body, { color: colors.textSec }]}>{text}</Text>;
}

function Bullet({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bullet, { backgroundColor: colors.accent }]} />
      <Text style={[styles.bulletText, { color: colors.textSec }]}>{text}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <ScreenWrapper>
      <Header
        title="Privacy Policy"
        leftIcon={<Ionicons name="chevron-back" size={24} color={colors.text} />}
        onLeftPress={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.banner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.bannerTitle, { color: colors.text }]}>Privacy Policy</Text>
          <Text style={[styles.bannerSub, { color: colors.textSec }]}>
            Effective date: January 1, 2025 · Last updated: April 7, 2026
          </Text>
        </View>

        <Section title="1. Overview">
          <Body text="Vestigia (operated by the development team under the SD3 research project) is a clinical screening application designed to assist licensed healthcare professionals in the early detection of Diabetic Peripheral Neuropathy (DPN) through thermal foot imaging. We are committed to protecting the privacy and confidentiality of all data processed within this platform." />
        </Section>

        <Section title="2. Data We Collect">
          <Body text="When you use Vestigia, we collect the following categories of data:" />
          <Bullet text="Account information: full name, email address, and role (clinic operator)." />
          <Bullet text="Clinic information: the name and identifier of your registered clinic." />
          <Bullet text="Patient records: patient codes, date of birth, diabetes type, and related clinical metadata (not personally identifying beyond the patient code)." />
          <Bullet text="Thermal imaging data: thermal matrix captures of patients' feet, stored as numerical arrays." />
          <Bullet text="Clinical vitals: blood glucose, blood pressure, heart rate, and HbA1c readings entered during a screening session." />
          <Bullet text="Device information: registered device codes and firmware versions linked to your clinic." />
          <Bullet text="Usage logs: session timestamps, AI classification results, and operator actions." />
        </Section>

        <Section title="3. How We Use Your Data">
          <Body text="Data collected through Vestigia is used solely for the following purposes:" />
          <Bullet text="Providing and operating the DPN screening service." />
          <Bullet text="Generating AI-assisted classification results for individual screening sessions." />
          <Bullet text="Enabling authorized clinic personnel to review historical session records." />
          <Bullet text="Maintaining audit trails for clinical quality assurance." />
          <Bullet text="Improving the accuracy and reliability of the screening model (only with explicit institutional consent)." />
          <Body text="We do not use your data for advertising, sell it to third parties, or share it with any external entity outside the bounds described in this policy." />
        </Section>

        <Section title="4. Data Storage & Security">
          <Body text="All data is stored on Supabase infrastructure, hosted on Amazon Web Services (AWS) in the Asia Pacific (Singapore) region. Access to data is governed by Row-Level Security (RLS) policies that ensure each clinic operator can only access records belonging to their own clinic." />
          <Bullet text="Data in transit is encrypted using TLS 1.2 or higher." />
          <Bullet text="Data at rest is encrypted using AES-256." />
          <Bullet text="Authentication is handled via Supabase Auth with JWT session tokens." />
          <Bullet text="Offline captures are stored locally on the device using SQLite and are not transmitted until explicitly synced." />
        </Section>

        <Section title="5. Data Sharing">
          <Body text="We do not share identifiable patient data with any third party without explicit consent. The only exceptions are:" />
          <Bullet text="Service providers necessary to operate the platform (e.g., Supabase, cloud hosting) under strict data processing agreements." />
          <Bullet text="When required by applicable Philippine law, regulation, or valid court order." />
        </Section>

        <Section title="6. Data Retention">
          <Body text="Session records, thermal captures, and classification results are retained for as long as your clinic account is active. Upon account deactivation, data is archived and not permanently deleted without a formal written request to the platform administrator. Patient-linked records may be retained longer to comply with Philippine medical record-keeping requirements under DOH regulations." />
        </Section>

        <Section title="7. Your Rights">
          <Body text="As a user of this platform, you have the right to:" />
          <Bullet text="Access the personal data we hold about you." />
          <Bullet text="Request correction of inaccurate information." />
          <Bullet text="Request deletion of your account and associated data, subject to legal retention requirements." />
          <Bullet text="Withdraw consent for non-essential data processing at any time." />
          <Body text="To exercise any of these rights, contact the platform administrator at the support address listed in the Contact Support section." />
        </Section>

        <Section title="8. Changes to This Policy">
          <Body text="We may update this Privacy Policy from time to time. Changes will be communicated through in-app notifications or email. Continued use of the application after the effective date of any update constitutes acceptance of the revised policy." />
        </Section>

        <View style={[styles.footer, { borderColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textSec }]}>
            For privacy-related concerns, contact{"\n"}
            <Text style={{ color: colors.accent }}>support@vestigia.app</Text>
          </Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
  banner: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    alignItems: "center",
  },
  bannerTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    marginBottom: Spacing.xs,
  },
  bannerSub: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    lineHeight: 18,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.sm,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 7,
    marginRight: Spacing.sm,
  },
  bulletText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    lineHeight: 22,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: Spacing.lg,
    marginTop: Spacing.sm,
    alignItems: "center",
  },
  footerText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    lineHeight: 22,
  },
});
