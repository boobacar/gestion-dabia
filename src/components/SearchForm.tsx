"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRef, useState } from "react";

export function SearchForm() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const timeoutRef = useRef<NodeJS.Timeout>(null);
  const [term, setTerm] = useState(searchParams.get("q")?.toString() || "");

  const handleSearch = (newTerm: string) => {
    setTerm(newTerm);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      params.set("page", "1"); // reset to page 1 entirely on new search
      if (newTerm) {
        params.set("q", newTerm);
      } else {
        params.delete("q");
      }
      replace(`${pathname}?${params.toString()}`);
    }, 400);
  };

  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Rechercher (nom, prénom, n°...)"
        className="pl-8"
        value={term}
        onChange={(e) => handleSearch(e.target.value)}
      />
    </div>
  );
}
