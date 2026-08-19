"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface PageTitleValue {
  title: string;
  description?: string;
  setTitle: (title: string, description?: string) => void;
}

const PageTitleContext = createContext<PageTitleValue | null>(null);

export function usePageTitle(): PageTitleValue {
  const ctx = useContext(PageTitleContext);
  if (!ctx) throw new Error("usePageTitle debe usarse dentro de PageTitleProvider");
  return ctx;
}

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string | undefined>(undefined);

  const set = useCallback((nextTitle: string, nextDescription?: string) => {
    setTitle(nextTitle);
    setDescription(nextDescription);
  }, []);

  return (
    <PageTitleContext.Provider value={{ title, description, setTitle: set }}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function PageTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  const { setTitle } = usePageTitle();

  useEffect(() => {
    setTitle(title, description);
  }, [title, description, setTitle]);

  return null;
}
