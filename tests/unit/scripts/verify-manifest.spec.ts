import { describe, it, expect } from 'vitest';
import { assertManifest, type Manifest } from '@/scripts/verify-manifest';

function validManifest(overrides: Partial<Manifest> = {}): Manifest {
  return {
    name: '__MSG_extension_name__',
    description: '__MSG_extension_description__',
    default_locale: 'en',
    permissions: ['activeTab', 'scripting', 'storage'],
    host_permissions: ['https://discord.com/*'],
    optional_host_permissions: ['<all_urls>'],
    action: { default_title: '__MSG_action_default_title__' },
    commands: {
      _execute_action: {
        suggested_key: { default: 'Ctrl+Shift+S', mac: 'Command+Shift+S' },
        description: '__MSG_command_open_popup__',
      },
    },
    ...overrides,
  };
}

describe('verify-manifest assertManifest — Phase 3 (DSP-10 + D-37)', () => {
  it('valid manifest produces no errors', () => {
    const errors: string[] = [];
    assertManifest(validManifest(), errors);
    expect(errors).toEqual([]);
  });

  it('missing commands._execute_action produces error', () => {
    const errors: string[] = [];
    assertManifest(validManifest({ commands: undefined }), errors);
    expect(errors.some((e) => e.includes('_execute_action missing'))).toBe(true);
  });

  it('wrong suggested_key.default produces error', () => {
    const errors: string[] = [];
    assertManifest(
      validManifest({
        commands: {
          _execute_action: {
            suggested_key: { default: 'Ctrl+Shift+X', mac: 'Command+Shift+S' },
            description: '__MSG_command_open_popup__',
          },
        },
      }),
      errors,
    );
    expect(errors.some((e) => e.includes('Ctrl+Shift+S'))).toBe(true);
  });

  it('wrong suggested_key.mac produces error', () => {
    const errors: string[] = [];
    assertManifest(
      validManifest({
        commands: {
          _execute_action: {
            suggested_key: { default: 'Ctrl+Shift+S', mac: 'Option+Shift+S' },
            description: '__MSG_command_open_popup__',
          },
        },
      }),
      errors,
    );
    expect(errors.some((e) => e.includes('Command+Shift+S'))).toBe(true);
  });

  it('description without __MSG_*__ produces error', () => {
    const errors: string[] = [];
    assertManifest(
      validManifest({
        commands: {
          _execute_action: {
            suggested_key: { default: 'Ctrl+Shift+S', mac: 'Command+Shift+S' },
            description: 'Hardcoded',
          },
        },
      }),
      errors,
    );
    expect(errors.some((e) => e.includes('__MSG_'))).toBe(true);
  });

  it('options_ui absent produces no error (Wave 1 build form, Plan 07 lands entrypoint later)', () => {
    const errors: string[] = [];
    assertManifest(validManifest({ options_ui: undefined }), errors);
    expect(errors).toEqual([]);
  });

  it('options_ui present with correct page produces no error (Plan 07 post-build form)', () => {
    const errors: string[] = [];
    assertManifest(
      validManifest({ options_ui: { page: 'options.html', open_in_tab: false } }),
      errors,
    );
    expect(errors).toEqual([]);
  });

  it('options_ui present with wrong page produces error', () => {
    const errors: string[] = [];
    assertManifest(validManifest({ options_ui: { page: 'wrong.html' } }), errors);
    expect(errors.some((e) => e.includes('options_ui.page'))).toBe(true);
  });
});
