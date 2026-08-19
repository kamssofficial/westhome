"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

interface ContentPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  isPublished: boolean;
}

export default function AdminContentPage() {
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ContentPage | null>(null);

  const defaultPages = [
    { slug: "about", title: "About Us" },
    { slug: "contact", title: "Contact" },
    { slug: "faq", title: "FAQ" },
  ];

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const res = await fetch("/api/content");
      if (res.ok) {
        const data = await res.json();
        setPages(data.pages || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      const res = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (res.ok) {
        toast.success("Content saved");
        setEditing(null);
        fetchPages();
      }
    } catch {
      toast.error("Failed to save");
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Content Pages</h1>

      <div className="space-y-2">
        {defaultPages.map((dp) => {
          const existing = pages.find((p) => p.slug === dp.slug);
          return (
            <div key={dp.slug} className="bg-white rounded-xl border border-border-light p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{dp.title}</p>
                  <p className="text-xs text-text-muted">
                    {existing ? "Configured" : "Using default content"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setEditing(
                      editing?.slug === dp.slug
                        ? null
                        : {
                            id: existing?.id || "",
                            slug: dp.slug,
                            title: existing?.title || dp.title,
                            content: existing?.content || "",
                            isPublished: existing?.isPublished ?? true,
                          }
                    )
                  }
                >
                  {editing?.slug === dp.slug ? "Close" : "Edit"}
                </Button>
              </div>
              {editing?.slug === dp.slug && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1 block">Title</label>
                    <input
                      type="text"
                      value={editing.title}
                      onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1 block">Content</label>
                    <textarea
                      value={editing.content}
                      onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 min-h-[200px] resize-y"
                      rows={10}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <Button onClick={handleSave} size="sm">Save</Button>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editing.isPublished}
                        onChange={(e) => setEditing({ ...editing, isPublished: e.target.checked })}
                        className="accent-accent"
                      />
                      Published
                    </label>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
