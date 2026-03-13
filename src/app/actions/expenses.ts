"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addExpense(formData: {
  description: string;
  amount: number;
  category: string;
  payment_method: string;
  expense_date: string;
}) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("expenses")
    .insert([formData])
    .select()
    .single();

  if (error) {
    console.error("Error adding expense:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
  return { success: true, data };
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting expense:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
  return { success: true };
}

export async function getExpensesAnalytics(startDate: string, endDate: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .gte("expense_date", startDate)
    .lte("expense_date", endDate);

  if (error) {
    console.error("Error fetching expenses analytics:", error);
    return { error: error.message };
  }

  const total = data?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
  
  // Group by category
  const byCategory = data?.reduce((acc: Record<string, number>, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
    return acc;
  }, {}) || {};

  return { success: true, total, byCategory, count: data?.length || 0 };
}
