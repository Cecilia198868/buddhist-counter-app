import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Dashboard from "@/components/dashboard";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: projects },
    { data: statues },
    { data: music },
    { data: records },
    { data: chantTexts },
  ] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.from("statues").select("*").order("created_at", { ascending: false }),
    supabase.from("music_tracks").select("*").order("created_at", { ascending: false }),
    supabase.from("chant_records").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("chant_texts").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <Dashboard
      userEmail={user.email ?? ""}
      initialProjects={projects ?? []}
      initialStatues={statues ?? []}
      initialMusic={music ?? []}
      initialRecords={records ?? []}
      initialChantTexts={chantTexts ?? []}
    />
  );
}