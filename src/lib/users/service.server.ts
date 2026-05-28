/**
 * Users module — server-side service.
 * NestJS equivalent: users.service.ts
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { UpdateProfileDto, UserProfileDto } from "./dto";

export class UsersService {
  static async findById(userId: string): Promise<UserProfileDto | null> {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, phone, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      phone: data.phone,
      avatarUrl: data.avatar_url,
    };
  }

  static async updateProfile(userId: string, patch: UpdateProfileDto): Promise<UserProfileDto> {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: patch.fullName,
        phone: patch.phone,
        avatar_url: patch.avatarUrl,
      })
      .eq("id", userId)
      .select("id, email, full_name, phone, avatar_url")
      .single();
    if (error) throw new Error(error.message);
    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      phone: data.phone,
      avatarUrl: data.avatar_url,
    };
  }
}
