import React, { useRef } from "react";
import imageCompression from "browser-image-compression";
import { Button } from "./button";
import { Upload } from "lucide-react";

interface ImageUploadProps {
  onUpload: (file: File, compressedUrl: string) => void;
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
}

export function ImageUpload({
  onUpload,
  maxSizeMB = 1,
  maxWidthOrHeight = 1024,
}: ImageUploadProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    console.log("handleImageUpload called");
    const file = event.target.files?.[0];
    console.log("Selected file:", file);

    if (!file) return;

    try {
      setIsLoading(true);
      console.log("Starting compression...");

      const options = {
        maxSizeMB,
        maxWidthOrHeight,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      console.log("File compressed:", compressedFile);

      const compressedUrl =
        await imageCompression.getDataUrlFromFile(compressedFile);
      console.log("Got compressed URL");

      onUpload(compressedFile, compressedUrl);
    } catch (error) {
      console.error("Error compressing image:", error);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleButtonClick = () => {
    console.log("Button clicked");
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-center gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        disabled={isLoading}
        onClick={handleButtonClick}
      >
        <Upload className="h-4 w-4 mr-2" />
        {isLoading ? "Compressing..." : "Upload Image"}
      </Button>
    </div>
  );
}
