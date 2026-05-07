// lib/profile/avatarUpload.ts
// Shared profile-photo upload pipeline used by both the clinic and patient
// profile screens.
//
// Why this lives in its own module: the canonical pattern of
//     const blob = await fetch(uri).then(r => r.blob())
//     const arr  = await new Response(blob).arrayBuffer()
// is unreliable on React Native -- on some Android setups blob() returns a
// zero-length object and the upload silently writes a 0-byte file or
// rejects in supabase-js. expo-file-system's File class exposes a native
// arrayBuffer() that reads the file directly, bypassing the JS blob layer.

import { File } from "expo-file-system";
import { supabase } from "../supabase";

/** Minimum acceptable size for the read-back buffer. Anything below this is
 *  almost certainly a 0-byte / corrupt read that we should surface as an
 *  error instead of uploading. 1 KB is small enough to not flag legitimate
 *  tiny avatars but large enough to catch the empty-buffer failure mode. */
const MIN_AVATAR_BYTES = 1024;

export interface UploadAvatarParams {
  /** Local file URI returned by expo-image-picker. */
  uri: string;
  /** Auth user id (== profiles.id). Used as the storage path prefix. */
  userId: string;
}

/**
 * Read the file at `uri` and upload it to the `avatars` bucket under
 * `${userId}/avatar.jpg`. Returns a cache-busted public URL on success.
 *
 * Throws an Error whose message is suitable to surface in an Alert. The
 * underlying error reason is logged via console.warn for debugging.
 */
export async function uploadAvatar({ uri, userId }: UploadAvatarParams): Promise<string> {
  // 1. Read the file via the native File API. Throws if the path doesn't
  //    exist or the read fails.
  let bytes: Uint8Array;
  try {
    const file = new File(uri);
    const arrayBuffer = await file.arrayBuffer();
    bytes = new Uint8Array(arrayBuffer);
  } catch (e) {
    console.warn("[avatarUpload] file read failed:", e);
    throw new Error("Could not read the selected image. Try a different photo.");
  }

  if (bytes.byteLength < MIN_AVATAR_BYTES) {
    console.warn("[avatarUpload] suspicious read length:", bytes.byteLength);
    throw new Error("The image read back as empty. Try a different photo.");
  }

  // 2. Upload to storage. Supabase JS handles the multipart for us.
  const filePath = `${userId}/avatar.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, bytes, {
      contentType: "image/jpeg",
      upsert: true,
    });
  if (uploadError) {
    console.warn("[avatarUpload] storage upload failed:", uploadError);
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // 3. Public URL with a cache-buster so the new image loads immediately.
  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  // 4. Persist on the profile row so other surfaces (home, header) pick it up.
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (updateError) {
    console.warn("[avatarUpload] profile row update failed:", updateError);
    throw new Error(`Saved photo but profile update failed: ${updateError.message}`);
  }

  return publicUrl;
}
