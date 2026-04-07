// app/(patient)/terms-of-service.tsx
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

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <ScreenWrapper>
      <Header
        title="Terms of Service"
        leftIcon={<Ionicons name="chevron-back" size={24} color={colors.text} />}
        onLeftPress={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.banner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.bannerTitle, { color: colors.text }]}>Terms of Service</Text>
          <Text style={[styles.bannerSub, { color: colors.textSec }]}>
            Effective date: January 1, 2025 · Last updated: April 7, 2026
          </Text>
        </View>

        <View style={[styles.disclaimer, { backgroundColor: `${colors.warning}1A`, borderColor: `${colors.warning}4D` }]}>
          <Ionicons name="warning-outline" size={18} color={colors.warning} style={{ marginBottom: 4 }} />
          <Text style={[styles.disclaimerText, { color: colors.warning }]}>
            Vestigia is a screening tool only. It does not replace clinical diagnosis or the judgment of a qualified healthcare professional.
          </Text>
        </View>

        <Section title="1. Acceptance of Terms">
          <Body text="By accessing or using the Vestigia application, you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not use the application. These terms apply to all users, including clinic operators, administrators, and any personnel granted access by an authorized institution." />
        </Section>

        <Section title="2. Authorized Use">
          <Body text="Vestigia is intended exclusively for use by licensed healthcare professionals and authorized clinic personnel involved in the screening and monitoring of patients with diabetes-related conditions. By using this application, you represent that:" />
          <Bullet text="You are a qualified healthcare professional or authorized operator acting on behalf of a registered clinic." />
          <Bullet text="You have obtained all necessary patient consents prior to performing any thermal screening." />
          <Bullet text="You will use the application solely for its intended clinical screening purposes." />
          <Bullet text="You will not attempt to reverse-engineer, copy, modify, or redistribute any part of the application." />
        </Section>

        <Section title="3. Clinical Disclaimer">
          <Body text="The AI-generated classification results provided by Vestigia are intended as decision-support tools only. They are derived from a thermal imaging model trained on limited datasets and are subject to the following limitations:" />
          <Bullet text="Results must always be interpreted in the context of a full clinical assessment by a qualified physician or specialist." />
          <Bullet text="A NEGATIVE result does not rule out the presence of Diabetic Peripheral Neuropathy." />
          <Bullet text="A POSITIVE result is not a confirmed diagnosis and must be followed up with appropriate clinical evaluation." />
          <Bullet text="Confidence scores reflect model certainty under controlled imaging conditions and may be reduced by poor imaging quality, patient movement, or environmental interference." />
          <Body text="The development team and affiliated institutions accept no liability for clinical decisions made solely on the basis of Vestigia's output." />
        </Section>

        <Section title="4. Account Responsibilities">
          <Body text="You are responsible for maintaining the confidentiality of your account credentials. You must:" />
          <Bullet text="Not share your login credentials with unauthorized individuals." />
          <Bullet text="Immediately notify the platform administrator if you suspect unauthorized access to your account." />
          <Bullet text="Ensure that your clinic's patient records are accurate and up to date." />
          <Bullet text="Log out of the application when using shared or public devices." />
          <Body text="The platform administrator reserves the right to suspend or deactivate accounts that violate these terms or exhibit unusual access patterns." />
        </Section>

        <Section title="5. Data Handling Obligations">
          <Body text="All patient data entered or captured through Vestigia must be handled in accordance with applicable Philippine data privacy laws, including the Data Privacy Act of 2012 (Republic Act No. 10173) and its Implementing Rules and Regulations. You agree to:" />
          <Bullet text="Obtain proper informed consent from patients before capturing thermal images." />
          <Bullet text="Use patient data only for legitimate clinical screening purposes." />
          <Bullet text="Not export or share patient data outside of the platform without appropriate authorization." />
        </Section>

        <Section title="6. Intellectual Property">
          <Body text="All content, interfaces, algorithms, and AI models within Vestigia remain the intellectual property of the development team and the affiliated academic institution. No license to the underlying technology is granted beyond the right to use the application as intended under these terms." />
        </Section>

        <Section title="7. Limitation of Liability">
          <Body text="To the fullest extent permitted by applicable law, the Vestigia development team and affiliated institutions shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of — or inability to use — this application, including but not limited to data loss, clinical misinterpretation, or device malfunction." />
        </Section>

        <Section title="8. Termination">
          <Body text="We reserve the right to suspend or terminate access to the platform at any time, with or without notice, for conduct that we determine violates these terms or is harmful to other users, the platform, or third parties." />
        </Section>

        <Section title="9. Changes to Terms">
          <Body text="We may modify these Terms of Service at any time. Changes will be communicated through in-app notices. Continued use of the application after any modification constitutes acceptance of the updated terms." />
        </Section>

        <Section title="10. Governing Law">
          <Body text="These terms are governed by and construed in accordance with the laws of the Republic of the Philippines. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the appropriate courts in the Philippines." />
        </Section>

        <View style={[styles.footer, { borderColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textSec }]}>
            Questions about these terms?{"\n"}
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
    marginBottom: Spacing.lg,
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
  disclaimer: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    alignItems: "center",
  },
  disclaimerText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    lineHeight: 20,
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
