import { createServerSupabase } from "@/lib/supabase";
import { currentUser } from "@clerk/nextjs/server";

export async function getTTUser(clerkUserId: string) {
  const supabase = createServerSupabase();

  // Try by clerk_user_id first
  let { data: user } = await supabase
    .from("tt_users")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (user) return user;

  // Not linked yet - will be linked via /me endpoint
  return null;
}

export async function getTTUserOrLink(clerkUserId: string) {
  const supabase = createServerSupabase();

  // Try by clerk_user_id first
  let { data: user } = await supabase
    .from("tt_users")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (user) return user;

  // Not linked yet - try to match by email from Clerk
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses?.[0]?.emailAddress;
  if (!email) return null;

  const { data: matchedUser } = await supabase
    .from("tt_users")
    .select("*")
    .eq("email", email)
    .is("clerk_user_id", null)
    .single();

  if (!matchedUser) return null;

  // Link the Clerk user to the tt_users record
  const { data: linkedUser } = await supabase
    .from("tt_users")
    .update({ clerk_user_id: clerkUserId })
    .eq("id", matchedUser.id)
    .select("*")
    .single();

  return linkedUser || matchedUser;
}

export async function requireAdmin(clerkUserId: string) {
  const user = await getTTUser(clerkUserId);
  if (!user) return { user: null, error: "Time tracker profile not found" };
  if (user.role !== "admin") return { user: null, error: "Admin access required" };
  return { user, error: null };
}
