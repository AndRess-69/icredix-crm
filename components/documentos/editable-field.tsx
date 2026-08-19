"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DocField {
  id: string;
  label: string;
  w?: 2;
  type?: "bool";
}

function EditableField({
  field,
  value,
  onChange,
}: {
  field: DocField;
  value: string;
  onChange: (value: string) => void;
}) {
  const span = field.w === 2 ? "sm:col-span-2" : "";

  if (field.type === "bool") {
    return (
      <div className={`flex flex-col gap-1.5 ${span}`}>
        <Label className="text-xs text-muted-foreground">{field.label}</Label>
        <div className="flex gap-2">
          {["Sí", "No"].map((opt) => {
            const active = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 ${span}`}>
      <Label className="text-xs text-muted-foreground">{field.label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
      />
    </div>
  );
}

export { EditableField, type DocField };
