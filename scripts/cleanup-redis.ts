import { Redis } from '@upstash/redis'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

async function cleanupRedis() {
  try {
    console.log('Starting Redis cleanup...')

    // Get all prompt keys
    const promptKeys = await redis.keys('prompt:*')
    console.log(`Found ${promptKeys.length} prompts to delete`)

    // Get all confession keys
    const confessionKeys = await redis.keys('confession:*')
    console.log(`Found ${confessionKeys.length} confessions to delete`)

    // Get all payment keys
    const paymentKeys = await redis.keys('payment:*')
    console.log(`Found ${paymentKeys.length} payments to delete`)

    // Get all image keys
    const imageKeys = await redis.keys('image:*')
    console.log(`Found ${imageKeys.length} images to delete`)

    // Delete all keys
    const allKeys = [...promptKeys, ...confessionKeys, ...paymentKeys, ...imageKeys]
    if (allKeys.length > 0) {
      await redis.del(...allKeys)
      console.log(`Successfully deleted ${allKeys.length} keys`)
    } else {
      console.log('No keys found to delete')
    }

    // Delete the prompts list
    await redis.del('prompts:list')
    console.log('Deleted prompts list')

    console.log('Redis cleanup completed successfully!')
  } catch (error) {
    console.error('Error during Redis cleanup:', error)
    process.exit(1)
  }
}

cleanupRedis() 