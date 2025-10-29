"use client";

import { useEffect, useState, useRef } from "react";
import { supabaseBrowser } from "../supabase/client";

type MessageRow = {
  id: string;
  sender_id: string;
  body: string | null;
  file_url: string | null;
  created_at: string;
};

export default function Chat({
  otherUserId,
  requestId,
}: {
  otherUserId: string;
  requestId?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // auto-scroll when messages update
  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  // load messages
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const sb = supabaseBrowser();
        const { data: session } = await sb.auth.getSession();
        const token = session.session?.access_token;

        if (!token) throw new Error("Not authenticated");

        const params = new URLSearchParams();
        params.set("other", otherUserId);
        if (requestId) params.set("request", requestId);

        const res = await fetch(`/api/messages?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();

        if (!res.ok || !json.ok) throw new Error(json?.error || "Fetch failed");

        if (!cancelled) setMessages(json.messages ?? []);
      } catch (e) {
        if (!cancelled)
          setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [otherUserId, requestId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setErr(null);

      const sb = supabaseBrowser();
      const { data: me } = await sb.auth.getUser();
      if (!me?.user) throw new Error("Not signed in");

      const filePath = `${me.user.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await sb.storage
        .from("messages")
        .upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = sb.storage
        .from("messages")
        .getPublicUrl(filePath);

      setFileUrl(publicUrlData.publicUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  async function send() {
    if (!draft.trim() && !fileUrl) return;
    try {
      const sb = supabaseBrowser();
      const { data: session } = await sb.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          other_id: otherUserId,
          request_id: requestId ?? null,
          body: draft.trim() || null,
          file_url: fileUrl || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || "Failed to send");

      // refresh message list
      setMessages((prev) => [
        ...prev,
        {
          id: json.message_id ?? `temp-${Date.now()}`,
          sender_id: "me",
          body: draft.trim() || null,
          file_url: fileUrl || null,
          created_at: new Date().toISOString(),
        },
      ]);

      setDraft("");
      setFileUrl(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="border rounded p-4 max-w-md bg-white shadow-sm">
      <h2 className="font-semibold mb-3">Messages</h2>

      {err && <p className="text-red-600 text-sm mb-2">Error: {err}</p>}

      <div
        ref={scrollRef}
        className="space-y-2 max-h-64 overflow-y-auto border rounded p-2 bg-gray-50"
      >
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-gray-500">No messages yet.</p>
        )}

        {messages.map((m) => (
          <div key={m.id} className="text-sm p-1 rounded">
            <div className="text-gray-400 text-[10px]">
              {new Date(m.created_at).toLocaleString()}
            </div>
            {m.body && <div className="whitespace-pre-wrap">{m.body}</div>}
            {m.file_url && (
              <a
                href={m.file_url}
                target="_blank"
                className="text-xs text-purple-700 underline break-all"
              >
                Attachment
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {fileUrl && (
          <div className="text-xs text-green-700">
            File attached: {fileUrl.split("/").pop()}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            className="flex-1 border rounded px-2 py-1 text-sm"
            placeholder="Type your message…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <label className="text-xs text-purple-700 hover:underline cursor-pointer">
            {uploading ? "Uploading..." : "Attach"}
            <input
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
          <button
            onClick={send}
            className="bg-purple-700 text-white text-sm px-3 py-1 rounded disabled:opacity-50"
            disabled={uploading || (!draft && !fileUrl)}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
