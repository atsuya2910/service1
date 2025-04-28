'use client';

import { useState, useRef } from 'react';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageEditorProps {
  image: File;
  onSave: (editedImage: File) => void;
  onCancel: () => void;
}

export default function ImageEditor({ image, onSave, onCancel }: ImageEditorProps) {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5,
  });
  const [imageUrl, setImageUrl] = useState<string>('');
  const imageRef = useRef<HTMLImageElement>(null);

  // 画像をURLに変換
  useState(() => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(image);
  });

  // トリミング処理
  const handleCrop = async () => {
    if (!imageRef.current) return;

    const canvas = document.createElement('canvas');
    const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
    const scaleY = imageRef.current.naturalHeight / imageRef.current.height;

    canvas.width = crop.width! * scaleX;
    canvas.height = crop.height! * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      imageRef.current,
      crop.x! * scaleX,
      crop.y! * scaleY,
      crop.width! * scaleX,
      crop.height! * scaleY,
      0,
      0,
      crop.width! * scaleX,
      crop.height! * scaleY
    );

    // Canvas を Blob に変換
    canvas.toBlob((blob) => {
      if (!blob) return;
      const croppedFile = new File([blob], image.name, {
        type: image.type,
        lastModified: Date.now(),
      });
      onSave(croppedFile);
    }, image.type);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
        <h3 className="text-lg font-medium mb-4">画像を編集</h3>
        <div className="mb-4">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            aspect={1}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Edit"
              className="max-h-[60vh] mx-auto"
            />
          </ReactCrop>
        </div>
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleCrop}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
} 