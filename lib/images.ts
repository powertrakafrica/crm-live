// Image URL selection for the property variant pipeline (spec §1.6).
//
// The backend now stores up to three sharp-generated variants per property
// image alongside the original full-res `url`:
//   thumbUrl   -> 400x300   (cards / grid)
//   listingUrl -> 1200x800  (search + listing hero)
//   galleryUrl -> 1600x1200 (detail gallery)
// Each is nullable (legacy rows / failed variant generation), so every caller
// must fall back to the original `url`. Centralizing that fallback here keeps
// the variant-awareness out of the components.

export type ImageVariantSize = "gallery" | "listing" | "thumb";

export interface PropertyImageLike {
  galleryUrl?: string | null;
  listingUrl?: string | null;
  thumbUrl?: string | null;
  url: string;
}

/**
 * Pick the best image URL for a display size, falling back to the original
 * full-res `url` when the variant is absent (or `undefined` when there is no
 * image at all — callers supply their own placeholder).
 */
export function imageVariantUrl(
  img: PropertyImageLike | null | undefined,
  size: ImageVariantSize,
): string | undefined {
  if (!img) return undefined;
  const variant =
    size === "thumb" ? img.thumbUrl : size === "listing" ? img.listingUrl : img.galleryUrl;
  return variant ?? img.url;
}