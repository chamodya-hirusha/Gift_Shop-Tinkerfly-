import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, Package, Image, Star, MessageSquare, Images, Settings, Download, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function DashboardHome() {
  const [stats, setStats] = useState({ categories: 0, products: 0, images: 0, featured: 0, testimonials: 0, gallery: 0 });
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loadStats = () => {
    const pStr = localStorage.getItem("tinkerfly_products");
    const cStr = localStorage.getItem("tinkerfly_categories");
    const iStr = localStorage.getItem("tinkerfly_product_images");
    const tStr = localStorage.getItem("tinkerfly_testimonials");
    const gStr = localStorage.getItem("tinkerfly_social_gallery");

    const p = pStr ? JSON.parse(pStr) : [];
    const c = cStr ? JSON.parse(cStr) : [];
    const i = iStr ? JSON.parse(iStr) : [];
    const t = tStr ? JSON.parse(tStr) : [];
    const g = gStr ? JSON.parse(gStr) : [];

    setStats({
      categories: c.length,
      products: p.length,
      images: i.length,
      featured: p.filter((prod: any) => prod.is_featured).length,
      testimonials: t.length,
      gallery: g.length,
    });
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleFullExport = () => {
    const data = {
      categories: JSON.parse(localStorage.getItem("tinkerfly_categories") || "[]"),
      products: JSON.parse(localStorage.getItem("tinkerfly_products") || "[]"),
      product_images: JSON.parse(localStorage.getItem("tinkerfly_product_images") || "[]"),
      testimonials: JSON.parse(localStorage.getItem("tinkerfly_testimonials") || "[]"),
      social_gallery: JSON.parse(localStorage.getItem("tinkerfly_social_gallery") || "[]"),
      site_settings: JSON.parse(localStorage.getItem("tinkerfly_site_settings") || "{}"),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tinkerfly-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast({ title: "Backup exported successfully" });
  };

  const handleFullImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        const entities = [
          { key: "categories", storage: "tinkerfly_categories" },
          { key: "products", storage: "tinkerfly_products" },
          { key: "product_images", storage: "tinkerfly_product_images", altKey: "productImages" },
          { key: "testimonials", storage: "tinkerfly_testimonials" },
          { key: "social_gallery", storage: "tinkerfly_social_gallery" },
          { key: "site_settings", storage: "tinkerfly_site_settings" }
        ];

        entities.forEach(entity => {
          const newData = data[entity.key] || (entity.altKey ? data[entity.altKey] : null);
          if (newData) {
            if (entity.key === "site_settings") {
              // Settings are usually just one object, so we merge properties
              const current = JSON.parse(localStorage.getItem(entity.storage) || "{}");
              localStorage.setItem(entity.storage, JSON.stringify({ ...current, ...newData }));
            } else if (Array.isArray(newData)) {
              // Arrays (products, categories, etc.) are merged by ID
              const current = JSON.parse(localStorage.getItem(entity.storage) || "[]");
              const merged = [...current];
              newData.forEach((item: any) => {
                const idx = merged.findIndex((existing: any) => existing.id === item.id);
                if (idx > -1) merged[idx] = item;
                else merged.push(item);
              });
              localStorage.setItem(entity.storage, JSON.stringify(merged));
            }
          }
        });
        
        toast({ title: "Full data import and merge successful!" });
        
        // Refresh all global queries
        queryClient.invalidateQueries({ queryKey: ["public-categories"] });
        queryClient.invalidateQueries({ queryKey: ["popular-products"] });
        queryClient.invalidateQueries({ queryKey: ["nav-categories"] });
        queryClient.invalidateQueries({ queryKey: ["site-settings"] });
        
        loadStats();
      } catch (err: any) {
        toast({ title: "Failed to parse JSON", description: err.message, variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const cards = [
    { label: "Categories", value: stats.categories, icon: FolderOpen, color: "text-primary", link: "/admin/categories" },
    { label: "Products", value: stats.products, icon: Package, color: "text-primary", link: "/admin/products" },
    { label: "Featured", value: stats.featured, icon: Star, color: "text-brand-gold", link: "/admin/products" },
    { label: "Product Images", value: stats.images, icon: Image, color: "text-brand-gold", link: "/admin/products" },
    { label: "Testimonials", value: stats.testimonials, icon: MessageSquare, color: "text-primary", link: "/admin/testimonials" },
    { label: "Gallery Items", value: stats.gallery, icon: Images, color: "text-brand-gold", link: "/admin/social-gallery" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-display font-bold">Dashboard Overview</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button variant="outline" size="sm" className="relative">
              <Upload className="h-4 w-4 mr-2" /> Import Full JSON
              <input 
                type="file" 
                accept=".json" 
                onChange={handleFullImport}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleFullExport}>
            <Download className="h-4 w-4 mr-2" /> Export Full JSON
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(c.link)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/admin/settings")}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Site Settings</CardTitle>
          <Settings className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Manage WhatsApp number, contact info, hero text, about us, social links, and more</p>
        </CardContent>
      </Card>
    </div>
  );
}
