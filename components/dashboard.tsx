"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string;
  user_id: string;
  name: string;
  vow_text: string | null;
  dedication_text: string | null;
  selected_statue_id: string | null;
  selected_music_id: string | null;
  count: number;
  created_at: string;
};

type Statue = {
  id: string;
  user_id: string;
  name: string;
  file_path: string;
  public_url: string;
  created_at: string;
};

type MusicTrack = {
  id: string;
  user_id: string;
  name: string;
  file_path: string;
  public_url: string;
  created_at: string;
};

type ChantRecord = {
  id: string;
  user_id: string;
  project_id: string;
  count_added: number;
  created_at: string;
};

type ChantText = {
  id: string;
  user_id: string;
  type: "vow" | "dedication";
  title: string;
  content: string;
  created_at: string;
};

export default function Dashboard({
  userEmail,
  initialProjects,
  initialStatues,
  initialMusic,
  initialRecords,
  initialChantTexts,
}: {
  userEmail: string;
  initialProjects: Project[];
  initialStatues: Statue[];
  initialMusic: MusicTrack[];
  initialRecords: ChantRecord[];
  initialChantTexts: ChantText[];
}) {
  const supabase = createClient();

  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [statues, setStatues] = useState<Statue[]>(initialStatues);
  const [music, setMusic] = useState<MusicTrack[]>(initialMusic);
  const [records, setRecords] = useState<ChantRecord[]>(initialRecords);
  const [chantTexts, setChantTexts] = useState<ChantText[]>(initialChantTexts);

  const [newProjectName, setNewProjectName] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialProjects[0]?.id ?? null
  );
  const [message, setMessage] = useState("");

  const [newVowTitle, setNewVowTitle] = useState("");
  const [newVowContent, setNewVowContent] = useState("");
  const [newDedTitle, setNewDedTitle] = useState("");
  const [newDedContent, setNewDedContent] = useState("");

  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingContent, setEditingContent] = useState("");

  const statueInputRef = useRef<HTMLInputElement | null>(null);
  const musicInputRef = useRef<HTMLInputElement | null>(null);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const vowTexts = chantTexts.filter((t) => t.type === "vow");
  const dedicationTexts = chantTexts.filter((t) => t.type === "dedication");

  async function refreshAll() {
    const [{ data: p }, { data: s }, { data: m }, { data: r }, { data: t }] =
      await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("statues").select("*").order("created_at", { ascending: false }),
        supabase.from("music_tracks").select("*").order("created_at", { ascending: false }),
        supabase
          .from("chant_records")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("chant_texts").select("*").order("created_at", { ascending: false }),
      ]);

    setProjects(p ?? []);
    setStatues(s ?? []);
    setMusic(m ?? []);
    setRecords(r ?? []);
    setChantTexts(t ?? []);

    if (!selectedProjectId && p && p.length > 0) {
      setSelectedProjectId(p[0].id);
    }
  }

  async function createProject() {
    if (!newProjectName.trim()) return;

    const { error } = await supabase.from("projects").insert({
      name: newProjectName.trim(),
      count: 0,
      vow_text: "",
      dedication_text: "",
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setNewProjectName("");
    setMessage("项目已创建");
    await refreshAll();
  }

  async function deleteProject(id: string) {
    const ok = window.confirm("确定删除这个项目吗？");
    if (!ok) return;

    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (selectedProjectId === id) {
      setSelectedProjectId(null);
    }

    setMessage("项目已删除");
    await refreshAll();
  }

  async function updateProjectSelection(data: {
    selected_statue_id?: string | null;
    selected_music_id?: string | null;
  }) {
    if (!selectedProject) {
      setMessage("请先在项目管理中选中一个项目");
      return;
    }

    const { error } = await supabase
      .from("projects")
      .update(data)
      .eq("id", selectedProject.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("当前项目设置已保存");
    await refreshAll();
  }

  async function addCount(add = 1) {
    if (!selectedProject) return;

    const newCount = (selectedProject.count || 0) + add;

    const { error: updateError } = await supabase
      .from("projects")
      .update({ count: newCount })
      .eq("id", selectedProject.id);

    if (updateError) {
      setMessage(updateError.message);
      return;
    }

    const { error: recordError } = await supabase.from("chant_records").insert({
      project_id: selectedProject.id,
      count_added: add,
    });

    if (recordError) {
      setMessage(recordError.message);
      return;
    }

    await refreshAll();
  }

  async function resetCount() {
    if (!selectedProject) return;

    const ok = window.confirm("确定将该项目计数清零吗？");
    if (!ok) return;

    const { error } = await supabase
      .from("projects")
      .update({ count: 0 })
      .eq("id", selectedProject.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("计数已清零");
    await refreshAll();
  }

  async function uploadStatue(file: File) {
    const ext = file.name.split(".").pop();
    const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("statues")
      .upload(filePath, file);

    if (uploadError) {
      setMessage(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("statues").getPublicUrl(filePath);

    const { error: insertError } = await supabase.from("statues").insert({
      name: file.name,
      file_path: filePath,
      public_url: data.publicUrl,
    });

    if (insertError) {
      setMessage(insertError.message);
      return;
    }

    setMessage("佛像上传成功");
    await refreshAll();
  }

  async function deleteStatue(id: string, filePath: string) {
    const ok = window.confirm("确定删除这个佛像吗？");
    if (!ok) return;

    await supabase.storage.from("statues").remove([filePath]);
    const { error } = await supabase.from("statues").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("佛像已删除");
    await refreshAll();
  }

  async function uploadMusic(file: File) {
    const ext = file.name.split(".").pop();
    const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("music")
      .upload(filePath, file);

    if (uploadError) {
      setMessage(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("music").getPublicUrl(filePath);

    const { error: insertError } = await supabase.from("music_tracks").insert({
      name: file.name,
      file_path: filePath,
      public_url: data.publicUrl,
    });

    if (insertError) {
      setMessage(insertError.message);
      return;
    }

    setMessage("佛乐上传成功");
    await refreshAll();
  }

  async function deleteMusic(id: string, filePath: string) {
    const ok = window.confirm("确定删除这个佛乐吗？");
    if (!ok) return;

    await supabase.storage.from("music").remove([filePath]);
    const { error } = await supabase.from("music_tracks").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("佛乐已删除");
    await refreshAll();
  }

  async function deleteRecord(id: string) {
    const ok = window.confirm("确定删除这条念佛记录吗？");
    if (!ok) return;

    const { error } = await supabase.from("chant_records").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("记录已删除");
    await refreshAll();
  }

  async function createChantText(type: "vow" | "dedication") {
    const title = type === "vow" ? newVowTitle.trim() : newDedTitle.trim();
    const content = type === "vow" ? newVowContent.trim() : newDedContent.trim();

    if (!title || !content) {
      setMessage("标题和内容都要填写");
      return;
    }

    const { error } = await supabase.from("chant_texts").insert({
      type,
      title,
      content,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (type === "vow") {
      setNewVowTitle("");
      setNewVowContent("");
    } else {
      setNewDedTitle("");
      setNewDedContent("");
    }

    setMessage(type === "vow" ? "发愿文已新增" : "回向文已新增");
    await refreshAll();
  }

  function startEditText(item: ChantText) {
    setEditingTextId(item.id);
    setEditingTitle(item.title);
    setEditingContent(item.content);
  }

  async function saveEditedText() {
    if (!editingTextId) return;

    const { error } = await supabase
      .from("chant_texts")
      .update({
        title: editingTitle.trim(),
        content: editingContent.trim(),
      })
      .eq("id", editingTextId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEditingTextId(null);
    setEditingTitle("");
    setEditingContent("");
    setMessage("文本已保存");
    await refreshAll();
  }

  async function deleteText(id: string) {
    const ok = window.confirm("确定删除这条文字吗？");
    if (!ok) return;

    const { error } = await supabase.from("chant_texts").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("文字已删除");
    await refreshAll();
  }

  async function useTextForCurrentProject(item: ChantText) {
    if (!selectedProject) {
      setMessage("请先选择一个项目");
      return;
    }

    const updateData =
      item.type === "vow"
        ? { vow_text: item.content }
        : { dedication_text: item.content };

    const { error } = await supabase
      .from("projects")
      .update(updateData)
      .eq("id", selectedProject.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(item.type === "vow" ? "已设为当前项目发愿文" : "已设为当前项目回向文");
    await refreshAll();
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen text-[#f5ebc8]">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[32px] border border-[#5b78a3] bg-[linear-gradient(180deg,rgba(9,23,46,0.86),rgba(11,31,63,0.82))] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.28)] backdrop-blur-md">
          <div>
            <h1 className="text-4xl font-bold text-[#f0d78a]">念佛计数正式版</h1>
            <p className="mt-2 text-lg text-[#e9ddb8]">当前登录：{userEmail}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-2xl bg-white px-6 py-3 text-lg font-semibold text-black shadow"
          >
            退出登录
          </button>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-[#5b78a3] bg-[rgba(10,25,52,0.82)] px-4 py-3 text-[#f5ebc8] shadow backdrop-blur-md">
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-6">
            <section className="rounded-[30px] border border-[#5b78a3] bg-[linear-gradient(180deg,rgba(9,23,46,0.88),rgba(11,31,63,0.83))] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.22)] backdrop-blur-md">
              <h2 className="mb-4 text-3xl font-bold text-[#f0d78a]">项目管理</h2>

              <div className="space-y-3">
                <input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="输入新项目名称"
                  className="w-full rounded-2xl border border-[#5b78a3] bg-white/10 px-4 py-3 text-[#f8efcf] placeholder:text-[#cdbf95]"
                />
                <button
                  onClick={createProject}
                  className="w-full rounded-2xl bg-white py-3 text-xl font-semibold text-black shadow"
                >
                  创建项目
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={`rounded-2xl border p-4 ${
                      selectedProjectId === project.id
                        ? "border-[#d2a94a] bg-[rgba(210,169,74,0.14)]"
                        : "border-[#5b78a3] bg-white/6"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        className="flex-1 text-left"
                        onClick={() => setSelectedProjectId(project.id)}
                      >
                        <div className="text-lg font-semibold text-[#f5ebc8]">
                          {project.name}
                        </div>
                        <div className="mt-1 text-[#d8cfb1]">计数：{project.count}</div>
                      </button>
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="rounded-xl bg-white px-3 py-2 font-semibold text-black"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] border border-[#5b78a3] bg-[linear-gradient(180deg,rgba(9,23,46,0.88),rgba(11,31,63,0.83))] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.22)] backdrop-blur-md">
              <h2 className="mb-4 text-3xl font-bold text-[#f0d78a]">佛像上传</h2>

              <input
                ref={statueInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadStatue(file);
                }}
              />

              <button
                onClick={() => statueInputRef.current?.click()}
                className="rounded-2xl bg-white px-5 py-3 text-lg font-semibold text-black shadow"
              >
                选择佛像文件
              </button>

              <div className="mt-4 space-y-3">
                {statues.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#5b78a3] bg-white/6 p-3"
                  >
                    <div className="text-[#f5ebc8]">{item.name}</div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-xl bg-white px-3 py-2 font-semibold text-black"
                        onClick={() =>
                          updateProjectSelection({ selected_statue_id: item.id })
                        }
                      >
                        设为当前项目佛像
                      </button>
                      <button
                        className="rounded-xl bg-white px-3 py-2 font-semibold text-black"
                        onClick={() => deleteStatue(item.id, item.file_path)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] border border-[#5b78a3] bg-[linear-gradient(180deg,rgba(9,23,46,0.88),rgba(11,31,63,0.83))] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.22)] backdrop-blur-md">
              <h2 className="mb-4 text-3xl font-bold text-[#f0d78a]">佛乐上传</h2>

              <input
                ref={musicInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadMusic(file);
                }}
              />

              <button
                onClick={() => musicInputRef.current?.click()}
                className="rounded-2xl bg-white px-5 py-3 text-lg font-semibold text-black shadow"
              >
                选择佛乐文件
              </button>

              <div className="mt-4 space-y-3">
                {music.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#5b78a3] bg-white/6 p-3"
                  >
                    <div className="text-[#f5ebc8]">{item.name}</div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-xl bg-white px-3 py-2 font-semibold text-black"
                        onClick={() =>
                          updateProjectSelection({ selected_music_id: item.id })
                        }
                      >
                        设为当前项目佛乐
                      </button>
                      <button
                        className="rounded-xl bg-white px-3 py-2 font-semibold text-black"
                        onClick={() => deleteMusic(item.id, item.file_path)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <main className="space-y-6">
            <section className="rounded-[30px] border border-[#5b78a3] bg-[linear-gradient(180deg,rgba(9,23,46,0.88),rgba(11,31,63,0.83))] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.22)] backdrop-blur-md">
              <h2 className="mb-4 text-4xl font-bold text-[#f0d78a]">当前项目</h2>

              {!selectedProject ? (
                <p className="text-xl text-[#d8cfb1]">请先创建或选择一个项目。</p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="text-2xl font-semibold text-[#f5ebc8]">
                      {selectedProject.name}
                    </div>

                    <div className="text-7xl font-bold text-[#f0d78a]">
                      {selectedProject.count}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => addCount(1)}
                        className="rounded-2xl bg-white px-6 py-4 text-xl font-semibold text-black shadow"
                      >
                        +1 计数
                      </button>

                      <button
                        onClick={resetCount}
                        className="rounded-2xl bg-white px-6 py-4 text-xl font-semibold text-black shadow"
                      >
                        清零
                      </button>

                      <a
  href={`/fullscreen/${selectedProject.id}`}
  target="_blank"
  rel="noreferrer"
  className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-4 text-xl font-semibold shadow"
  style={{ color: "#000000" }}
>
  进入全屏念佛
</a>
                    </div>

                    <div className="rounded-2xl border border-[#5b78a3] bg-white/6 p-4 text-[#e9ddb8]">
                      <div>当前发愿文：{selectedProject.vow_text ? "已设置" : "未设置"}</div>
                      <div className="mt-2">当前回向文：{selectedProject.dedication_text ? "已设置" : "未设置"}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedProject.selected_statue_id ? (
                      <div className="rounded-[28px] border border-[#5b78a3] bg-white/6 p-4 text-center text-[#f5ebc8]">
                        当前已选择佛像：
                        {" "}
                        {statues.find((s) => s.id === selectedProject.selected_statue_id)?.name || "未知佛像"}
                      </div>
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded-[28px] border border-[#5b78a3] bg-white/6 text-[#cfc297]">
                        当前项目还没有选择佛像
                      </div>
                    )}

                    {selectedProject.selected_music_id ? (
                      <div className="rounded-[28px] border border-[#5b78a3] bg-white/6 p-4 text-[#f5ebc8]">
                        当前已选择佛乐：
                        {" "}
                        {music.find((m) => m.id === selectedProject.selected_music_id)?.name || "未知佛乐"}
                      </div>
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded-[28px] border border-[#5b78a3] bg-white/6 text-[#cfc297]">
                        当前项目还没有选择佛乐
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[30px] border border-[#5b78a3] bg-[linear-gradient(180deg,rgba(9,23,46,0.88),rgba(11,31,63,0.83))] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.22)] backdrop-blur-md">
              <h2 className="mb-4 text-4xl font-bold text-[#f0d78a]">发愿文目录</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-[#5b78a3] bg-white/6 p-4">
                  <input
                    value={newVowTitle}
                    onChange={(e) => setNewVowTitle(e.target.value)}
                    placeholder="发愿文标题"
                    className="w-full rounded-2xl border border-[#5b78a3] bg-white/10 px-4 py-3 text-[#f8efcf] placeholder:text-[#cdbf95]"
                  />
                  <textarea
                    value={newVowContent}
                    onChange={(e) => setNewVowContent(e.target.value)}
                    placeholder="发愿文内容"
                    className="min-h-40 w-full rounded-2xl border border-[#5b78a3] bg-white/10 px-4 py-3 text-[#f8efcf] placeholder:text-[#cdbf95]"
                  />
                  <button
                    onClick={() => createChantText("vow")}
                    className="rounded-2xl bg-white px-6 py-3 text-lg font-semibold text-black shadow"
                  >
                    新增发愿文
                  </button>
                </div>

                <div className="space-y-3">
                  {vowTexts.map((item) => (
                    <TextDirectoryCard
                      key={item.id}
                      item={item}
                      editingTextId={editingTextId}
                      editingTitle={editingTitle}
                      editingContent={editingContent}
                      setEditingTitle={setEditingTitle}
                      setEditingContent={setEditingContent}
                      onStartEdit={() => startEditText(item)}
                      onSaveEdit={saveEditedText}
                      onCancelEdit={() => setEditingTextId(null)}
                      onDelete={() => deleteText(item.id)}
                      onUse={() => useTextForCurrentProject(item)}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-[#5b78a3] bg-[linear-gradient(180deg,rgba(9,23,46,0.88),rgba(11,31,63,0.83))] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.22)] backdrop-blur-md">
              <h2 className="mb-4 text-4xl font-bold text-[#f0d78a]">回向文目录</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-[#5b78a3] bg-white/6 p-4">
                  <input
                    value={newDedTitle}
                    onChange={(e) => setNewDedTitle(e.target.value)}
                    placeholder="回向文标题"
                    className="w-full rounded-2xl border border-[#5b78a3] bg-white/10 px-4 py-3 text-[#f8efcf] placeholder:text-[#cdbf95]"
                  />
                  <textarea
                    value={newDedContent}
                    onChange={(e) => setNewDedContent(e.target.value)}
                    placeholder="回向文内容"
                    className="min-h-40 w-full rounded-2xl border border-[#5b78a3] bg-white/10 px-4 py-3 text-[#f8efcf] placeholder:text-[#cdbf95]"
                  />
                  <button
                    onClick={() => createChantText("dedication")}
                    className="rounded-2xl bg-white px-6 py-3 text-lg font-semibold text-black shadow"
                  >
                    新增回向文
                  </button>
                </div>

                <div className="space-y-3">
                  {dedicationTexts.map((item) => (
                    <TextDirectoryCard
                      key={item.id}
                      item={item}
                      editingTextId={editingTextId}
                      editingTitle={editingTitle}
                      editingContent={editingContent}
                      setEditingTitle={setEditingTitle}
                      setEditingContent={setEditingContent}
                      onStartEdit={() => startEditText(item)}
                      onSaveEdit={saveEditedText}
                      onCancelEdit={() => setEditingTextId(null)}
                      onDelete={() => deleteText(item.id)}
                      onUse={() => useTextForCurrentProject(item)}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-[#5b78a3] bg-[linear-gradient(180deg,rgba(9,23,46,0.88),rgba(11,31,63,0.83))] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.22)] backdrop-blur-md">
              <h2 className="mb-4 text-4xl font-bold text-[#f0d78a]">最近念佛记录</h2>

              <div className="space-y-3">
                {records.map((record) => {
                  const projectName =
                    projects.find((p) => p.id === record.project_id)?.name || "未知项目";

                  return (
                    <div
                      key={record.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#5b78a3] bg-white/6 px-4 py-4"
                    >
                      <div>
                        <div className="text-lg text-[#f5ebc8]">项目：{projectName}</div>
                        <div className="mt-1 text-[#e8ddb9]">增加：{record.count_added}</div>
                        <div className="mt-1 text-[#cdbf95]">
                          时间：{new Date(record.created_at).toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteRecord(record.id)}
                        className="rounded-xl bg-white px-3 py-2 font-semibold text-black"
                      >
                        删除
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function TextDirectoryCard({
  item,
  editingTextId,
  editingTitle,
  editingContent,
  setEditingTitle,
  setEditingContent,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onUse,
}: {
  item: ChantText;
  editingTextId: string | null;
  editingTitle: string;
  editingContent: string;
  setEditingTitle: (v: string) => void;
  setEditingContent: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onUse: () => void;
}) {
  const isEditing = editingTextId === item.id;

  return (
    <div className="rounded-2xl border border-[#5b78a3] bg-white/6 p-4">
      {isEditing ? (
        <div className="space-y-3">
          <input
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            className="w-full rounded-2xl border border-[#5b78a3] bg-white/10 px-4 py-3 text-[#f8efcf]"
          />
          <textarea
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            className="min-h-32 w-full rounded-2xl border border-[#5b78a3] bg-white/10 px-4 py-3 text-[#f8efcf]"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onSaveEdit}
              className="rounded-xl bg-white px-3 py-2 font-semibold text-black"
            >
              保存
            </button>
            <button
              onClick={onCancelEdit}
              className="rounded-xl bg-white px-3 py-2 font-semibold text-black"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-xl font-semibold text-[#f5ebc8]">{item.title}</div>
          <div className="mt-2 line-clamp-3 whitespace-pre-wrap text-[#d8cfb1]">
            {item.content}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={onUse}
              className="rounded-xl bg-white px-3 py-2 font-semibold text-black"
            >
              设为当前项目使用
            </button>
            <button
              onClick={onStartEdit}
              className="rounded-xl bg-white px-3 py-2 font-semibold text-black"
            >
              修改
            </button>
            <button
              onClick={onDelete}
              className="rounded-xl bg-white px-3 py-2 font-semibold text-black"
            >
              删除
            </button>
          </div>
        </>
      )}
    </div>
  );
}