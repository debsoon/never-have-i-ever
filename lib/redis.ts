import { Redis } from "@upstash/redis";

if (!process.env.REDIS_URL || !process.env.REDIS_TOKEN) {
  console.warn(
    "REDIS_URL or REDIS_TOKEN environment variable is not defined, please add to enable background notifications and webhooks.",
  );
}

export const redis =
  process.env.REDIS_URL && process.env.REDIS_TOKEN
    ? new Redis({
        url: process.env.REDIS_URL,
        token: process.env.REDIS_TOKEN,
      })
    : null;

export async function getUserPromptCount(address: string): Promise<number> {
  if (!redis) {
    console.error('Redis not initialized')
    return 0
  }

  try {
    const count = await redis.get(`user:${address}:promptCount`)
    if (count === null || typeof count === 'object') {
      return 0
    }
    return parseInt(String(count))
  } catch (error) {
    console.error('Error getting user prompt count:', error)
    return 0
  }
}

export async function incrementUserPromptCount(address: string): Promise<void> {
  if (!redis) {
    console.error('Redis not initialized')
    return
  }

  try {
    const currentCount = await getUserPromptCount(address)
    await redis.set(`user:${address}:promptCount`, (currentCount + 1).toString())
  } catch (error) {
    console.error('Error incrementing user prompt count:', error)
  }
}
