import imageMetadataService from '@/services/imageMetadataService';

export async function POST(req: Request) {
  const { imageData, contentId, websiteName, imageIndex, metadata } = await req.json();
  
  console.log(`📥 Processing metadata for image ${imageIndex + 1}`);
  
  try {
    let imageBuffer;
    
    // Handle base64 or URL
    if (imageData.startsWith('data:')) {
      const base64Data = imageData.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else if (imageData.startsWith('http')) {
      const response = await fetch(imageData);
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else {
      // Assume it's already base64 without data URI
      imageBuffer = Buffer.from(imageData, 'base64');
    }
    
    // Process the image
    const result = await imageMetadataService.processAIGeneratedImage(
      imageBuffer,
      {
        contentId,
        websiteName,
        optimizeForWeb: true,
        maxWidth: 1920,
        quality: 85,
        contentMetadata: metadata
      }
    );
    
    // Convert back to base64 for response
    const processedBase64 = result.processedImage.toString('base64');
    
    return Response.json({
      success: true,
      data: `data:image/jpeg;base64,${processedBase64}`,
      size: result.processedSize,
      metadataAdded: true,
      originalSize: result.originalSize,
      processedSize: result.processedSize,
      compressionRatio: result.compressionRatio
    });
    
  } catch (error) {
    console.error('Metadata processing error:', error);
    return Response.json(
      { error: 'Failed to process metadata', details: error.message },
      { status: 500 }
    );
  }
}