"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function createTreatmentPlan(patientId: string, title: string) {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from("treatment_plans")
    .insert({ patient_id: patientId, title })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/admin/patients/${patientId}`);
  return { success: true, data };
}


export async function addPlanItem(planId: string, item: {
  treatment_id?: string;
  name_manual?: string;
  price: number;
  tooth_number?: number;
  notes?: string;
}) {
  const supabase = createAdminClient();
  
  const { error } = await supabase
    .from("treatment_plan_items")
    .insert({ ...item, plan_id: planId });

  if (error) return { error: error.message };
  
  // Update total amount on plan
  const { data: items } = await supabase
    .from("treatment_plan_items")
    .select("price")
    .eq("plan_id", planId);
  
  const total = items?.reduce((acc, i) => acc + Number(i.price), 0) || 0;
  await supabase.from("treatment_plans").update({ total_amount: total }).eq("id", planId);

  return { success: true };
}

export async function removePlanItem(itemId: string, planId: string) {
  const supabase = createAdminClient();
  
  const { error } = await supabase
    .from("treatment_plan_items")
    .delete()
    .eq("id", itemId);

  if (error) return { error: error.message };

  // Recalculate total
  const { data: items } = await supabase
    .from("treatment_plan_items")
    .select("price")
    .eq("plan_id", planId);
  
  const total = items?.reduce((acc, i) => acc + Number(i.price), 0) || 0;
  await supabase.from("treatment_plans").update({ total_amount: total }).eq("id", planId);

  return { success: true };
}

export async function updatePlanStatus(planId: string, status: string) {
  const supabase = createAdminClient();
  
  const { error } = await supabase
    .from("treatment_plans")
    .update({ status })
    .eq("id", planId);

  if (error) return { error: error.message };
  return { success: true };
}
