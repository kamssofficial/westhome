"use client";

import { useState } from "react";
import { AlertTriangle, Archive, Trash2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface CategoryToDelete {
  id: string;
  name: string;
  productCount: number;
  subcategoryCount: number;
}

interface CategoryDeleteModalProps {
  category: CategoryToDelete;
  onClose: () => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
}

export default function CategoryDeleteModal({
  category,
  onClose,
  onDelete,
  onArchive,
}: CategoryDeleteModalProps) {
  const [action, setAction] = useState<"idle" | "deleting" | "archiving">("idle");
  const hasProducts = category.productCount > 0;
  const hasSubcategories = category.subcategoryCount > 0;
  const isClean = !hasProducts && !hasSubcategories;

  const handleDelete = async () => {
    setAction("deleting");
    onDelete(category.id);
  };

  const handleArchive = async () => {
    setAction("archiving");
    onArchive(category.id);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10 animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-surface-muted rounded-lg transition-colors"
          aria-label="Close"
        >
          <X size={16} className="text-text-muted" />
        </button>

        {/* Icon */}
        <div
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center mb-4",
            isClean ? "bg-red-50" : "bg-amber-50"
          )}
        >
          {isClean ? (
            <Trash2 size={22} className="text-red-500" />
          ) : (
            <AlertTriangle size={22} className="text-amber-600" />
          )}
        </div>

        {/* Title & Message */}
        <h3 className="font-semibold text-[#1a1917] text-lg">Delete Category?</h3>
        <p className="text-sm text-[#6b6560] mt-2 leading-relaxed">
          You are about to delete <span className="font-medium text-[#1a1917]">&ldquo;{category.name}&rdquo;</span>.
        </p>

        {isClean ? (
          <p className="text-sm text-[#6b6560] mt-2">
            This category has no products or subcategories. It is safe to delete permanently.
          </p>
        ) : (
          <div className="mt-3 p-3 bg-amber-50 rounded-xl">
            <p className="text-sm text-amber-800">
              This category contains{" "}
              {category.productCount > 0 && (
                <>
                  <span className="font-semibold">{category.productCount}</span>{" "}
                  {category.productCount === 1 ? "product" : "products"}
                </>
              )}
              {category.productCount > 0 && category.subcategoryCount > 0 && " and "}
              {category.subcategoryCount > 0 && (
                <>
                  <span className="font-semibold">{category.subcategoryCount}</span>{" "}
                  {category.subcategoryCount === 1 ? "subcategory" : "subcategories"}
                </>
              )}
              .
            </p>
            {hasProducts && (
              <p className="text-sm text-amber-700 mt-2">
                Deleting this category would orphan active products. Please reassign or remove
                them first, or archive the category instead.
              </p>
            )}
            {hasSubcategories && !hasProducts && (
              <p className="text-sm text-amber-700 mt-2">
                The subcategories will be orphaned. Consider removing them first or archiving
                the category instead.
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-[#6b6560] hover:bg-[#f7f5f2] rounded-xl transition-colors"
            disabled={action !== "idle"}
          >
            Cancel
          </button>

          {hasProducts ? (
            /* Must archive if has products */
            <Button
              onClick={handleArchive}
              loading={action === "archiving"}
              disabled={action !== "idle"}
              variant="accent"
              className="flex-1"
            >
              <Archive size={16} />
              Archive Category
            </Button>
          ) : isClean ? (
            /* Safe to delete */
            <Button
              onClick={handleDelete}
              loading={action === "deleting"}
              disabled={action !== "idle"}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 size={16} />
              Delete Category
            </Button>
          ) : (
            /* Has subcategories but no products - show both options */
            <>
              <Button
                onClick={handleArchive}
                loading={action === "archiving"}
                disabled={action !== "idle"}
                variant="accent"
              >
                <Archive size={16} />
                Archive
              </Button>
              <Button
                onClick={handleDelete}
                loading={action === "deleting"}
                disabled={action !== "idle"}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 size={16} />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
