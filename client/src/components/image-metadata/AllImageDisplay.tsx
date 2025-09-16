import React from 'react';
import { Image, DollarSign } from 'lucide-react';

interface AIImageDisplayProps {
  images: Array<{
    data: string;
    processedSize: number;
    costCents: number;
  }>;
}

export const AIImageDisplay: React.FC<AIImageDisplayProps> = ({ images }) => {
  const totalCost = images.reduce((sum, img) => sum + img.costCents, 0);
  
  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Image className="w-4 h-4" />
          AI-Generated Images ({images.length})
        </h4>
        <span className="text-sm text-orange-600 flex items-center gap-1">
          <DollarSign className="w-4 h-4" />
          ${(totalCost / 100).toFixed(2)}
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {images.map((img, idx) => (
          <div key={idx}>
            <img
              src={`data:image/jpeg;base64,${img.data}`}
              alt={`AI Generated ${idx + 1}`}
              className="w-full h-32 object-cover rounded"
            />
            <p className="text-xs text-gray-600 mt-1">
              {(img.processedSize / 1024).toFixed(0)}KB
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};