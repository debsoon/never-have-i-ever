import { NextResponse } from 'next/server';
import { redisHelper } from '@/app/lib/redis';
import { getUserNotificationDetails } from '@/lib/notification';

export async function GET() {
  try {
    const now = Date.now();
    const oneHourFromNow = now + 60 * 60 * 1000; // 1 hour from now

    // Get all prompts
    const prompts = await redisHelper.getAllPrompts();
    
    // Filter prompts that expire in the next hour
    const expiringPrompts = prompts.filter(prompt => 
      prompt.expiresAt > now && 
      prompt.expiresAt <= oneHourFromNow
    );

    // Send notifications to prompt creators
    for (const prompt of expiringPrompts) {
      const notificationDetails = await getUserNotificationDetails(prompt.authorFid);
      if (notificationDetails) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fid: prompt.authorFid,
            notification: {
              title: 'Your Prompt Expires in 1h!',
              body: `Share it now to get more confessions before time runs out ⏳`,
            },
          }),
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      expiringPrompts: expiringPrompts.length 
    });
  } catch (error) {
    console.error('Error checking expiring prompts:', error);
    return NextResponse.json({ 
      error: 'Failed to check expiring prompts' 
    }, { status: 500 });
  }
} 