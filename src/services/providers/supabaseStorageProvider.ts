// ============================================================
// Supabase Storage Provider
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { StorageProvider } from "@/domain/providers/providerInterfaces";

export const supabaseStorageProvider: StorageProvider = {
  key: "supabase_storage",

  async upload(bucket, path, data, contentType) {
    const { error } = await supabase.storage.from(bucket).upload(path, data, {
      contentType,
      upsert: true,
    });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return { publicUrl: urlData.publicUrl };
  },

  async download(bucket, path) {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) throw new Error(`Storage download failed: ${error.message}`);
    return await data.arrayBuffer();
  },

  getPublicUrl(bucket, path) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  async remove(bucket, paths) {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) throw new Error(`Storage remove failed: ${error.message}`);
  },
};
