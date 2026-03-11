"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { UploadCloud, File, Trash2, Eye, Download } from "lucide-react";

interface Document {
  id: string;
  patient_id: string;
  file_name: string;
  file_type?: string;
  category?: string;
  document_type?: string;
  file_url: string;
  created_at: string;
}

interface PatientDocumentsProps {
  patientId: string;
}

export function PatientDocuments({ patientId }: PatientDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("radiography");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const supabase = createClient();

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur de chargement des documents.");
    } else {
      setDocuments(data || []);
    }
    setIsLoading(false);
  }, [patientId, supabase]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Veuillez sélectionner un fichier.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${patientId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("patient-documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;
      setUploadProgress(60);

      // 2. Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from("patient-documents")
        .getPublicUrl(filePath);

      setUploadProgress(80);

      // 3. Save reference in DB
      const { error: dbError } = await supabase.from("documents").insert({
        patient_id: patientId,
        file_name: file.name,
        document_type: category, // DB schema uses document_type instead of category
        file_url: publicUrlData.publicUrl,
      });

      if (dbError) throw dbError;

      setUploadProgress(100);
      toast.success("Document importé avec succès.");
      setIsDialogOpen(false);

      // Reset form
      setFile(null);
      setCategory("radiography");

      // Refresh list
      fetchDocuments();
    } catch (error: unknown) {
      console.error("Upload error:", error);
      const errMsg = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error("Échec de l'upload: " + errMsg);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Supprimer le document ${doc.file_name} ?`)) return;

    try {
      // Extract file path from URL or reconstruct it
      // For public URL the path is usually at the end.
      // Better approach if we stored the storage path, but we can reconstruct:
      const urlParts = doc.file_url.split("/");
      const filePath = `${patientId}/${urlParts[urlParts.length - 1]}`;

      // 1. Delete from Storage
      const { error: storageError } = await supabase.storage
        .from("patient-documents")
        .remove([filePath]);

      if (storageError) throw storageError;

      // 2. Delete from DB
      const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;

      toast.success("Document supprimé.");
      setDocuments((docs) => docs.filter((d) => d.id !== doc.id));
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error("Erreur lors de la suppression: " + errMsg);
    }
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      radiography: "Radiographie",
      scan: "Scanner 3D",
      prescription: "Ordonnance",
      consent: "Consentement",
      other: "Autre",
    };
    return labels[cat] || cat || "Inconnu";
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "radiography":
        return {
          backgroundColor: "rgba(219, 234, 254, 0.5)",
          color: "#1d4ed8",
          borderColor: "#bfdbfe",
        };
      case "scan":
        return {
          backgroundColor: "rgba(243, 232, 255, 0.5)",
          color: "#7e22ce",
          borderColor: "#e9d5ff",
        };
      case "prescription":
        return {
          backgroundColor: "rgba(209, 250, 229, 0.5)",
          color: "#047857",
          borderColor: "#a7f3d0",
        };
      case "consent":
        return {
          backgroundColor: "rgba(254, 243, 199, 0.5)",
          color: "#b45309",
          borderColor: "#fde68a",
        };
      default:
        return {
          backgroundColor: "rgba(241, 245, 249, 0.5)",
          color: "#334155",
          borderColor: "#e2e8f0",
        };
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Imagerie et Documents</CardTitle>
          <CardDescription>
            Gérez les radiographies, scanners et fichiers du patient.
          </CardDescription>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger>
            <div className="flex items-center justify-center px-4 py-2 border rounded-md hover:bg-slate-100 transition-colors text-sm font-medium">
              <UploadCloud className="w-4 h-4 mr-2" />
              Nouveau Fichier
            </div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un document</DialogTitle>
              <DialogDescription>
                Téléversez un fichier pour ce patient. Taille max 50MB.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select
                  value={category}
                  onValueChange={(val) => setCategory(val || "radiography")}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="radiography">Radiographie</SelectItem>
                    <SelectItem value="scan">Scanner 3D</SelectItem>
                    <SelectItem value="prescription">Ordonnance</SelectItem>
                    <SelectItem value="consent">Consentement</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">Fichier</Label>
                <Input id="file" type="file" onChange={handleFileChange} />
              </div>
              {isUploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} />
                  <p className="text-xs text-center text-muted-foreground">
                    Upload en cours...
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isUploading}
              >
                Annuler
              </Button>
              <Button onClick={handleUpload} disabled={isUploading || !file}>
                {isUploading ? "Traitement..." : "Envoyer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Chargement des documents...
          </p>
        ) : documents.length === 0 ? (
          <div className="border-dashed border-2 rounded-md p-8 text-center bg-gray-50">
            <UploadCloud className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Aucun document</p>
            <p className="text-xs text-muted-foreground mt-1">
              Les fichiers importés apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-md hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="bg-primary/10 p-2 rounded text-primary">
                    <File className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p
                      className="text-sm font-medium truncate"
                      title={doc.file_name}
                    >
                      {doc.file_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className="font-normal px-2 space-x-1"
                        style={getCategoryColor(
                          doc.document_type || doc.category || "",
                        )}
                      >
                        {getCategoryLabel(
                          doc.document_type || doc.category || "",
                        )}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 ml-4 shrink-0">
                  <Button variant="ghost" size="icon">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Voir"
                      className="flex items-center justify-center w-full h-full"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="icon">
                    <a
                      href={doc.file_url}
                      download
                      title="Télécharger"
                      className="flex items-center justify-center w-full h-full"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(doc)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
