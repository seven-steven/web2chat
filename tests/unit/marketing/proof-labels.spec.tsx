import { render } from 'preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getPayloadExample,
  getProofMetadata,
  getThreeStepFlow,
} from '@/apps/marketing/src/data/site-content';

let container: HTMLDivElement;

const sourceLabel = 'source:';
const statusLabel = 'status:';
const versionLabel = 'version:';
const primaryLabel = 'Primary CTA';
const secondaryLabel = 'Secondary CTA';
const platformLabel = 'Discord';
const helperText = 'Delivered via browser tab';
const resultLabel = 'result';
const statusText = 'marketing demo aligned to current UI contract';
const messageText = 'title + url + prompt delivered through direct browser interaction';

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  render(null, container);
  container.remove();
});

describe('marketing proof components', () => {
  it('renders CTA button primary and secondary variants with shared focus and height contract', async () => {
    const { CTAButton } = await import('@/apps/marketing/src/components/cta-button');

    render(
      <div>
        <CTAButton href="https://example.com/primary">{primaryLabel}</CTAButton>
        <CTAButton href="https://example.com/secondary" variant="secondary">
          {secondaryLabel}
        </CTAButton>
      </div>,
      container,
    );

    const links = Array.from(container.querySelectorAll('a'));
    expect(links).toHaveLength(2);
    expect(links[0]?.getAttribute('data-variant')).toBe('primary');
    expect(links[1]?.getAttribute('data-variant')).toBe('secondary');
    for (const link of links) {
      expect(link.className).toContain('min-h-11');
      expect(link.className).toContain('focus-visible:ring-2');
      expect(link.className).toContain('focus-visible:ring-[var(--color-accent-ring)]');
    }
  });

  it('renders exactly three ordered steps with mobile and desktop layout utilities', async () => {
    const { Stepper } = await import('@/apps/marketing/src/components/flow/stepper');
    const steps = getThreeStepFlow();

    render(<Stepper steps={steps} />, container);

    const orderedList = container.querySelector('[data-testid="marketing-stepper"]');
    expect(orderedList).toBeTruthy();
    expect(orderedList?.className).toContain('flex-col');
    expect(orderedList?.className).toContain('md:grid-cols-3');

    const items = Array.from(container.querySelectorAll('li'));
    expect(items).toHaveLength(3);
    expect(items.map((item) => item.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      expect.stringContaining(steps[0]!.title),
      expect.stringContaining(steps[1]!.title),
      expect.stringContaining(steps[2]!.title),
    ]);
  });

  it('renders visible mockup metadata labels', async () => {
    const { AssetLabel } = await import('@/apps/marketing/src/components/proof/asset-label');
    const metadata = getProofMetadata();

    render(
      <AssetLabel
        metadata={metadata}
        sourceLabel={sourceLabel}
        statusLabel={statusLabel}
        versionLabel={versionLabel}
      />,
      container,
    );

    expect(container.textContent).toContain('mockup');
    expect(container.textContent).toContain(sourceLabel);
    expect(container.textContent).toContain(metadata.source);
    expect(container.textContent).toContain(statusLabel);
    expect(container.textContent).toContain(metadata.status);
    expect(container.textContent).toContain(versionLabel);
    expect(container.textContent).toContain(metadata.version);
  });

  it('renders popup payload fields in fixed order', async () => {
    const { PopupMockup } = await import('@/apps/marketing/src/components/proof/popup-mockup');
    const payload = getPayloadExample();

    render(
      <PopupMockup
        title={payload.title}
        fields={payload.fields}
        metadata={getProofMetadata()}
        sourceLabel={sourceLabel}
        statusLabel={statusLabel}
        versionLabel={versionLabel}
      />,
      container,
    );

    const keys = Array.from(container.querySelectorAll('[data-field-key]')).map((node) =>
      node.getAttribute('data-field-key'),
    );
    expect(keys).toEqual(['title', 'url', 'description', 'create_at', 'content', 'prompt']);
  });

  it('renders popup and target mockups with visible proof metadata rows', async () => {
    const { PopupMockup } = await import('@/apps/marketing/src/components/proof/popup-mockup');
    const { TargetMockup } = await import('@/apps/marketing/src/components/proof/target-mockup');
    const payload = getPayloadExample();
    const metadata = getProofMetadata();

    render(
      <div>
        <PopupMockup
          title={payload.title}
          fields={payload.fields}
          metadata={metadata}
          sourceLabel={sourceLabel}
          statusLabel={statusLabel}
          versionLabel={versionLabel}
        />
        <TargetMockup
          metadata={metadata}
          platform={platformLabel}
          status={statusText}
          message={messageText}
          sourceLabel={sourceLabel}
          statusLabel={statusLabel}
          versionLabel={versionLabel}
          helperText={helperText}
          resultLabel={resultLabel}
        />
      </div>,
      container,
    );

    expect(container.querySelectorAll('[data-testid="popup-mockup"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-testid="target-mockup"]')).toHaveLength(1);
    expect(container.textContent?.match(/mockup/g)?.length).toBe(2);
    expect(container.textContent?.match(/source:/g)?.length).toBe(2);
    expect(container.textContent?.match(/status:/g)?.length).toBe(2);
    expect(container.textContent?.match(/version:/g)?.length).toBe(2);
  });

  it('does not leave english proof labels in zh_CN locale data', async () => {
    const { getProofLabels } = await import('@/apps/marketing/src/data/site-content');
    const { setLocale } = await import('@/apps/marketing/src/i18n/index');

    await setLocale('zh_CN');
    const proofLabels = getProofLabels();

    expect(proofLabels.source).toBe('来源：');
    expect(proofLabels.status).toBe('状态：');
    expect(proofLabels.version).toBe('版本：');
    expect(Object.values(proofLabels)).not.toContain(sourceLabel);
    expect(Object.values(proofLabels)).not.toContain(statusLabel);
    expect(Object.values(proofLabels)).not.toContain(versionLabel);
  });
});
