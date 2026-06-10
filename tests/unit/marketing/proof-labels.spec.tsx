import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'preact';
import { SectionShell } from '../../../apps/marketing/src/components/section-shell';
import { CtaButton } from '../../../apps/marketing/src/components/cta-button';
import { AssetLabel } from '../../../apps/marketing/src/components/proof/asset-label';
import { PopupMockup } from '../../../apps/marketing/src/components/proof/popup-mockup';
import { TargetMockup } from '../../../apps/marketing/src/components/proof/target-mockup';
import { Stepper } from '../../../apps/marketing/src/components/flow/stepper';
import {
  getFlowSteps,
  getPayloadExample,
  getProofMeta,
  PAYLOAD_FIELD_ORDER,
  REPO_URL,
} from '../../../apps/marketing/src/data/site-content';
import type { FlowStep } from '../../../apps/marketing/src/data/site-content';

/**
 * Phase 15 Plan 02 — shared marketing component + proof metadata regression tests.
 *
 * Mitigation anchors:
 *   - T-15-04 (Spoofing): every proof mockup must render a visible `mockup`
 *     label and a source/status/version metadata row.
 *   - T-15-05 (Tampering): stepper encodes exactly 3 ordered steps.
 *   - T-15-06 (DoS / a11y): CTA keeps 44px target + visible focus ring;
 *     decorative mockup SVGs stay aria-hidden.
 *
 * TDD RED: the component modules do not exist yet — this file fails on import
 * until the GREEN step implements them.
 */

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  render(null, container);
  container.remove();
});

function flowTuple(): readonly [FlowStep, FlowStep, FlowStep] {
  const [a, b, c] = getFlowSteps();
  if (!a || !b || !c) throw new Error('expected exactly 3 flow steps from site-content');
  return [a, b, c] as const;
}

const ctaLabel = 'view source';
const targetProps = {
  chatLabel: '#research',
  messageLines: [
    'structuredClone() - Web APIs | MDN',
    'https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone',
    'summarize this page and add it to my llm-wiki.',
  ],
  statusLabel: 'delivered to chat input',
};

describe('CtaButton — D-12/D-13 shared CTA visual contract', () => {
  it('primary variant renders accent fill with 44px min height and focus ring', () => {
    render(
      <CtaButton href={REPO_URL} variant="primary">
        {ctaLabel}
      </CtaButton>,
      container,
    );
    const link = container.querySelector('a');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe(REPO_URL);
    expect(link?.className).toContain('min-h-[44px]');
    expect(link?.className).toContain('focus-visible:ring');
    expect(link?.className).toContain('bg-[var(--color-accent)]');
    expect(link?.textContent).toBe(ctaLabel);
  });

  it('secondary variant keeps the same 44px height and focus ring but uses bordered surface styling', () => {
    render(
      <CtaButton href={REPO_URL} variant="secondary">
        {ctaLabel}
      </CtaButton>,
      container,
    );
    const link = container.querySelector('a');
    expect(link).toBeTruthy();
    expect(link?.className).toContain('min-h-[44px]');
    expect(link?.className).toContain('focus-visible:ring');
    expect(link?.className).toContain('border');
    expect(link?.className).toContain('bg-[var(--color-surface)]');
    expect(link?.className).not.toContain('bg-[var(--color-accent)]');
  });
});

describe('Stepper — D-08 fixed three-step flow (T-15-05)', () => {
  it('renders exactly 3 ordered steps inside an ordered list', () => {
    render(<Stepper steps={flowTuple()} />, container);
    const ol = container.querySelector('ol');
    expect(ol).toBeTruthy();
    const items = Array.from(container.querySelectorAll('ol > li'));
    expect(items).toHaveLength(3);
    const steps = flowTuple();
    items.forEach((li, i) => {
      expect(li.getAttribute('data-testid')).toBe(`flow-step-${i + 1}`);
      expect(li.textContent).toContain(steps[i]!.title);
      expect(li.textContent).toContain(steps[i]!.description);
    });
  });

  it('switches between horizontal and vertical layout via utility classes without changing semantic order', () => {
    render(<Stepper steps={flowTuple()} orientation="horizontal" />, container);
    const horizontalOl = container.querySelector('ol');
    expect(horizontalOl?.className).toContain('flex-row');
    const horizontalOrder = Array.from(container.querySelectorAll('ol > li')).map((li) =>
      li.getAttribute('data-testid'),
    );

    render(null, container);
    render(<Stepper steps={flowTuple()} orientation="vertical" />, container);
    const verticalOl = container.querySelector('ol');
    expect(verticalOl?.className).toContain('flex-col');
    const verticalOrder = Array.from(container.querySelectorAll('ol > li')).map((li) =>
      li.getAttribute('data-testid'),
    );

    expect(horizontalOrder).toEqual(['flow-step-1', 'flow-step-2', 'flow-step-3']);
    expect(verticalOrder).toEqual(horizontalOrder);
  });
});

describe('AssetLabel — D-05 mockup labeling contract (T-15-04)', () => {
  it('renders visible mockup text plus source, status, version metadata labels', () => {
    render(<AssetLabel meta={getProofMeta()} />, container);
    const label = container.querySelector('[data-testid="asset-label"]');
    expect(label).toBeTruthy();
    const text = label?.textContent ?? '';
    expect(text).toContain('mockup');
    expect(text).toContain('source: code-generated');
    expect(text).toContain('status:');
    expect(text).toContain('version:');
  });
});

describe('PopupMockup — D-06/D-10 payload proof module', () => {
  it('renders payload fields in the fixed order title, url, description, create_at, content, prompt', () => {
    render(<PopupMockup payload={getPayloadExample()} meta={getProofMeta()} />, container);
    const keys = Array.from(container.querySelectorAll('[data-field-key]')).map((el) =>
      el.getAttribute('data-field-key'),
    );
    expect(keys).toEqual([...PAYLOAD_FIELD_ORDER]);
  });

  it('uses popup-style field rows with mono value surfaces instead of a raw pre block', () => {
    render(<PopupMockup payload={getPayloadExample()} meta={getProofMeta()} />, container);
    expect(container.querySelector('pre')).toBeNull();
    const urlValue = container.querySelector('[data-field-key="url"] dd');
    expect(urlValue?.className).toContain('font-mono');
  });
});

describe('proof mockups — visible mockup label + metadata row on every module (T-15-04)', () => {
  it('popup mockup shows the mockup label and source/status/version metadata row', () => {
    render(<PopupMockup payload={getPayloadExample()} meta={getProofMeta()} />, container);
    const label = container.querySelector('[data-testid="asset-label"]');
    expect(label).toBeTruthy();
    const text = label?.textContent ?? '';
    expect(text).toContain('mockup');
    expect(text).toContain('source:');
    expect(text).toContain('status:');
    expect(text).toContain('version:');
  });

  it('target mockup shows the mockup label, metadata row, and delivery copy', () => {
    render(<TargetMockup meta={getProofMeta()} {...targetProps} />, container);
    const label = container.querySelector('[data-testid="asset-label"]');
    expect(label).toBeTruthy();
    const text = label?.textContent ?? '';
    expect(text).toContain('mockup');
    expect(text).toContain('source:');
    expect(text).toContain('status:');
    expect(text).toContain('version:');
    expect(container.textContent).toContain(targetProps.statusLabel);
    expect(container.textContent).toContain(targetProps.chatLabel);
  });

  it('keeps decorative mockup SVGs out of the accessibility tree (T-15-06)', () => {
    render(<TargetMockup meta={getProofMeta()} {...targetProps} />, container);
    for (const svg of Array.from(container.querySelectorAll('svg'))) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    }
    render(null, container);
    render(<PopupMockup payload={getPayloadExample()} meta={getProofMeta()} />, container);
    for (const svg of Array.from(container.querySelectorAll('svg'))) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    }
  });
});

describe('SectionShell — D-01/D-04 banded single-column wrapper', () => {
  it('renders an h2 title with explicit band tone and width props', () => {
    const sectionTitle = 'supported platforms';
    render(
      <SectionShell tone="subtle" width="4xl" title={sectionTitle}>
        <p>{ctaLabel}</p>
      </SectionShell>,
      container,
    );
    const section = container.querySelector('section');
    expect(section?.className).toContain('bg-[var(--color-surface-subtle)]');
    const h2 = container.querySelector('h2');
    expect(h2?.textContent).toBe(sectionTitle);
    expect(container.innerHTML).toContain('max-w-4xl');
  });
});
