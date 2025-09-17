
//client/src/lib/api/imageApi.ts
export const imageApi = {
  async generateAndProcessImages(
    contentId: string,
    topic: string,
    imageCount: number,
    websiteName: string
  ) {
    const response = await fetch('/api/images/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentId,
        topic,
        imageCount,
        websiteName
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate images');
    }
    
    return response.json();
  }
};