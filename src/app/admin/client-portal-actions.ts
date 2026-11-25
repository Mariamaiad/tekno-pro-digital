"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdmin, createServiceClient } from "@/lib/supabase/server";

const clean = (value: FormDataEntryValue | null) => String(value ?? "").trim();

/** Creates or reuses a Supabase Auth account and links it to the selected CRM client. */
export async function createClientPortalAccess(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const clientId = clean(formData.get("client_id"));
  const email = clean(formData.get("email")).toLowerCase();
  if (!clientId || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(`/admin/clientes/${encodeURIComponent(clientId)}?aba=ficha&portalStatus=invalid`);
  }

  const service = createServiceClient();
  if (!service) redirect(`/admin/clientes/${encodeURIComponent(clientId)}?aba=ficha&portalStatus=config`);

  // The CRM client is confirmed via the administrator's authenticated session.
  const { data: client, error: clientError } = await admin.supabase
    .from("clients")
    .select("id,email,name")
    .eq("id", clientId)
    .maybeSingle();
  if (clientError || !client) {
    redirect(`/admin/clientes/${encodeURIComponent(clientId)}?aba=ficha&portalStatus=client`);
  }

  // Find an existing Auth account before attempting an invitation (avoids duplicate users).
  let userId: string | null = null;
  let page = 1;
  while (page <= 10 && !userId) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) redirect(`/admin/clientes/${encodeURIComponent(clientId)}?aba=ficha&portalStatus=error`);
    const found = data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) userId = found.id;
    if (data.users.length < 1000) break;
    page += 1;
  }

  let invitationSent = false;
  if (!userId) {
    const redirectTo = `${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}/portal/login`;
    const { data, error } = await service.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo.startsWith("http") ? redirectTo : undefined,
      data: { client_name: client.name, portal_access: true },
    });
    if (error || !data.user) {
      redirect(`/admin/clientes/${encodeURIComponent(clientId)}?aba=ficha&portalStatus=inviteError`);
    }
    userId = data.user.id;
    invitationSent = true;
  }

  const { error: linkError } = await service.from("client_users").upsert(
    { user_id: userId, client_id: clientId, role: "client" },
    { onConflict: "user_id,client_id", ignoreDuplicates: true },
  );
  if (linkError) redirect(`/admin/clientes/${encodeURIComponent(clientId)}?aba=ficha&portalStatus=linkError`);

  revalidatePath(`/admin/clientes/${clientId}`);
  revalidatePath("/portal");
  redirect(`/admin/clientes/${encodeURIComponent(clientId)}?aba=ficha&portalStatus=${invitationSent ? "invited" : "linked"}`);
}
