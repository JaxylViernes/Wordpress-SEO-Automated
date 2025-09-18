import { useState, useRef } from 'react';
import { 
  Upload, 
  X, 
  RefreshCw, 
  Loader2, 
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Star,
  ImageIcon
} from 'lucide-react';

const ImageManager = ({ 
  existingImages = [], 
  uploadedImages = [],
  onImageReplace,
  onImageRemove,
  onImageReorder,
  onImageUpload,
  isUploading = false,
  selectedWebsite,
  contentId
}) => {
  const [replacingImageId, setReplacingImageId] = useState(null);
  const [draggedImage, setDraggedImage] = useState(null);
  const fileInputRefs = useRef({});

  // Combined images list with metadata
  const allImages = [
    ...existingImages.map(img => ({
      ...img,
      source: 'existing',
      url: img.cloudinaryUrl || img.url,
      status: 'saved'
    })),
    ...uploadedImages.map(img => ({
      ...img,
      source: 'new',
      status: img.isProcessing ? 'uploading' : img.uploadFailed ? 'failed' : 'ready'
    }))
  ];

  const handleReplaceClick = (imageId) => {
    setReplacingImageId(imageId);
    const inputRef = fileInputRefs.current[imageId];
    if (inputRef) {
      inputRef.click();
    }
  };

  const handleReplaceImage = async (e, originalImage) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    // Create preview immediately
    const previewUrl = URL.createObjectURL(file);
    
    // Call parent handler to replace the image
    await onImageReplace(originalImage.id, {
      file,
      previewUrl,
      filename: file.name,
      altText: originalImage.altText || `Replaced image: ${file.name}`,
      isReplacement: true,
      originalId: originalImage.id
    });

    setReplacingImageId(null);
  };

  const handleDragStart = (e, image, index) => {
    setDraggedImage({ image, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (!draggedImage) return;

    if (draggedImage.index !== dropIndex) {
      onImageReorder(draggedImage.index, dropIndex);
    }
    setDraggedImage(null);
  };

  const moveImage = (index, direction) => {
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < allImages.length) {
      onImageReorder(index, newIndex);
    }
  };

  const setAsFeatured = (imageId) => {
    // Move this image to the first position
    const imageIndex = allImages.findIndex(img => img.id === imageId);
    if (imageIndex > 0) {
      onImageReorder(imageIndex, 0);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 flex items-center">
          <ImageIcon className="w-4 h-4 mr-2" />
          Manage Images ({allImages.length})
        </h4>
        <div className="flex items-center space-x-2 text-xs">
          <span className="flex items-center text-green-600">
            <Check className="w-3 h-3 mr-1" />
            Saved
          </span>
          <span className="flex items-center text-blue-600">
            <Upload className="w-3 h-3 mr-1" />
            New
          </span>
          <span className="flex items-center text-yellow-600">
            <RefreshCw className="w-3 h-3 mr-1" />
            Replaced
          </span>
        </div>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-2 gap-4">
        {allImages.map((image, index) => (
          <div
            key={image.id}
            className={`relative group border-2 rounded-lg overflow-hidden bg-white ${
              image.status === 'uploading' ? 'border-blue-300' :
              image.status === 'failed' ? 'border-red-300' :
              image.source === 'new' ? 'border-green-300' :
              image.isReplacement ? 'border-yellow-300' :
              'border-gray-200'
            }`}
            draggable
            onDragStart={(e) => handleDragStart(e, image, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
          >
            {/* Image Preview */}
            <div className="aspect-video relative bg-gray-50">
              <img
                src={image.previewUrl || image.url}
                alt={image.altText}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              
              {/* Status Overlay */}
              {image.status === 'uploading' && (
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
              
              {/* Featured Badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs flex items-center">
                  <Star className="w-3 h-3 mr-1" />
                  Featured
                </div>
              )}
              
              {/* Source Badge */}
              <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs text-white ${
                image.source === 'new' ? 'bg-green-500' :
                image.isReplacement ? 'bg-yellow-500' :
                'bg-gray-500'
              }`}>
                {image.source === 'new' ? 'New' :
                 image.isReplacement ? 'Replaced' :
                 image.cloudinaryUrl ? 'Cloudinary' : 'Original'}
              </div>
            </div>

            {/* Image Info */}
            <div className="p-3">
              <p className="text-xs text-gray-600 truncate mb-1" title={image.filename}>
                {image.filename}
              </p>
              <p className="text-xs text-gray-500 truncate" title={image.altText}>
                {image.altText}
              </p>
              
              {/* Image Actions */}
              <div className="flex items-center justify-between mt-3">
                {/* Position Controls */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => moveImage(index, 'left')}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move left"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-gray-500 px-1">
                    {index + 1}/{allImages.length}
                  </span>
                  <button
                    onClick={() => moveImage(index, 'right')}
                    disabled={index === allImages.length - 1}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move right"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-1">
                  {/* Replace Button */}
                  <button
                    onClick={() => handleReplaceClick(image.id)}
                    disabled={image.status === 'uploading'}
                    className="p-1 rounded hover:bg-blue-100 text-blue-600 disabled:opacity-50"
                    title="Replace image"
                  >
                    <RefreshCw className={`w-4 h-4 ${replacingImageId === image.id ? 'animate-spin' : ''}`} />
                  </button>
                  
                  {/* Set as Featured */}
                  {index !== 0 && (
                    <button
                      onClick={() => setAsFeatured(image.id)}
                      className="p-1 rounded hover:bg-yellow-100 text-yellow-600"
                      title="Set as featured image"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  
                  {/* Remove Button */}
                  <button
                    onClick={() => onImageRemove(image.id)}
                    disabled={image.status === 'uploading'}
                    className="p-1 rounded hover:bg-red-100 text-red-600 disabled:opacity-50"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Hidden file input for replacement */}
              <input
                ref={(el) => fileInputRefs.current[image.id] = el}
                type="file"
                accept="image/*"
                onChange={(e) => handleReplaceImage(e, image)}
                className="hidden"
              />
            </div>

            {/* Upload Failed Warning */}
            {image.status === 'failed' && (
              <div className="absolute bottom-0 left-0 right-0 bg-red-100 border-t border-red-300 px-2 py-1">
                <p className="text-xs text-red-700 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Upload failed - Local preview only
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add New Images Button */}
      <button
        onClick={onImageUpload}
        disabled={isUploading}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center text-sm text-gray-600 hover:text-blue-600"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Add More Images
          </>
        )}
      </button>

      {/* Help Text */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Drag images to reorder them</p>
        <p>• Click the refresh icon to replace an image</p>
        <p>• The first image will be used as the featured image</p>
        <p>• All images are automatically saved to Cloudinary</p>
      </div>
    </div>
  );
};

export default ImageManager;