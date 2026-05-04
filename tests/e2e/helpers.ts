import type { BrowserContext, Page } from '@playwright/test';

export const ARTICLE_URL = '/article.html';

export const OPENCLAW_URL =
  process.env.OPENCLAW_URL || 'http://localhost:18789/chat?session=agent:main:main';

export async function openArticleAndPopup(context: BrowserContext, extensionId: string) {
  const articlePage = await context.newPage();
  await articlePage.goto(ARTICLE_URL, { waitUntil: 'domcontentloaded' });
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const popup = await context.newPage();
  await articlePage.bringToFront();
  await popup.goto(popupUrl);
  await popup.waitForSelector('[data-testid="popup-sendform"]', { timeout: 5_000 });
  return { articlePage, popup, popupUrl };
}

export type OpenArticleAndPopupResult = {
  articlePage: Page;
  popup: Page;
  popupUrl: string;
};
