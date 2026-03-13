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

  // 2. Manual Profile Creation (Redundancy)
  // We do this because the DB trigger has been unreliable.
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: authData.user.id,
      email: formData.email,
      first_name: formData.first_name,
      last_name: formData.last_name,
      role: formData.role,
    });

  if (profileError) {
    console.error("Warning: Profile upsert failed, but Auth user created:", profileError);
    // We return success anyway because the user IS in Auth, 
    // but the UI might need a refresh or another manual fix for the profile.
  }
  
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

  // 1. Get all users from Auth (The "Source of Truth")
  const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error("Error listing Auth users:", authError);
    return { error: authError.message };
  }

  // 2. Get all existing profiles
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("*");

  if (profileError) {
    console.error("Error listing profiles:", profileError);
    return { error: profileError.message };
  }

  // 3. Synchronize: Ensure every Auth user has a profile
  const existingProfileIds = new Set(profiles.map(p => p.id));
  const missingProfiles = authUsers.filter(u => !existingProfileIds.has(u.id));

  if (missingProfiles.length > 0) {
    console.log(`Syncing ${missingProfiles.length} missing profiles...`);
    const newProfiles = missingProfiles.map(u => ({
      id: u.id,
      email: u.email!,
      first_name: u.user_metadata?.first_name || "",
      last_name: u.user_metadata?.last_name || "",
      role: u.user_metadata?.role || "secretary",
    }));

    const { error: syncError } = await supabase
      .from("profiles")
      .insert(newProfiles);

    if (syncError) {
      console.error("Error during profile sync:", syncError);
      // We continue anyway to show what we have, but keep an eye on this
    } else {
      // Re-fetch profiles to have the latest
      const { data: updatedProfiles } = await supabase.from("profiles").select("*");
      if (updatedProfiles) return { users: updatedProfiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) };
    }
  }

  return { 
    users: profiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) 
  };
}
