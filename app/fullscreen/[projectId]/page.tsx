import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FullscreenChantClient from "@/components/fullscreen-chant-client";

export default async function FullscreenPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) {
    notFound();
  }

  let statueUrl = "";
  let musicUrl = "";

  if (project.selected_statue_id) {
    const { data: statue } = await supabase
      .from("statues")
      .select("*")
      .eq("id", project.selected_statue_id)
      .single();

    statueUrl = statue?.public_url ?? "";
  }

  if (project.selected_music_id) {
    const { data: music } = await supabase
      .from("music_tracks")
      .select("*")
      .eq("id", project.selected_music_id)
      .single();

    musicUrl = music?.public_url ?? "";
  }

  return (
    <FullscreenChantClient
      projectId={project.id}
      projectName={project.name}
      initialCount={project.count ?? 0}
      vowText={project.vow_text ?? ""}
      dedicationText={project.dedication_text ?? ""}
      statueUrl={statueUrl}
      musicUrl={musicUrl}
    />
  );
}