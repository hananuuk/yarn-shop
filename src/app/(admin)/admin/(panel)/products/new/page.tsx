import Link from "next/link";
import { COLOR_FAMILIES, MATERIALS } from "@/config";
import { listBrands } from "@/lib/products";
import { ProductForm } from "../ProductForm";

export const metadata = { title: "New product" };

export default async function NewProduct() {
  const brands = [...new Set([...(await listBrands("yarn")), ...(await listBrands("supplies"))])];
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link href="/admin/products" className="btn-ghost no-underline">← Products</Link>
      <h1 className="text-4xl font-semibold tracking-tight">New product</h1>
      <ProductForm
        brands={brands}
        materials={[...MATERIALS]}
        families={[...COLOR_FAMILIES]}
        values={{
          category: "yarn", brand: "", nameMn: "", nameEn: "", colorNameMn: "", colorNameEn: "", colorHex: "#D9CBB0",
          colorFamily: "neutral", material: "wool", needleMinMm: "", needleMaxMm: "", weightG: "100", lengthM: "",
          descriptionMn: "", descriptionEn: "", price: "", salePrice: "", stock: "0", isActive: true, isNew: true,
        }}
      />
    </div>
  );
}
