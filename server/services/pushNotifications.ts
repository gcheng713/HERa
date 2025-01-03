import webpush from 'web-push';
import { db } from '@db';
import { pushSubscriptions, legalUpdateNotifications } from '@db/schema';
import { eq } from 'drizzle-orm';

// Generate VAPID keys if not already set
if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  const vapidKeys = webpush.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
  process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;
}

webpush.setVapidDetails(
  'mailto:support@hera.org',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendNotification(subscription: PushSubscription, data: any) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    if (error.statusCode === 410) {
      // Subscription has expired or is no longer valid
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, subscription.endpoint));
    }
    return false;
  }
}

export async function broadcastLegalUpdate(
  state: string,
  title: string,
  description: string,
  urgency: 'normal' | 'urgent' = 'normal'
) {
  try {
    // Insert the notification
    const [notification] = await db.insert(legalUpdateNotifications).values({
      state,
      title,
      description,
      urgency,
    }).returning();

    // Get all active subscriptions for this state
    const activeSubscriptions = await db.query.pushSubscriptions.findMany({
      where: (subscription) => {
        const statesArray = subscription.states as string[];
        return eq(subscription.active, true) && statesArray.includes(state);
      },
    });

    // Send notifications
    const notificationPromises = activeSubscriptions.map(sub => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        }
      };

      return sendNotification(pushSubscription, {
        title,
        body: description,
        tag: `legal-update-${state}`,
        data: {
          url: `/legal-info?state=${state}`,
          timestamp: new Date().toISOString(),
        }
      });
    });

    await Promise.allSettled(notificationPromises);

    // Update the notification as sent
    await db
      .update(legalUpdateNotifications)
      .set({ notifiedAt: new Date() })
      .where(eq(legalUpdateNotifications.id, notification.id));

    return notification;
  } catch (error) {
    console.error('Error broadcasting legal update:', error);
    throw error;
  }
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY;
}
