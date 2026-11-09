import { useEffect } from "react";

/**
 * Keeps the document title (and, optionally, the meta description) in sync
 * with the page the visitor is actually on.
 */
export function useDocumentTitle(title: string, description?: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    const previousDescription = meta?.content;

    if (meta && description) meta.content = description;

    return () => {
      document.title = previousTitle;
      if (meta && previousDescription) meta.content = previousDescription;
    };
  }, [title, description]);
}
