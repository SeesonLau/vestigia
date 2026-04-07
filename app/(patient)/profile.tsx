// app/(patient)/profile.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
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
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
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
  const [nameInput, setNameInput] = useState(user?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url ?? null);

  const initials = (user?.full_name ?? "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
    await uploadAvatar(result.assets[0].uri);
  };

  const uploadAvatar = async (uri: string) => {
    if (!user?.id) return;
    setAvatarUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const filePath = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, bytes, { contentType: "image/jpeg", upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      useAuthStore.setState((s) => ({
        user: s.user ? { ...s.user, avatar_url: publicUrl } : s.user,
      }));
    } catch {
      Alert.alert("Upload Failed", "Could not update your profile photo. Please try again.");
    } finally {
      setAvatarUploading(false);
    }
  };

  //Name edit
  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) { setSaveError("Name cannot be empty."); return; }
    if (trimmed === user?.full_name) { setEditingName(false); return; }
    setSaving(true);
    setSaveError(null);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: trimmed, updated_at: new Date().toISOString() })
      .eq("id", user!.id);
    setSaving(false);
    if (error) {
      setSaveError("Failed to update name. Try again.");
    } else {
      useAuthStore.setState((s) => ({
        user: s.user ? { ...s.user, full_name: trimmed } : s.user,
      }));
      setEditingName(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleCancelEdit = () => {
    setNameInput(user?.full_name ?? "");
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
          {/* Avatar */}
          <View style={styles.avatarSection}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={[styles.avatarImage, { borderColor: `${colors.accent}66` }]}
              />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: `${colors.accent}26`, borderColor: `${colors.accent}66` }]}>
                <Text style={[styles.avatarText, { color: colors.accent }]}>{initials}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handlePickAvatar}
              activeOpacity={0.7}
              disabled={avatarUploading}
              style={[styles.changePhotoBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              accessibilityLabel="Change profile photo"
            >
              <Ionicons
                name={avatarUploading ? "sync-outline" : "camera-outline"}
                size={14}
                color={colors.accent}
              />
              <Text style={[styles.changePhotoText, { color: colors.accent }]}>
                {avatarUploading ? "Uploading..." : "Change Photo"}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.avatarName, { color: colors.text }]}>{user?.full_name ?? "—"}</Text>
            <View style={[styles.roleBadge, { backgroundColor: `${colors.accent}1A`, borderColor: `${colors.accent}4D` }]}>
              <Text style={[styles.roleBadgeText, { color: colors.accent }]}>Patient</Text>
            </View>
          </View>

          {/* Edit Name */}
          <Text style={[styles.sectionHeader, { color: colors.textSec }]}>Display Name</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {editingName ? (
              <View style={styles.editBlock}>
                <TextInput
                  style={[styles.nameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={nameInput}
                  onChangeText={(v) => { setNameInput(v); setSaveError(null); }}
                  autoFocus
                  placeholder="Your full name"
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
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: Typography.sizes["2xl"],
    fontFamily: Typography.fonts.heading,
  },
  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  changePhotoText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.label,
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
