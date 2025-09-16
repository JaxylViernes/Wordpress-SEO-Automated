// server/api/user/websites.ts
import { db } from '../../../../../server/db';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Fetching user websites...');
    
    // First, try to get websites from a dedicated websites table if it exists
    try {
      const websitesFromTable = await db('websites')
        .select('id', 'name', 'domain', 'status')
        .where('status', 'active')
        .orderBy('name', 'asc');
      
      if (websitesFromTable.length > 0) {
        console.log(`Found ${websitesFromTable.length} websites from websites table`);
        return res.status(200).json(websitesFromTable);
      }
    } catch (error) {
      // Websites table doesn't exist, fall back to ai_content table
      console.log('Websites table not found, fetching from ai_content table');
    }
    
    // Get unique websites from ai_content table
    const websites = await db('ai_content')
      .select(
        db.raw('DISTINCT website_id as id'),
        db.raw('MAX(website_name) as name'),
        db.raw('COUNT(*) as content_count'),
        db.raw('MAX(created_at) as last_content_date')
      )
      .whereNotNull('website_id')
      .whereNotNull('website_name')
      .groupBy('website_id')
      .orderBy('name', 'asc');
    
    // Format the websites
    const formattedWebsites = websites.map(site => ({
      id: site.id,
      name: site.name,
      domain: '', // You can add domain extraction logic if needed
      status: 'active',
      contentCount: site.content_count,
      lastContentDate: site.last_content_date
    }));
    
    console.log(`Found ${formattedWebsites.length} unique websites from ai_content`);
    
    // If no websites found, return empty array
    if (formattedWebsites.length === 0) {
      console.log('No websites found in database');
      return res.status(200).json([]);
    }
    
    return res.status(200).json(formattedWebsites);
    
  } catch (error) {
    console.error('Error fetching websites:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch websites',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}