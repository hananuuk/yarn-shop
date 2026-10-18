"use client";

import { useActionState, useState } from "react";
import { saveProductAction, type ProductFormState } from "../actions";

export type ProductValues = {
  id?: number;
  category: string; brand: string; nameMn: string; nameEn: string; colorNameMn: string; colorNameEn: string;
  colorHex: string; colorFamily: string; material: string; needleMinMm: string; needleMaxMm: string;
  weightG: string; lengthM: string; descriptionMn: string; descriptionEn: string;
  price: string; salePrice: string; stock: string; isActive: boolean; isNew: boolean;
};

export function ProductForm({ values, brands, materials, families }: { values: ProductValues; brands: string[]; materials: string[]; families: string[] }) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(saveProductAction, {});
  const [category, setCategory] = useState(values.category);
  const [hex, setHex] = useState(values.colorHex);
  const [previews, setPreviews] = useState<string[]>([]);

  // Phone photos are often 5–10 MB. Shrink them in the browser before upload
  // (max 1600 px, JPEG) so several fit in one save and pages load fast.
  async function submit(fd: FormData) {
    const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
    fd.delete("images");
    for (const f of files) fd.append("images", await shrink(f), f.name.replace(/\.\w+$/, "") + ".jpg");
    return action(fd);
  }

  return (
    <form action={submit} className="flex flex-col gap-8">
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <Section title="Basics">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="label">Type
            <select name="category" value={category} onChange={(e) => setCategory(e.target.value)} className="field">
              <option value="yarn">Yarn</option>
              <option value="supplies">Supplies</option>
            </select>
          </label>
          <label className="label sm:col-span-2">Brand
            <input name="brand" list="brands" defaultValue={values.brand} className="field" />
            <datalist id="brands">{brands.map((b) => <option key={b} value={b} />)}</datalist>
          </label>
          <label className="label">Name (Mongolian) *<input name="nameMn" required defaultValue={values.nameMn} className="field" /></label>
          <label className="label sm:col-span-2">Name (English)<input name="nameEn" defaultValue={values.nameEn} className="field" /></label>
        </div>
      </Section>

      <Section title="Colour">
        <div className="grid gap-4 sm:grid-cols-4">
          <label className="label">Colour name (MN)<input name="colorNameMn" defaultValue={values.colorNameMn} className="field" /></label>
          <label className="label">Colour name (EN)<input name="colorNameEn" defaultValue={values.colorNameEn} className="field" /></label>
          <label className="label">Swatch
            <span className="flex items-center gap-2">
              <input type="color" name="colorHex" value={hex} onChange={(e) => setHex(e.target.value)} className="h-11 w-14 cursor-pointer rounded-lg border border-[#CFC7BA] bg-white p-1" />
              <span className="font-mono text-xs text-muted">{hex}</span>
            </span>
          </label>
          <label className="label">Colour group (for filters)
            <select name="colorFamily" defaultValue={values.colorFamily} className="field">
              {families.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
        </div>
        <p className="text-xs text-muted">The swatch colour is used for the drawn placeholder until you upload photos.</p>
      </Section>

      {category === "yarn" ? (
        <Section title="Yarn details">
          <div className="grid gap-4 sm:grid-cols-5">
            <label className="label">Material
              <select name="material" defaultValue={values.material} className="field">
                {materials.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="label">Needle from (mm)<input name="needleMinMm" inputMode="decimal" defaultValue={values.needleMinMm} className="field" /></label>
            <label className="label">Needle to (mm)<input name="needleMaxMm" inputMode="decimal" defaultValue={values.needleMaxMm} className="field" /></label>
            <label className="label">Weight (g)<input name="weightG" inputMode="numeric" defaultValue={values.weightG} className="field" /></label>
            <label className="label">Length (m)<input name="lengthM" inputMode="numeric" defaultValue={values.lengthM} className="field" /></label>
          </div>
        </Section>
      ) : (
        <Section title="Supply details">
          <div className="grid gap-4 sm:grid-cols-4">
            <label className="label">Needle size (mm, if any)<input name="needleMinMm" inputMode="decimal" defaultValue={values.needleMinMm} className="field" /></label>
          </div>
        </Section>
      )}

      <Section title="Price & stock">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="label">Price (₮) *<input name="price" inputMode="numeric" required defaultValue={values.price} className="field" /></label>
          <label className="label">Sale price (₮)<input name="salePrice" inputMode="numeric" defaultValue={values.salePrice} placeholder="Leave empty = not on sale" className="field" /></label>
          <label className="label">In stock *<input name="stock" type="number" min={0} required defaultValue={values.stock} className="field" /></label>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" name="isActive" defaultChecked={values.isActive} className="size-5 accent-ink" /> Show in shop</label>
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" name="isNew" defaultChecked={values.isNew} className="size-5 accent-ink" /> Mark as “New”</label>
        </div>
      </Section>

      <Section title="Description">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="label">Mongolian<textarea name="descriptionMn" rows={4} defaultValue={values.descriptionMn} className="field py-2" /></label>
          <label className="label">English<textarea name="descriptionEn" rows={4} defaultValue={values.descriptionEn} className="field py-2" /></label>
        </div>
      </Section>

      <Section title="Add photos">
        <input
          type="file"
          name="images"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => setPreviews(Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f)))}
          className="text-sm file:mr-3 file:min-h-11 file:rounded-full file:border file:border-ink file:bg-white file:px-5 file:font-semibold"
        />
        {previews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {previews.map((src) => <img key={src} src={src} alt="" className="size-20 rounded-lg object-cover" />)}
          </div>
        )}
        <p className="text-xs text-muted">JPG, PNG or WebP. Large phone photos are shrunk automatically. Use the same background and light for every product.</p>
      </Section>

      {state.error && <p className="rounded-xl bg-[#FBEAE7] p-4 text-sm font-semibold text-accent" role="alert">{state.error}</p>}
      <div className="sticky bottom-0 -mx-2 flex gap-3 border-t border-line bg-[#FAF8F4] px-2 py-4">
        <button className="btn px-10" disabled={pending}>{pending ? "Saving…" : values.id ? "Save changes" : "Create product"}</button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="card flex flex-col gap-4 p-6">
      <legend className="sr-only">{title}</legend>
      <h2 className="text-lg font-semibold" aria-hidden="true">{title}</h2>
      {children}
    </fieldset>
  );
}

async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}
