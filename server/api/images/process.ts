import { OpenAI } from 'openai';
import imageMetadataService from '../../services/imageMetadataService';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {
  const { contentId, topic, imageCount, websiteName } = await req.json();
  
  try {
    const processedImages = [];
    
    // Generate images with DALL-E 3
    for (let i = 0; i < imageCount; i++) {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: `Professional blog image for: ${topic}`,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json"
      });
      
      const imageBuffer = Buffer.from(response.data[0].b64_json!, 'base64');
      
      // Process with metadata service
      const processed = await imageMetadataService.processAIGeneratedImage(
        imageBuffer,
        {
          contentId,
          websiteName,
          optimizeForWeb: true
        }
      );
      
      // Convert to base64 for response or upload to storage
      processedImages.push({
        data: processed.processedImage.toString('base64'),
        originalSize: processed.originalSize,
        processedSize: processed.processedSize,
        costCents: 4 // $0.04 per image
      });
    }
    
    return Response.json({
      success: true,
      images: processedImages,
      totalCost: imageCount * 0.04
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}