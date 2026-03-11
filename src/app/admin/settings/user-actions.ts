"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function adminCreateUser(formData: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
}) {
  const supabase = createAdminClient();

  // 1. Create the user in Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true,
    user_metadata: {
      first_name: formData.first_name,
      last_name: formData.last_name,
      role: formData.role,
    },
  });

  if (authError) {
    console.error("Error creating auth user:", authError);
    return { error: authError.message };
  }

  // 2. The profile is normally created via trigger, 
  // but let's ensure it's there or update it if needed.
  // The trigger 'on_auth_user_created' in supabase/migrations/20260312_create_profiles.sql
  // should have handled this.

  revalidatePath("/admin/settings");
  return { success: true, user: authData.user };
}

export async function adminDeleteUser(userId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    console.error("Error deleting user:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function adminUpdateUserRole(userId: string, role: string) {
  const supabase = createAdminClient();

  // Update profile role
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (profileError) {
    console.error("Error updating profile role:", profileError);
    return { error: profileError.message };
  }

  // Also update auth metadata for consistency
  const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { role },
  });

  if (authError) {
    console.error("Error updating auth metadata:", authError);
    // Non-critical if profile updated
  }

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function adminListUsers() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error listing users:", error);
    return { error: error.message };
  }

  return { users: data };
}
