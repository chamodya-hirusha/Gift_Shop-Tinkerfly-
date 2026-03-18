import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Category = Tables<"categories">;

export default function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", description: "", sort_order: 0, is_active: true, cover_image: "" });
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchCategories = async () => {
    const raw = localStorage.getItem("tinkerfly_categories");
    if (raw) {
      const parsed = JSON.parse(raw);
      setCategories(parsed.sort((a: Category, b: Category) => a.sort_order - b.sort_order));
    } else {
      setCategories([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", sort_order: categories.length, is_active: true, cover_image: "" });
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description ?? "", sort_order: cat.sort_order, is_active: cat.is_active, cover_image: cat.cover_image ?? "" });
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
        setForm((f) => ({ ...f, cover_image: data.data.url }));
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
    const payload = { name: form.name, description: form.description || null, sort_order: form.sort_order, is_active: form.is_active, cover_image: form.cover_image || null };
    const cStr = localStorage.getItem("tinkerfly_categories");
    const currentCats = cStr ? JSON.parse(cStr) : [];

    if (editing) {
      const index = currentCats.findIndex((c: any) => c.id === editing.id);
      if (index > -1) {
        currentCats[index] = { ...currentCats[index], ...payload } as Category;
      }
      toast({ title: "Category updated" });
    } else {
      currentCats.push({ id: "cat-" + Date.now(), ...payload } as any);
      toast({ title: "Category created" });
    }

    localStorage.setItem("tinkerfly_categories", JSON.stringify(currentCats));
    toast({ title: editing ? "Category updated" : "Category created" });
    setDialogOpen(false);
    
    // Refresh UI
    queryClient.invalidateQueries({ queryKey: ["nav-categories"] });
    queryClient.invalidateQueries({ queryKey: ["public-categories"] });
    
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category? All products in it will need reassignment.")) return;
    const currentCats = categories.filter(c => c.id !== id);
    localStorage.setItem("tinkerfly_categories", JSON.stringify(currentCats));
    toast({ title: "Category deleted" });
    queryClient.invalidateQueries({ queryKey: ["nav-categories"] });
    queryClient.invalidateQueries({ queryKey: ["public-categories"] });
    fetchCategories();
  };

  const toggleActive = async (cat: Category) => {
    const currentCats = categories.map(c => c.id === cat.id ? { ...c, is_active: !c.is_active } : c);
    localStorage.setItem("tinkerfly_categories", JSON.stringify(currentCats));
    fetchCategories();
  };

  const handleExportJSON = () => {
    const data = { categories };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "categories-data.json";
    a.click();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.categories) {
          localStorage.setItem("tinkerfly_categories", JSON.stringify(data.categories));
        } else if (Array.isArray(data)) {
          localStorage.setItem("tinkerfly_categories", JSON.stringify(data));
        }
        toast({ title: "JSON categories imported successfully!" });
        fetchCategories();
      } catch (err: any) {
        toast({ title: "Failed to parse JSON", description: err.message, variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-display font-bold">Categories</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="file" accept=".json" onChange={handleImportJSON} className="w-auto h-9 text-sm p-1" />
          <Button variant="outline" size="sm" onClick={handleExportJSON}>Export JSON</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Category</Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Roses – Normal Wrapping" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Cover Image</Label>
                <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                {form.cover_image && <img src={form.cover_image} alt="preview" className="h-20 w-20 object-cover rounded-lg" />}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
                  <Label>Active</Label>
                </div>
              </div>
              <Button onClick={handleSave} className="w-full" disabled={!form.name || uploading}>
                {editing ? "Update Category" : "Create Category"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat, i) => (
                <TableRow key={cat.id}>
                  <TableCell><GripVertical className="h-4 w-4 text-muted-foreground" /></TableCell>
                  <TableCell>
                    {cat.cover_image ? (
                      <img src={cat.cover_image} alt={cat.name} className="h-10 w-10 rounded-md object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">N/A</div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell>
                    <Switch checked={cat.is_active} onCheckedChange={() => toggleActive(cat)} />
                  </TableCell>
                  <TableCell>{cat.sort_order}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(cat.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No categories yet. Click "Add Category" to create one.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
