"use client";

import { useCallback, useEffect, useState } from "react";

export type DesignAnalysis = {
  summary: string;
  palette: { name: string; hex: string }[];
  keyChanges: string[];
  shoppingList: { item: string; note: string }[];
};

/** A saved design, as returned by /api/designs (see backend/app/schemas.py). */
export type SavedDesign = {
  id: string;
  title: string | null;
  roomType: string;
  style: string;
  userPrompt: string;
  strength: number;
  seed: number;
  imagePrompt: string;
  analysis: DesignAnalysis | null;
  llmModel: string | null;
  engine: "sd15" | "demo";
  durationMs: number;
  createdAt: number;
  beforeUrl: string;
  afterUrl: string;
};

export type DesignRequest = {
  /** JPEG data URL of the room photo. */
  photo: string;
  roomType: string;
  style: string;
  prompt: string;
  /** 0–1: how far the AI may move away from the original photo. */
  strength: number;
};

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed (${res.status}).`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/** Plans (Claude), renders (Stable Diffusion) and saves a design in one call. */
export async function createDesign(req: DesignRequest, signal?: AbortSignal) {
  const body = new FormData();
  body.append("image", await (await fetch(req.photo)).blob(), "room.jpg");
  body.append("room_type", req.roomType);
  body.append("style", req.style);
  body.append("prompt", req.prompt);
  body.append("strength", String(req.strength));
  return request<SavedDesign>("/api/designs", { method: "POST", body, signal });
}

export type Allowance = {
  designLimit: number | null;
  designsRemaining: number | null;
};

/** How many designs the user has left (null = unlimited). */
export function useAllowance() {
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const refresh = useCallback(() => {
    request<Allowance>("/api/me")
      .then(setAllowance)
      .catch(() => {});
  }, []);
  useEffect(refresh, [refresh]);
  return { allowance, refresh };
}

/** The signed-in user's designs, loaded from the database. */
export function useDesigns() {
  const [designs, setDesigns] = useState<SavedDesign[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    request<SavedDesign[]>("/api/designs")
      .then((d) => !cancelled && setDesigns(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const remove = useCallback(async (id: string) => {
    let removed: SavedDesign | undefined;
    // Optimistic: hide immediately, restore on failure.
    setDesigns((prev) => {
      removed = prev?.find((d) => d.id === id);
      return prev?.filter((d) => d.id !== id) ?? prev;
    });
    try {
      await request(`/api/designs/${id}`, { method: "DELETE" });
    } catch (e) {
      setError((e as Error).message);
      if (removed) {
        const restored = removed;
        setDesigns((prev) => [...(prev ?? []), restored].sort((a, b) => b.createdAt - a.createdAt));
      }
    }
  }, []);

  return { designs, error, remove };
}
