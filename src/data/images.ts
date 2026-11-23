/**
 * Image helpers shared by the product data files.
 *
 * - `img(id)` builds a remote Unsplash URL.
 * - `localImg(moduleId)` resolves a bundled asset via `require()`.
 *
 * Bundled assets (the mapped product images) must stay in `assets/images/`
 * and keep their original filenames so every product card, color gallery
 * and cart line keeps rendering the real image it always had.
 */

import { Asset } from "expo-asset";

export const img = (id: string, w = 700) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;

export const localImg = (moduleId: number) => Asset.fromModule(moduleId).uri;

// ---- Bundled product images (mapped per product/color; see IMPLEMENTATION) ----

/**
 * Product 1 — "Grey dress.jpg": gray dress, the pleated dress's main image.
 * Verified by pixel sampling: dominant tones #b2b4b0 / #ced1cd / #eef1ec.
 */
export const GREY_DRESS = localImg(require("../../assets/images/Grey dress.jpg"));

/**
 * Product 1 — Burgundy dress (Unsplash, verified red tones: #b00018, #ce0014).
 */
export const BURGUNDY_PLATEAU_DRESS = img("photo-1595777457583-95e059d581b8");

/**
 * Product 5 — Burgundy dress ("burgendy dress.jpg", verified Burgundy tones).
 */
export const BURGENDY_LINEN_DRESS = localImg(require("../../assets/images/burgendy dress.jpg"));

/**
 * Product 5 — first linen dress image (Unsplash; light gray tone #ada7a2).
 */
export const LINEN_GRAY_DRESS = img("photo-1515372039744-b8f02a3ae446");
