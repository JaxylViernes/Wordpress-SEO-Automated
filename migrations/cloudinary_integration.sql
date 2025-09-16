-- database/migrations/cloudinary_integration.sql

-- 1. Add columns to generated_content table for Cloudinary storage
ALTER TABLE generated_content 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS cloudinary_data JSONB DEFAULT '{}';

-- 2. Create dedicated table for image tracking
CREATE TABLE IF NOT EXISTS content_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES generated_content(id) ON DELETE CASCADE,
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  alt_text TEXT,
  prompt TEXT,
  
  -- DALL-E original data
  dalle_url TEXT,
  dalle_generated_at TIMESTAMPTZ,
  
  -- Cloudinary storage data
  cloudinary_url TEXT NOT NULL,
  cloudinary_secure_url TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  cloudinary_format VARCHAR(20),
  cloudinary_width INTEGER,
  cloudinary_height INTEGER,
  cloudinary_bytes INTEGER,
  
  -- WordPress data (after publishing)
  wordpress_id INTEGER,
  wordpress_url TEXT,
  wordpress_uploaded_at TIMESTAMPTZ,
  
  -- Metadata
  cost DECIMAL(10, 6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(content_id, filename)
);

-- 3. Create indexes for performance
CREATE INDEX idx_content_images_content ON content_images(content_id);
CREATE INDEX idx_content_images_website ON content_images(website_id);
CREATE INDEX idx_content_images_cloudinary ON content_images(cloudinary_public_id);

-- 4. Update content_schedule table for auto-publishing
ALTER TABLE content_schedule
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS auto_schedule_id UUID,
ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT FALSE;

-- 5. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_content_images_updated_at BEFORE UPDATE
ON content_images FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Create view for content with images
CREATE OR REPLACE VIEW content_with_images AS
SELECT 
    gc.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', ci.id,
                'filename', ci.filename,
                'alt_text', ci.alt_text,
                'cloudinary_url', ci.cloudinary_secure_url,
                'cloudinary_public_id', ci.cloudinary_public_id,
                'wordpress_url', ci.wordpress_url,
                'width', ci.cloudinary_width,
                'height', ci.cloudinary_height,
                'size_bytes', ci.cloudinary_bytes
            ) ORDER BY ci.created_at
        ) FILTER (WHERE ci.id IS NOT NULL),
        '[]'::json
    ) AS images_data
FROM generated_content gc
LEFT JOIN content_images ci ON gc.id = ci.content_id
GROUP BY gc.id;

-- 7. Function to clean up orphaned images
CREATE OR REPLACE FUNCTION cleanup_orphaned_images()
RETURNS void AS $$
BEGIN
    DELETE FROM content_images
    WHERE content_id NOT IN (SELECT id FROM generated_content);
END;
$$ LANGUAGE plpgsql;

-- 8. Add storage tracking for monitoring
CREATE TABLE IF NOT EXISTS cloudinary_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    images_uploaded INTEGER DEFAULT 0,
    total_bytes_stored BIGINT DEFAULT 0,
    bandwidth_used BIGINT DEFAULT 0,
    credits_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(website_id, month)
);

-- Sample query to get content with images
/*
SELECT 
    gc.id,
    gc.title,
    gc.content,
    gc.status,
    json_agg(
        json_build_object(
            'url', ci.cloudinary_secure_url,
            'alt', ci.alt_text,
            'width', ci.cloudinary_width,
            'height', ci.cloudinary_height
        )
    ) AS images
FROM generated_content gc
LEFT JOIN content_images ci ON gc.id = ci.content_id
WHERE gc.website_id = 'your-website-id'
GROUP BY gc.id
ORDER BY gc.created_at DESC;
*/