// // server/services/websiteSearchService.ts

// export interface Website {
//   id: number;
//   name: string;
//   url: string;
//   status: 'active' | 'monitoring' | 'inactive';
//   userId?: number;
//   createdAt?: Date;
//   updatedAt?: Date;
// }

// export interface SearchFilters {
//   userId?: number;
//   status?: Website['status'];
//   limit?: number;
// }

// export class WebsiteSearchService {
//   private db: any; // Replace with your actual database connection (Prisma, TypeORM, etc.)

//   constructor(database: any) {
//     this.db = database;
//   }

//   /**
//    * Search websites by name or URL
//    */
//   async searchWebsites(
//     query: string, 
//     filters: SearchFilters = {}
//   ): Promise<Website[]> {
//     try {
//       const { userId, status, limit = 10 } = filters;
      
//       // Example with Prisma (adjust based on your ORM)
//       const websites = await this.db.website.findMany({
//         where: {
//           AND: [
//             // Text search in name or URL
//             {
//               OR: [
//                 {
//                   name: {
//                     contains: query,
//                     mode: 'insensitive'
//                   }
//                 },
//                 {
//                   url: {
//                     contains: query,
//                     mode: 'insensitive'
//                   }
//                 }
//               ]
//             },
//             // Optional filters
//             ...(userId ? [{ userId }] : []),
//             ...(status ? [{ status }] : [])
//           ]
//         },
//         select: {
//           id: true,
//           name: true,
//           url: true,
//           status: true,
//           createdAt: true,
//           updatedAt: true
//         },
//         orderBy: [
//           { updatedAt: 'desc' },
//           { name: 'asc' }
//         ],
//         take: limit
//       });

//       return websites;

//     } catch (error) {
//       console.error('Website search error:', error);
//       throw new Error('Failed to search websites');
//     }
//   }

//   /**
//    * Get recent searches or popular websites
//    */
//   async getRecentWebsites(userId?: number, limit: number = 5): Promise<Website[]> {
//     try {
//       return await this.db.website.findMany({
//         where: userId ? { userId } : {},
//         select: {
//           id: true,
//           name: true,
//           url: true,
//           status: true,
//           updatedAt: true
//         },
//         orderBy: { updatedAt: 'desc' },
//         take: limit
//       });
//     } catch (error) {
//       console.error('Recent websites fetch error:', error);
//       throw new Error('Failed to fetch recent websites');
//     }
//   }

//   /**
//    * Search with advanced filters and sorting
//    */
//   async advancedSearch(
//     query: string,
//     options: {
//       userId?: number;
//       statuses?: Website['status'][];
//       sortBy?: 'name' | 'url' | 'created_at' | 'updated_at';
//       sortOrder?: 'asc' | 'desc';
//       limit?: number;
//       offset?: number;
//     }
//   ): Promise<{ websites: Website[]; total: number }> {
//     try {
//       const {
//         userId,
//         statuses = [],
//         sortBy = 'updated_at',
//         sortOrder = 'desc',
//         limit = 10,
//         offset = 0
//       } = options;

//       // Base WHERE clause for text search
//       let whereClause = `
//         WHERE (
//           LOWER(name) LIKE LOWER($1) OR 
//           LOWER(url) LIKE LOWER($1)
//         )
//       `;
      
//       const params: (string | number | string[])[] = [`%${query}%`];
//       let paramIndex = 2;
      
//       // Add user filter
//       if (userId) {
//         whereClause += ` AND user_id = ${paramIndex}`;
//         params.push(userId);
//         paramIndex++;
//       }
      
//       // Add status filter
//       if (statuses.length > 0) {
//         const statusPlaceholders = statuses.map(() => `${paramIndex++}`).join(', ');
//         whereClause += ` AND status IN (${statusPlaceholders})`;
//         statuses.forEach(status => params.push(status));
//       }

//       // Get total count
//       const countSql = `SELECT COUNT(*) as total FROM websites ${whereClause}`;
//       const countResult = await this.sql(countSql, params);
//       const total = parseInt(countResult[0].total, 10);

//       // Get websites with pagination
//       const websitesSql = `
//         SELECT 
//           id, 
//           name, 
//           url, 
//           status, 
//           user_id,
//           created_at,
//           updated_at 
//         FROM websites 
//         ${whereClause}
//         ORDER BY ${sortBy} ${sortOrder.toUpperCase()}, name ASC
//         LIMIT ${paramIndex} OFFSET ${paramIndex + 1}
//       `;
      
//       params.push(limit, offset);
//       const websites = await this.sql(websitesSql, params);

//       return {
//         websites: websites.map(row => ({
//           id: row.id,
//           name: row.name,
//           url: row.url,
//           status: row.status as Website['status'],
//           user_id: row.user_id,
//           created_at: row.created_at,
//           updated_at: row.updated_at
//         })),
//         total
//       };

//     } catch (error) {
//       console.error('Advanced search error:', error);
//       throw new Error('Failed to perform advanced search');
//     }
//   }
// }

// // Database connection helper
// export function createWebsiteSearchService(): WebsiteSearchService {
//   const databaseUrl = process.env.DATABASE_URL;
  
//   if (!databaseUrl) {
//     throw new Error('DATABASE_URL environment variable is required');
//   }
  
//   return new WebsiteSearchService(databaseUrl);
// }

