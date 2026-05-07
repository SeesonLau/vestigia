// app/(patient)/profile.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import InitialsAvatar, { personInitials } from "../../components/ui/InitialsAvatar";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { uploadAvatar } from "../../lib/profile/avatarUpload";
import { useAuthStore } from "../../store/authStore";

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={infoStyles.row}>
      <Text style={[infoStyles.label, { color: colors.textSec }]}>{label}</Text>
      <Text style={[infoStyles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
  },
  value: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.subheading,
    flexShrink: 1,
    textAlign: "right",
    marginLeft: Spacing.lg,
  },
});

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function PatientProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, logout } = useAuthStore();

  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName]   = useState(user?.first_name ?? "");
  const [middleName, setMiddleName] = useState(user?.middle_name ?? "");
  const [lastName, setLastName]     = useState(user?.last_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url ?? null);

  const initials = personInitials(user?.first_name, user?.last_name);

  //Avatar
  const handlePickAvatar = () => {
    Alert.alert("Update Photo", "Choose a source", [
      { text: "Camera", onPress: () => pickImage("camera") },
      { text: "Photo Library", onPress: () => pickImage("library") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const pickImage = async (source: "camera" | "library") => {
    const ImagePicker = await import("expo-image-picker");

    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        source === "camera"
          ? "Allow camera access to take a profile photo."
          : "Allow photo library access to pick a profile photo.",
      );
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: "images",
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: "images",
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });

    if (result.canceled || !result.assets[0]) return;
    await handleUploadAvatar(result.assets[0].uri);
  };

  const handleUploadAvatar = async (uri: string) => {
    if (!user?.id) return;
    setAvatarUploading(true);
    try {
      const publicUrl = await uploadAvatar({ uri, userId: user.id });
      setAvatarUrl(publicUrl);
      useAuthStore.setState((s) => ({
        user: s.user ? { ...s.user, avatar_url: publicUrl } : s.user,
      }));
    } catch (e) {
      Alert.alert("Upload Failed", e instanceof Error ? e.message : "Could not update your profile photo.");
    } finally {
      setAvatarUploading(false);
    }
  };

  //Name edit. profiles.full_name is a generated column, so we update the
  //three parts and let Postgres recompute it.
  const composeFullName = (f: string, m: string, l: string) =>
    [f, m, l].map((s) => s.trim()).filter(Boolean).join(" ").trim();

  const handleSaveName = async () => {
    const f = firstName.trim();
    const m = middleName.trim();
    const l = lastName.trim();
    if (!f) { setSaveError("First name is required."); return; }
    if (!l) { setSaveError("Last name is required."); return; }
    setSaving(true);
    setSaveError(null);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name:  f,
        middle_name: m || null,
        last_name:   l,
        updated_at:  new Date().toISOString(),
      })
      .eq("id", user!.id);
    setSaving(false);
    if (error) {
      setSaveError("Failed to update name. Try again.");
    } else {
      const nextFull = composeFullName(f, m, l);
      useAuthStore.setState((s) => ({
        user: s.user
          ? { ...s.user, first_name: f, middle_name: m || null, last_name: l, full_name: nextFull }
          : s.user,
      }));
      setEditingName(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleCancelEdit = () => {
    setFirstName(user?.first_name ?? "");
    setMiddleName(user?.middle_name ?? "");
    setLastName(user?.last_name ?? "");
    setEditingName(false);
    setSaveError(null);
  };

  const handleDeactivate = () => {
    Alert.alert(
      "Deactivate Account",
      "Your account will be deactivated and you'll be signed out. Contact your clinic to restore access.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            if (user?.id) {
              await supabase.from("profiles").update({ is_active: false }).eq("id", user.id);
            }
            await logout();
            router.replace("/(auth)/login");
          },
        },
      ],
    );
  };

  return (
    <ScreenWrapper>
      <Header
        title="Profile"
        leftIcon={<Ionicons name="chevron-back" size={24} color={colors.text} />}
        onLeftPress={() => router.back()}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar — tap the image directly to update. Camera badge in
              the bottom-right corner makes the action discoverable; a
              full-circle spinner overlays the avatar while uploading. */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={handlePickAvatar}
              activeOpacity={0.85}
              disabled={avatarUploading}
              accessibilityLabel="Change profile photo"
              style={styles.avatarTouchable}
            >
              <InitialsAvatar
                initials={initials}
                seed={user?.patient_code ?? user?.id ?? initials}
                imageUrl={avatarUrl}
                size={104}
                borderWidth={2}
                borderColor={`${colors.accent}66`}
              />
              {avatarUploading ? (
                <View style={[styles.avatarUploadOverlay, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : (
                <View style={[styles.cameraBadge, { backgroundColor: colors.accent, borderColor: colors.card }]}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            <Text style={[styles.avatarHint, { color: colors.textSec }]}>
              {avatarUploading ? "Uploading…" : "Tap photo to change"}
            </Text>

            <Text style={[styles.avatarName, { color: colors.text }]}>{user?.full_name ?? "—"}</Text>
            <View style={[styles.roleBadge, { backgroundColor: `${colors.accent}1A`, borderColor: `${colors.accent}4D` }]}>
              <Text style={[styles.roleBadgeText, { color: colors.accent }]}>Patient</Text>
            </View>
          </View>

          {/* Edit Name */}
          <Text style={[styles.sectionHeader, { color: colors.textSec }]}>Name</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {editingName ? (
              <View style={styles.editBlock}>
                <TextInput
                  style={[styles.nameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={firstName}
                  onChangeText={(v) => { setFirstName(v); setSaveError(null); }}
                  autoFocus
                  autoCapitalize="words"
                  placeholder="First name"
                  placeholderTextColor={colors.textSec}
                />
                <TextInput
                  style={[styles.nameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={middleName}
                  onChangeText={(v) => { setMiddleName(v); setSaveError(null); }}
                  autoCapitalize="words"
                  placeholder="Middle name (optional)"
                  placeholderTextColor={colors.textSec}
                />
                <TextInput
                  style={[styles.nameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={lastName}
                  onChangeText={(v) => { setLastName(v); setSaveError(null); }}
                  autoCapitalize="words"
                  placeholder="Last name"
                  placeholderTextColor={colors.textSec}
                />
                {saveError ? (
                  <Text style={[styles.errorText, { color: colors.error }]}>{saveError}</Text>
                ) : null}
                <View style={styles.editActions}>
                  <Button label="Cancel" variant="ghost" size="sm" onPress={handleCancelEdit} style={styles.editBtn} />
                  <Button label="Save" variant="primary" size="sm" loading={saving} onPress={handleSaveName} style={styles.editBtn} />
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.nameRow} onPress={() => setEditingName(true)} activeOpacity={0.7}>
                <Text style={[styles.nameValue, { color: colors.text }]}>{user?.full_name ?? "—"}</Text>
                <Ionicons name="pencil-outline" size={16} color={colors.textSec} />
              </TouchableOpacity>
            )}
          </View>

          {saveSuccess && (
            <View style={[styles.successBanner, { backgroundColor: `${colors.success}1A`, borderColor: `${colors.success}4D` }]}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
              <Text style={[styles.successText, { color: colors.success }]}>Name updated successfully</Text>
            </View>
          )}

          {/* Account Info */}
          <Text style={[styles.sectionHeader, { color: colors.textSec }]}>Account Information</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <InfoRow label="Email" value={user?.email ?? "—"} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <InfoRow label="Member Since" value={formatDate(user?.created_at)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <InfoRow label="Account Status" value={user?.is_active ? "Active" : "Inactive"} />
          </View>

          {/* Danger Zone */}
          <Text style={[styles.sectionHeader, { color: colors.textSec }]}>Danger Zone</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.dangerRow} onPress={handleDeactivate} activeOpacity={0.7}>
              <View style={styles.dangerIcon}>
                <Ionicons name="close-circle-outline" size={18} color={colors.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dangerLabel, { color: colors.error }]}>Deactivate Account</Text>
                <Text style={[styles.dangerSub, { color: colors.textSec }]}>Contact your clinic to restore access</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  avatarTouchable: { position: "relative" },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarUploadOverlay: {
    position: "absolute",
    top: 2, left: 2, right: 2, bottom: 2,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
  },
  avatarName: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.heading,
  },
  roleBadge: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
  roleBadgeText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 0.5,
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
  card: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    overflow: "hidden",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  nameValue: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
  },
  editBlock: {
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
  },
  editActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "flex-end",
  },
  editBtn: { minWidth: 80 },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  successText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
  },
  divider: { height: 1 },
  dangerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  dangerIcon: {
    width: 32,
    alignItems: "center",
    marginRight: Spacing.md,
  },
  dangerLabel: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
  },
  dangerSub: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    marginTop: 2,
  },
});
