import { storage } from 'wxt/utils/storage';
import { CURRENT_SCHEMA_VERSION, migrations } from './migrate';

export interface MetaSchema {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  helloCount: number;
}

export const META_DEFAULT: MetaSchema = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  helloCount: 0,
};

export const metaItem = storage.defineItem<MetaSchema>('local:meta', {
  fallback: META_DEFAULT,
  version: CURRENT_SCHEMA_VERSION,
  migrations,
});
