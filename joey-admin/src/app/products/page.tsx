"use client";

import { useEffect, useState } from "react";
import { dataStore } from "@/lib/dataStore";
import type { Product, ProductSize } from "@/lib/types";
import { Edit2, Plus, X, Trash2 } from "lucide-react";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    setProducts(dataStore.getProducts());
    const unsubscribe = dataStore.subscribe(() => {
      setProducts(dataStore.getProducts());
    });
    return unsubscribe;
  }, []);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      dataStore.deleteProduct(id);
    }
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // In a real app we'd parse everything precisely. With mock, we'll do basic mapping.
    const name = formData.get("name") as string;
    const categoryName = formData.get("categoryName") as string;
    const price = Number(formData.get("price"));
    const image = formData.get("image") as string;
    const description = formData.get("description") as string;
    const isOutOfStock = formData.get("isOutOfStock") === "on";
    const isLimited = formData.get("isLimited") === "on";
    const isBestSeller = formData.get("isBestSeller") === "on";

    // Handle Sizes (simplistic approach for the mock: keeping names, just updating availability)
    const newSizes: ProductSize[] = editingProduct 
      ? editingProduct.sizes.map(s => ({
          ...s,
          available: formData.get(`size-${s.name}`) === "on"
        }))
      : [
          { name: "XS", available: formData.get("size-XS") === "on" },
          { name: "S", available: formData.get("size-S") === "on" },
          { name: "M", available: formData.get("size-M") === "on" },
          { name: "L", available: formData.get("size-L") === "on" },
          { name: "XL", available: formData.get("size-XL") === "on" },
        ];

    const productData: Partial<Product> = {
      name,
      categoryName,
      price,
      image,
      description,
      isOutOfStock,
      isLimited,
      isBestSeller,
      sizes: newSizes,
    };

    if (editingProduct) {
      dataStore.updateProduct(editingProduct.id, productData);
    } else {
      dataStore.addProduct({
        ...productData,
        id: "", // generated
        category: "always-lit", // fallback
        images: [image],
        details: [],
        featured: false,
      } as Omit<Product, "id">);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Products</h1>
        <button
          onClick={handleAdd}
          className="inline-flex items-center justify-center rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2"
        >
          <Plus className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
          Add Product
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-zinc-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-white">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <img className="h-10 w-10 rounded-md object-cover" src={product.image || "/lookbook.png"} alt="" />
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-zinc-900">{product.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">{product.categoryName}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {product.isOutOfStock ? (
                      <span className="inline-flex rounded-full bg-red-100 px-2 text-xs font-semibold leading-5 text-red-800">Out of Stock</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">In Stock</span>
                    )}
                    {product.isLimited && (
                      <span className="ml-2 inline-flex rounded-full bg-orange-100 px-2 text-xs font-semibold leading-5 text-orange-800">Limited</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">$\{(product.price).toFixed(2)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button onClick={() => handleEdit(product)} className="text-zinc-600 hover:text-zinc-900 mr-4">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingProduct ? "Edit Product" : "Add Product"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-900">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-zinc-700">Name</label>
                  <input type="text" name="name" defaultValue={editingProduct?.name} required className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 sm:text-sm p-2 border" />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-zinc-700">Category Display Name</label>
                  <input type="text" name="categoryName" defaultValue={editingProduct?.categoryName} required className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 sm:text-sm p-2 border" />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-zinc-700">Price ($)</label>
                  <input type="number" name="price" defaultValue={editingProduct?.price} required min="0" className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 sm:text-sm p-2 border" />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-zinc-700">Primary Image URL</label>
                  <input type="text" name="image" defaultValue={editingProduct?.image || "/lookbook.png"} className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 sm:text-sm p-2 border" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-700">Description</label>
                  <textarea name="description" rows={3} defaultValue={editingProduct?.description} className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 sm:text-sm p-2 border" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Inventory Settings & Tags</label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" name="isOutOfStock" defaultChecked={editingProduct?.isOutOfStock} className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900" />
                      <span className="text-sm font-medium text-zinc-900">Out of Stock</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" name="isLimited" defaultChecked={editingProduct?.isLimited} className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900" />
                      <span className="text-sm font-medium text-zinc-900">Limited Edition / Archive</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" name="isBestSeller" defaultChecked={editingProduct?.isBestSeller} className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900" />
                      <span className="text-sm font-medium text-zinc-900">Best Seller Tag</span>
                    </label>
                  </div>
                </div>

                <div className="col-span-2">
                   <label className="block text-sm font-medium text-zinc-700 mb-2">Sizes Availability</label>
                   <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                     {(editingProduct?.sizes || [
                        { name: "XS", available: true },
                        { name: "S", available: true },
                        { name: "M", available: true },
                        { name: "L", available: true },
                        { name: "XL", available: true },
                     ]).map((size) => (
                       <label key={size.name} className="flex items-center space-x-2 border p-2 rounded bg-white cursor-pointer hover:bg-zinc-100">
                         <input type="checkbox" name={`size-${size.name}`} defaultChecked={size.available} className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900" />
                         <span className="text-sm font-medium whitespace-nowrap">{size.name}</span>
                       </label>
                     ))}
                   </div>
                   <p className="mt-2 text-xs text-zinc-500">Unchecking a size will make it unclickable/hidden for users.</p>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-200 flex justify-end space-x-3 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium text-zinc-700 hover:bg-white">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-zinc-950 text-white rounded-md text-sm font-medium hover:bg-zinc-800">
                  {editingProduct ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
