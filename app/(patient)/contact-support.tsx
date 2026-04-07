// app/(patient)/contact-support.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { S } from "../../constants/strings";

interface ContactCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  note?: string;
}

function ContactCard({ icon, title, detail, note }: ContactCardProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.contactIcon, { backgroundColor: colors.accentSoft }]}>
        <Ionicons name={icon} size={22} color={colors.accent} />
      </View>
      <View style={styles.contactText}>
        <Text style={[styles.contactTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.contactDetail, { color: colors.accent }]}>{detail}</Text>
        {note && <Text style={[styles.contactNote, { color: colors.textSec }]}>{note}</Text>}
      </View>
    </View>
  );
}

interface FaqItemProps {
  question: string;
  answer: string;
}

function FaqItem({ question, answer }: FaqItemProps) {
  const { colors } = useTheme();
  const [open, setOpen] = React.useState(false);
  return (
    <View style={[styles.faqItem, { borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.faqHeader}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
      >
        <Text style={[styles.faqQuestion, { color: colors.text }]}>{question}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.textSec}
        />
      </TouchableOpacity>
      {open && (
        <Text style={[styles.faqAnswer, { color: colors.textSec }]}>{answer}</Text>
      )}
    </View>
  );
}

export default function ContactSupportScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <ScreenWrapper>
      <Header
        title="Contact Support"
        leftIcon={<Ionicons name="chevron-back" size={24} color={colors.text} />}
        onLeftPress={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="headset-outline" size={32} color={colors.accent} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>We're here to help</Text>
          <Text style={[styles.heroSub, { color: colors.textSec }]}>
            Reach out through any of the channels below. Our team typically responds within one business day.
          </Text>
        </View>

        {/* Contact Channels */}
        <Text style={[styles.sectionHeader, { color: colors.textSec }]}>Contact Channels</Text>

        <ContactCard
          icon="mail-outline"
          title="Email Support"
          detail="support@vestigia.app"
          note="Response within 1 business day"
        />
        <ContactCard
          icon="document-text-outline"
          title="Bug Reports"
          detail="bugs@vestigia.app"
          note="Include your device model and app version"
        />
        <ContactCard
          icon="school-outline"
          title="Academic Inquiries"
          detail="research@vestigia.app"
          note="For thesis collaboration, data access requests, or institutional use"
        />

        {/* App Info */}
        <Text style={[styles.sectionHeader, { color: colors.textSec }]}>App Information</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: "App Name",    value: S.app.name },
            { label: "Version",     value: S.app.version },
            { label: "Build",       value: S.app.build },
            { label: "Platform",    value: "React Native / Expo" },
            { label: "Backend",     value: "Supabase (AWS AP-Southeast)" },
          ].map(({ label, value }, i, arr) => (
            <View key={label}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSec }]}>{label}</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
              </View>
              {i < arr.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>

        {/* FAQ */}
        <Text style={[styles.sectionHeader, { color: colors.textSec }]}>Frequently Asked Questions</Text>
        <View style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <FaqItem
            question="Why is the camera not connecting?"
            answer="For FLIR Lepton: ensure the PureThermal Mini Pro is plugged in via USB-C before tapping Connect on the Live Feed screen. For ESP32 Wi-Fi: check that the device IP is correct and both your phone and the ESP32 are on the same network. Use the Test Connection button in Device Pairing to verify reachability."
          />
          <View style={[styles.faqDivider, { backgroundColor: colors.border }]} />
          <FaqItem
            question="What do I do if the AI result seems incorrect?"
            answer="AI results are screening indicators only. If a result conflicts with your clinical assessment, trust your clinical judgment. Ensure the thermal images were captured under controlled conditions: stable ambient temperature, patient rested for at least 15 minutes, and no recent physical activity. Document the discrepancy and submit a bug report."
          />
          <View style={[styles.faqDivider, { backgroundColor: colors.border }]} />
          <FaqItem
            question="Can I recover data after clearing local cache?"
            answer="No. Local cache contains unsynced captures stored on this device. Once cleared, that data cannot be recovered. Always sync pending captures to the cloud before clearing the cache."
          />
          <View style={[styles.faqDivider, { backgroundColor: colors.border }]} />
          <FaqItem
            question="Why does my account show as deactivated?"
            answer="Accounts can be deactivated by the clinic operator themselves (via Profile > Deactivate Account) or by the platform administrator. Contact your administrator to restore access. If you are the administrator, reach out to support@vestigia.app."
          />
          <View style={[styles.faqDivider, { backgroundColor: colors.border }]} />
          <FaqItem
            question="How do I add a new patient to my clinic?"
            answer="New patients are registered by the platform administrator or through the patient registration flow. Contact your admin to add patients to your clinic roster, or reach out to support if you need access to patient management features."
          />
        </View>

        {/* Response Times */}
        <Text style={[styles.sectionHeader, { color: colors.textSec }]}>Response Times</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: "General Support",     value: "≤ 1 business day" },
            { label: "Critical Bugs",       value: "≤ 4 hours (business hours)" },
            { label: "Feature Requests",    value: "1–2 weeks" },
            { label: "Data Access Requests", value: "3–5 business days" },
          ].map(({ label, value }, i, arr) => (
            <View key={label}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSec }]}>{label}</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
              </View>
              {i < arr.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>

        <Text style={[styles.footer, { color: colors.textSec }]}>
          Business hours: Mon–Fri, 8:00 AM – 5:00 PM PST
        </Text>
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
  hero: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  heroTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
  },
  heroSub: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    lineHeight: 20,
  },
  sectionHeader: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.heading,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    marginLeft: Spacing.xs,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  contactText: { flex: 1 },
  contactTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
    marginBottom: 2,
  },
  contactDetail: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
    marginBottom: 2,
  },
  contactNote: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    lineHeight: 16,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  infoLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
  },
  infoValue: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.subheading,
    flexShrink: 1,
    textAlign: "right",
    marginLeft: Spacing.lg,
  },
  divider: { height: 1 },
  faqCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  faqItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  faqQuestion: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.subheading,
    lineHeight: 20,
  },
  faqAnswer: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  faqDivider: { height: 1 },
  footer: {
    textAlign: "center",
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
    marginTop: Spacing.lg,
    letterSpacing: 0.3,
  },
});
