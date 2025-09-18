import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary';
import { imageService } from '@/server/services/image-service';
import formidable from 'formidable';
import fs from 'fs/promises';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface ImageOperation {
  id?: string;
  action: 'replace' | 'delete' | 'add';
  source?: 'ai' | 'upload';
  aiSettings?: {
    style: string;
    prompt: string;
  };
  fileIndex?: number; // For matching uploaded files
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id: contentId } = req.query;
  if (!contentId || typeof contentId !== 'string') {
    return res.status(400).json({ message: 'Content ID is required' });
  }

  try {
    // Parse multipart form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB max
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    // Parse operations from form data
    const operations: ImageOperation[] = JSON.parse(
      Array.isArray(fields.operations) ? fields.operations[0] : fields.operations
    );

    // Get existing content and images
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: {
        images: true,
        website: true,
      },
    });

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    const results = {
      updated: [],
      deleted: [],
      added: [],
      errors: [],
      totalCost: 0,
    };

    // Process each operation
    for (const operation of operations) {
      try {
        switch (operation.action) {
          case 'delete':
            // Delete image from Cloudinary and database
            if (operation.id) {
              const image = content.images.find(img => img.id === operation.id);
              if (image) {
                // Delete from Cloudinary
                if (image.cloudinaryPublicId) {
                  await deleteFromCloudinary(image.cloudinaryPublicId);
                }
                
                // Delete from database
                await prisma.contentImage.delete({
                  where: { id: operation.id },
                });
                
                results.deleted.push(operation.id);
              }
            }
            break;

          case 'replace':
            if (operation.id) {
              const existingImage = content.images.find(img => img.id === operation.id);
              if (!existingImage) {
                throw new Error(`Image ${operation.id} not found`);
              }

              if (operation.source === 'ai') {
                // Generate new AI image
                const generatedImages = await imageService.generateImages({
                  topic: content.title,
                  count: 1,
                  style: operation.aiSettings?.style || 'natural',
                  keywords: content.seoKeywords,
                });

                if (generatedImages.images.length > 0) {
                  const newImage = generatedImages.images[0];
                  
                  // Upload to Cloudinary
                  const cloudinaryResult = await uploadToCloudinary(
                    newImage.url,
                    `content-${contentId}`,
                    {
                      alt_text: newImage.altText,
                      caption: newImage.altText,
                    }
                  );

                  // Delete old Cloudinary image
                  if (existingImage.cloudinaryPublicId) {
                    await deleteFromCloudinary(existingImage.cloudinaryPublicId);
                  }

                  // Update database
                  await prisma.contentImage.update({
                    where: { id: operation.id },
                    data: {
                      filename: newImage.filename,
                      altText: newImage.altText,
                      cloudinaryUrl: cloudinaryResult.secure_url,
                      cloudinarySecureUrl: cloudinaryResult.secure_url,
                      cloudinaryPublicId: cloudinaryResult.public_id,
                      url: cloudinaryResult.secure_url,
                      status: 'active',
                    },
                  });

                  results.updated.push({
                    id: operation.id,
                    url: cloudinaryResult.secure_url,
                  });
                  results.totalCost += generatedImages.totalCost;
                }
              } else if (operation.source === 'upload' && operation.fileIndex !== undefined) {
                // Handle uploaded file
                const fileKey = `image-${operation.id}`;
                const uploadedFile = files[fileKey];
                
                if (uploadedFile) {
                  const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;
                  
                  // Upload to Cloudinary
                  const cloudinaryResult = await uploadToCloudinary(
                    file.filepath,
                    `content-${contentId}`,
                    {
                      resource_type: 'image',
                      folder: `content/${contentId}`,
                    }
                  );

                  // Delete old Cloudinary image
                  if (existingImage.cloudinaryPublicId) {
                    await deleteFromCloudinary(existingImage.cloudinaryPublicId);
                  }

                  // Update database
                  await prisma.contentImage.update({
                    where: { id: operation.id },
                    data: {
                      filename: file.originalFilename || 'uploaded-image.jpg',
                      cloudinaryUrl: cloudinaryResult.secure_url,
                      cloudinarySecureUrl: cloudinaryResult.secure_url,
                      cloudinaryPublicId: cloudinaryResult.public_id,
                      url: cloudinaryResult.secure_url,
                      status: 'active',
                    },
                  });

                  results.updated.push({
                    id: operation.id,
                    url: cloudinaryResult.secure_url,
                  });

                  // Clean up temp file
                  await fs.unlink(file.filepath);
                }
              }
            }
            break;

          case 'add':
            if (operation.source === 'ai') {
              // Generate new AI image
              const generatedImages = await imageService.generateImages({
                topic: content.title,
                count: 1,
                style: operation.aiSettings?.style || 'natural',
                keywords: content.seoKeywords,
              });

              if (generatedImages.images.length > 0) {
                const newImage = generatedImages.images[0];
                
                // Upload to Cloudinary
                const cloudinaryResult = await uploadToCloudinary(
                  newImage.url,
                  `content-${contentId}`,
                  {
                    alt_text: newImage.altText,
                    caption: newImage.altText,
                  }
                );

                // Get current max image order
                const maxOrder = Math.max(
                  0,
                  ...content.images.map(img => img.imageOrder || 0)
                );

                // Add to database
                const createdImage = await prisma.contentImage.create({
                  data: {
                    contentId: contentId,
                    filename: newImage.filename,
                    altText: newImage.altText,
                    cloudinaryUrl: cloudinaryResult.secure_url,
                    cloudinarySecureUrl: cloudinaryResult.secure_url,
                    cloudinaryPublicId: cloudinaryResult.public_id,
                    url: cloudinaryResult.secure_url,
                    status: 'active',
                    imageOrder: maxOrder + 1,
                    isFeatured: content.images.length === 0, // First image is featured
                  },
                });

                results.added.push({
                  id: createdImage.id,
                  url: cloudinaryResult.secure_url,
                });
                results.totalCost += generatedImages.totalCost;
              }
            } else if (operation.source === 'upload' && operation.fileIndex !== undefined) {
              // Handle uploaded file for new image
              const fileKey = `new-image-${operation.fileIndex}`;
              const uploadedFile = files[fileKey];
              
              if (uploadedFile) {
                const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;
                
                // Upload to Cloudinary
                const cloudinaryResult = await uploadToCloudinary(
                  file.filepath,
                  `content-${contentId}`,
                  {
                    resource_type: 'image',
                    folder: `content/${contentId}`,
                  }
                );

                // Get current max image order
                const maxOrder = Math.max(
                  0,
                  ...content.images.map(img => img.imageOrder || 0)
                );

                // Add to database
                const createdImage = await prisma.contentImage.create({
                  data: {
                    contentId: contentId,
                    filename: file.originalFilename || 'uploaded-image.jpg',
                    altText: `Image for ${content.title}`,
                    cloudinaryUrl: cloudinaryResult.secure_url,
                    cloudinarySecureUrl: cloudinaryResult.secure_url,
                    cloudinaryPublicId: cloudinaryResult.public_id,
                    url: cloudinaryResult.secure_url,
                    status: 'active',
                    imageOrder: maxOrder + 1,
                    isFeatured: content.images.length === 0,
                  },
                });

                results.added.push({
                  id: createdImage.id,
                  url: cloudinaryResult.secure_url,
                });

                // Clean up temp file
                await fs.unlink(file.filepath);
              }
            }
            break;
        }
      } catch (error: any) {
        console.error(`Error processing image operation:`, error);
        results.errors.push({
          operation,
          error: error.message,
        });
      }
    }

    // Update content with new image count and cost
    const updatedImageCount = await prisma.contentImage.count({
      where: { contentId: contentId },
    });

    await prisma.content.update({
      where: { id: contentId },
      data: {
        hasImages: updatedImageCount > 0,
        imageCount: updatedImageCount,
        imageCostCents: content.imageCostCents + Math.round(results.totalCost * 100),
      },
    });

    // Update the content body to reflect image changes
    if (results.updated.length > 0 || results.added.length > 0) {
      // Process content body to update image URLs
      let updatedBody = content.body;
      
      // Replace old URLs with new ones for updated images
      for (const update of results.updated) {
        const oldImage = content.images.find(img => img.id === update.id);
        if (oldImage && oldImage.url) {
          updatedBody = updatedBody.replace(
            new RegExp(oldImage.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            update.url
          );
        }
      }

      // Add new images to content if needed
      if (results.added.length > 0) {
        // You can customize how new images are inserted into the content
        // For now, we'll append them at the end
        for (const added of results.added) {
          const imageHtml = `\n<figure>\n<img src="${added.url}" alt="Content image" />\n</figure>\n`;
          updatedBody += imageHtml;
        }
      }

      await prisma.content.update({
        where: { id: contentId },
        data: { body: updatedBody },
      });
    }

    return res.status(200).json({
      success: true,
      results,
      message: `Updated ${results.updated.length} images, deleted ${results.deleted.length} images, added ${results.added.length} images`,
    });

  } catch (error: any) {
    console.error('Image management error:', error);
    return res.status(500).json({
      message: 'Failed to manage images',
      error: error.message,
    });
  }
}
