import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Image, Trash2, Plus, Replace, Move, AlertCircle, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';

// This component integrates directly into your edit dialog
// Replace the image management section in your edit dialog with this

interface ContentImage {
  url: string;
  cloudinaryUrl?: string;
  filename: string;
  altText: string;
  isUserUploaded?: boolean;
  position?: number;
  isVisible?: boolean;
}

interface IntegratedImageEditorProps {
  contentId: string;
  images: ContentImage[];
  contentBody: string;
  onContentUpdate: (body: string, images: ContentImage[]) => void;
  editFormData: any;
  setEditFormData: (data: any) => void;
}

export default function IntegratedImageEditor({ 
  contentId, 
  images: initialImages, 
  contentBody: initialBody,
  onContentUpdate,
  editFormData,
  setEditFormData
}: IntegratedImageEditorProps) {
  const [images, setImages] = useState<ContentImage[]>(initialImages || []);
  const [contentBody, setContentBody] = useState(initialBody);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [altText, setAltText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [insertPosition, setInsertPosition] = useState<number | null>(null);

  // Update parent component and preview in real-time
  useEffect(() => {
    const updatedBody = embedImagesInContent(contentBody, images);
    setEditFormData(prev => ({
      ...prev,
      body: updatedBody
    }));
    onContentUpdate(updatedBody, images);
  }, [images, contentBody]);

  // Function to embed images in content HTML
  const embedImagesInContent = (body: string, imageList: ContentImage[]) => {
    // Remove existing image tags first
    let cleanBody = body.replace(/<figure[^>]*class="wp-block-image[^"]*"[^>]*>[\s\S]*?<\/figure>/gi, '');
    
    // If no images, return clean body
    if (imageList.length === 0) return cleanBody;
    
    // Build the HTML for visible images
    const imageHtml = imageList
      .filter(img => img.isVisible !== false)
      .map((img, idx) => `
<figure class="wp-block-image size-large">
  <img src="${img.cloudinaryUrl || img.url}" alt="${img.altText}" class="wp-image" style="max-width: 100%; height: auto;" />
  <figcaption>${img.altText}</figcaption>
</figure>`)
      .join('\n\n');
    
    // Find good positions to insert images
    const paragraphs = cleanBody.split('</p>');
    
    if (paragraphs.length > 2) {
      // Insert first image after first paragraph
      paragraphs[0] += '</p>\n' + imageHtml.split('</figure>')[0] + '</figure>';
      
      // Insert remaining images throughout content
      if (imageList.length > 1 && paragraphs.length > 4) {
        const middleIndex = Math.floor(paragraphs.length / 2);
        paragraphs[middleIndex] += '</p>\n' + imageHtml.split('</figure>').slice(1).join('</figure>');
      }
      
      return paragraphs.join('</p>');
    } else {
      // For short content, add all images at the end
      return cleanBody + '\n\n' + imageHtml;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, replaceIndex?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    setError('');
    setIsUploading(true);

    // Create preview immediately
    const reader = new FileReader();
    reader.onloadend = async () => {
      const preview = reader.result as string;
      
      // Create temporary image object
      const tempImage: ContentImage = {
        url: preview,
        filename: file.name,
        altText: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        isUserUploaded: true,
        isVisible: true
      };

      // Update images immediately for preview
      let updatedImages = [...images];
      if (replaceIndex !== undefined) {
        updatedImages[replaceIndex] = tempImage;
      } else if (insertPosition !== null) {
        updatedImages.splice(insertPosition + 1, 0, tempImage);
      } else {
        updatedImages.push(tempImage);
      }
      setImages(updatedImages);

      // Upload to server
      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('altText', tempImage.altText);
        formData.append('position', replaceIndex !== undefined ? 'replace' : 'append');
        
        if (replaceIndex !== undefined) {
          formData.append('replaceIndex', replaceIndex.toString());
        }

        const response = await fetch(`/api/user/content/${contentId}/upload-image`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        const result = await response.json();
        
        // Update with real Cloudinary URL
        const finalImages = updatedImages.map((img, idx) => {
          if ((replaceIndex !== undefined && idx === replaceIndex) || 
              (replaceIndex === undefined && idx === updatedImages.length - 1)) {
            return {
              ...img,
              url: result.image.url,
              cloudinaryUrl: result.image.cloudinaryUrl,
              cloudinaryPublicId: result.image.cloudinaryPublicId
            };
          }
          return img;
        });
        
        setImages(finalImages);
        
      } catch (uploadError) {
        setError('Failed to upload to Cloudinary. Image shown locally only.');
      } finally {
        setIsUploading(false);
        setInsertPosition(null);
      }
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    
    // Also delete from server
    fetch(`/api/user/content/${contentId}/images/${index}`, {
      method: 'DELETE'
    }).catch(console.error);
  };

  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    const updatedImages = [...images];
    const [movedImage] = updatedImages.splice(fromIndex, 1);
    updatedImages.splice(toIndex, 0, movedImage);
    setImages(updatedImages);
  };

  const toggleImageVisibility = (index: number) => {
    const updatedImages = [...images];
    updatedImages[index] = {
      ...updatedImages[index],
      isVisible: !updatedImages[index].isVisible
    };
    setImages(updatedImages);
  };

  return (
    <div className="space-y-4">
      {/* Image Management Header */}
      <div className="border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900 flex items-center">
            <Image className="w-4 h-4 mr-2 text-indigo-600" />
            Live Image Editor
          </h4>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
            {images.filter(img => img.isVisible !== false).length} visible / {images.length} total
          </span>
        </div>

        {/* Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileSelect(e)}
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full px-3 py-2 bg-white border-2 border-dashed border-indigo-300 rounded-md hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center justify-center text-sm"
        >
          <Upload className="w-4 h-4 mr-2 text-indigo-600" />
          {isUploading ? 'Uploading...' : 'Upload New Image'}
        </button>

        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded flex items-start">
            <AlertCircle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Image List with Real-time Controls */}
      {images.length > 0 ? (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {images.map((image, index) => (
            <div
              key={index}
              className={`group bg-white border rounded-lg p-3 transition-all ${
                draggedIndex === index ? 'opacity-50' : ''
              } ${image.isVisible === false ? 'opacity-60' : ''}`}
              draggable
              onDragStart={() => setDraggedIndex(index)}
              onDragEnd={() => setDraggedIndex(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedIndex !== null && draggedIndex !== index) {
                  handleMoveImage(draggedIndex, index);
                }
              }}
            >
              <div className="flex items-start space-x-3">
                {/* Thumbnail */}
                <div className="relative flex-shrink-0">
                  <img
                    src={image.cloudinaryUrl || image.url}
                    alt={image.altText}
                    className="w-16 h-16 object-cover rounded border"
                  />
                  {image.isVisible === false && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center">
                      <EyeOff className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>

                {/* Image Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-medium text-gray-900">
                      Image {index + 1}
                    </span>
                    {image.cloudinaryUrl && (
                      <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded">
                        ☁️ Saved
                      </span>
                    )}
                    {image.isUserUploaded && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                        Uploaded
                      </span>
                    )}
                  </div>
                  
                  {/* Editable Alt Text */}
                  <input
                    type="text"
                    value={image.altText}
                    onChange={(e) => {
                      const updatedImages = [...images];
                      updatedImages[index].altText = e.target.value;
                      setImages(updatedImages);
                    }}
                    placeholder="Alt text..."
                    className="w-full text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-1 flex-shrink-0">
                  <div className="flex space-x-1">
                    {/* Move Up */}
                    <button
                      onClick={() => index > 0 && handleMoveImage(index, index - 1)}
                      disabled={index === 0}
                      className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-30"
                      title="Move up"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    
                    {/* Move Down */}
                    <button
                      onClick={() => index < images.length - 1 && handleMoveImage(index, index + 1)}
                      disabled={index === images.length - 1}
                      className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-30"
                      title="Move down"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="flex space-x-1">
                    {/* Toggle Visibility */}
                    <button
                      onClick={() => toggleImageVisibility(index)}
                      className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title={image.isVisible === false ? "Show" : "Hide"}
                    >
                      {image.isVisible === false ? 
                        <EyeOff className="w-3 h-3" /> : 
                        <Eye className="w-3 h-3" />
                      }
                    </button>
                    
                    {/* Replace */}
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e: any) => handleFileSelect(e, index);
                        input.click();
                      }}
                      className="p-1 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded"
                      title="Replace"
                    >
                      <Replace className="w-3 h-3" />
                    </button>
                    
                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteImage(index)}
                      className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Insert Image Button */}
              <button
                onClick={() => {
                  setInsertPosition(index);
                  fileInputRef.current?.click();
                }}
                className="mt-2 w-full py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded border border-indigo-200 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <Plus className="w-3 h-3 mr-1" />
                Insert image after this one
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <Image className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No images yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload images to see them in the preview</p>
        </div>
      )}

      {/* Tips */}
      <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
        <p className="font-medium mb-1">💡 Tips:</p>
        <ul className="space-y-0.5 ml-4">
          <li>• Drag images to reorder them</li>
          <li>• Click the eye icon to show/hide images</li>
          <li>• Edit alt text directly for better SEO</li>
          <li>• Changes appear instantly in the preview</li>
        </ul>
      </div>
    </div>
  );
}