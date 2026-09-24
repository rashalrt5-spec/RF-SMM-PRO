import orderHandler from './smm/order';
import balanceHandler from './smm/balance';
import statusHandler from './smm/status';
import servicesHandler from './smm/services';
import configHandler from './smm/config';
import telegramHandler from './telegram/order-notify';
import aiSupportHandler from './ai-support';
import healthHandler from './health';

export default async function handler(req: any, res: any) {
  const url = req.url || '';

  if (url.includes('/smm/order')) {
    return orderHandler(req, res);
  }
  if (url.includes('/smm/balance')) {
    return balanceHandler(req, res);
  }
  if (url.includes('/smm/status')) {
    return statusHandler(req, res);
  }
  if (url.includes('/smm/services')) {
    return servicesHandler(req, res);
  }
  if (url.includes('/smm/config')) {
    return configHandler(req, res);
  }
  if (url.includes('/telegram/order-notify') || url.includes('/telegram-notify')) {
    return telegramHandler(req, res);
  }
  if (url.includes('/ai-support')) {
    return aiSupportHandler(req, res);
  }
  if (url.includes('/health')) {
    return healthHandler(req, res);
  }

  return healthHandler(req, res);
}
