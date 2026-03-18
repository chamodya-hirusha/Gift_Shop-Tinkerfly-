import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";

interface GalleryItem {
  id: string;
  image_url: string;
  caption: string;
  link_url: string;
  is_active: boolean;
  sort_order: number;
}

const defaultForm = {
  image_url: "",
  caption: "",
  link_url: "",
  is_active: true,
  sort_order: 0,
};

export default function SocialGalleryManager() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchData = async () => {
    const raw = localStorage.getItem("tinkerfly_social_gallery");
    if (raw) {
      const parsed = JSON.parse(raw);
      setItems(parsed.sort((a: GalleryItem, b: GalleryItem) => a.sort_order - b.sort_order));
    } else {
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...defaultForm, sort_order: items.length });
    setDialogOpen(true);
  };

  const openEdit = (g: GalleryItem) => {
    setEditing(g);
    setForm({ image_url: g.image_url, caption: g.caption, link_url: g.link_url, is_active: g.is_active, sort_order: g.sort_order });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("key", "d780a2a4ef3db8699ca4d25a35c8d49a");
    formData.append("image", file);

    try {
      const res = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setForm(f => ({ ...f, image_url: data.data.url }));
      } else {
        toast({ title: "Upload failed", description: data.error?.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Upload error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    // Read latest from storage to avoid stale state
    const sStr = localStorage.getItem("tinkerfly_social_gallery");
    const currentItems = sStr ? JSON.parse(sStr) : [];

    if (editing) {
      const index = currentItems.findIndex((i: any) => i.id === editing.id);
      if (index > -1) {
        currentItems[index] = { ...currentItems[index], ...form };
      }
      toast({ title: "Gallery item updated" });
    } else {
      currentItems.push({ id: "gallery-" + Date.now(), ...form });
      toast({ title: "Gallery item created" });
    }

    localStorage.setItem("tinkerfly_social_gallery", JSON.stringify(currentItems));
    setDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["public-gallery"] });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this gallery item?")) return;
    const currentItems = items.filter(i => i.id !== id);
    localStorage.setItem("tinkerfly_social_gallery", JSON.stringify(currentItems));
    toast({ title: "Gallery item deleted" });
    queryClient.invalidateQueries({ queryKey: ["public-gallery"] });
    fetchData();
  };

  const toggleActive = async (g: GalleryItem) => {
    const currentItems = items.map(i => i.id === g.id ? { ...i, is_active: !i.is_active } : i);
    localStorage.setItem("tinkerfly_social_gallery", JSON.stringify(currentItems));
    queryClient.invalidateQueries({ queryKey: ["public-gallery"] });
    fetchData();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">Social Gallery</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Gallery Item</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit Gallery Item" : "New Gallery Item"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Image</Label>
                {form.image_url && (
                  <img src={form.image_url} alt="Preview" className="w-full h-40 object-cover rounded-lg mb-2" />
                )}
                <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
              </div>
              <div className="space-y-2">
                <Label>Caption</Label>
                <Input value={form.caption} onChange={(e) => setForm(f => ({ ...f, caption: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Link (optional)</Label>
                <Input value={form.link_url} onChange={(e) => setForm(f => ({ ...f, link_url: e.target.value }))} placeholder="https://instagram.com/..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input type="number" value={form.sort_order} onChange={(e) => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
                  <Label>Active</Label>
                </div>
              </div>
              <Button onClick={handleSave} className="w-full" disabled={!form.image_url}>
                {editing ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Upload className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No gallery items yet. Add images from your social media.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((g) => (
            <Card key={g.id} className="overflow-hidden group relative">
              <img src={g.image_url} alt={g.caption} className="aspect-square object-cover w-full" />
              <div className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
                <p className="text-white text-xs text-center font-medium line-clamp-2">{g.caption}</p>
                <div className="flex gap-1">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(g)}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="secondary" size="sm" onClick={() => toggleActive(g)}>
                    {g.is_active ? "Hide" : "Show"}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(g.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
              {!g.is_active && (
                <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">Hidden</div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
