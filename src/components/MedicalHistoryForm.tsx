"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateMedicalHistory } from "@/app/actions/patient";
import { toast } from "sonner";
import { Save, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface MedicalHistoryProps {
  patientId: string;
  initialHistory: Record<string, unknown> | null;
}

export function MedicalHistoryForm({
  patientId,
  initialHistory,
}: MedicalHistoryProps) {
  const initialTags: string[] = Array.isArray(initialHistory?.tags)
    ? (initialHistory?.tags as string[])
    : [];

  // Migrate old 'notes' string to a tag if it exists and tags is empty
  if (initialTags.length === 0 && initialHistory?.notes) {
    initialTags.push(initialHistory.notes as string);
  }

  const [tags, setTags] = useState<string[]>(initialTags);
  const [newTag, setNewTag] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    if (!tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
    }
    setNewTag("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSave = async () => {
    setIsSaving(true);

    const result = await updateMedicalHistory(
      patientId,
      initialHistory,
      tags,
      "", // Clear out old notes now that we migrated them
    );

    if (!result.success) {
      toast.error("Erreur : " + result.error);
    } else {
      toast.success("Antécédents médicaux mis à jour avec succès.");
      router.refresh();
    }

    setIsSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Antécédents Médicaux</CardTitle>
        <CardDescription>
          Historique de santé, allergies, et remarques générales sur le patient.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Allergie à la Pénicilline, Diabète..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button type="button" variant="secondary" onClick={handleAddTag}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[50px] p-4 bg-slate-50 border rounded-md">
            {tags.length === 0 ? (
              <span className="text-sm text-muted-foreground flex items-center justify-center w-full">
                Aucun antécédent enregistré.
              </span>
            ) : (
              tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="destructive"
                  className="text-sm py-1 px-3"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 hover:text-red-300 transition-colors focus:outline-none"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </CardFooter>
    </Card>
  );
}
