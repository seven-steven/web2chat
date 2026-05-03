/**
 * Granted origins CRUD repo (D-45).
 * Stores origins (scheme + host + port) that the user has granted via
 * chrome.permissions.request. Used by popup (permission check on Confirm)
 * and options page (list + remove management).
 */
import { grantedOriginsItem } from '@/shared/storage/items';

export async function list(): Promise<string[]> {
  return await grantedOriginsItem.getValue();
}

export async function add(origin: string): Promise<void> {
  const current = await grantedOriginsItem.getValue();
  if (!current.includes(origin)) {
    await grantedOriginsItem.setValue([...current, origin]);
  }
}

export async function remove(origin: string): Promise<void> {
  const current = await grantedOriginsItem.getValue();
  await grantedOriginsItem.setValue(current.filter((o) => o !== origin));
}

export async function has(origin: string): Promise<boolean> {
  try {
    const chromeGranted = await chrome.permissions.contains({
      origins: [origin + '/*'],
    });
    if (chromeGranted) return true;
  } catch {
    // chrome.permissions.contains not available (test env) — fall through to local mirror
  }
  const current = await grantedOriginsItem.getValue();
  return current.includes(origin);
}
