"use client";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface CollectionDialogProps {
  onSelect: (filename: string) => void;
}

export default function CollectionDialog({ onSelect }: CollectionDialogProps) {
  const [open, setOpen] = useState(false);

  const handleUpload = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["json", "csv"].includes(ext ?? "")) {
      alert("Only .json and .csv files are allowed.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      alert(`File uploaded: ${data.filename}`);

      // Call parent handler
      onSelect(data.filename);

      setOpen(false);
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }
  };

  return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="bg-raisin-black text-white rounded-md cursor-pointer hoverBtn" variant="outline">
            <FileDown size={16} />
            Import Data
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import JSON or CSV file</DialogTitle>
            <DialogDescription>
              Upload a JSON or CSV file containing disaster records.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            <Input
                type="file"
                accept=".json,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
                className="block w-full text-sm text-gray-700 cursor-pointer"
            />
            <DialogClose asChild>
              <Button
                  type="button"
                  variant="secondary"
                  className="cursor-pointer mt-3.5"
              >
                Cancel
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
  );
}
