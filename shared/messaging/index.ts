export type { Result, ErrorCode } from './result';
export { Ok, Err } from './result';
export type { ProtocolMap, MetaBumpHelloOutput, ArticleSnapshot } from './protocol';
export { sendMessage, onMessage, schemas, ArticleSnapshotSchema } from './protocol';

// Phase 3 route exports — dispatch
export type {
  DispatchStartInput,
  DispatchStartOutput,
  DispatchCancelInput,
  DispatchCancelOutput,
  DispatchState,
  ProtocolDispatch,
} from './routes/dispatch';
export {
  DispatchStartInputSchema,
  DispatchStartOutputSchema,
  DispatchCancelInputSchema,
  DispatchCancelOutputSchema,
  DispatchStateEnum,
} from './routes/dispatch';

// Phase 3 route exports — history
export type {
  HistoryKind,
  HistoryEntry,
  HistoryListInput,
  HistoryListOutput,
  HistoryDeleteInput,
  HistoryDeleteOutput,
  ProtocolHistory,
} from './routes/history';
export {
  HistoryKindEnum,
  HistoryEntrySchema,
  HistoryListInputSchema,
  HistoryListOutputSchema,
  HistoryDeleteInputSchema,
  HistoryDeleteOutputSchema,
} from './routes/history';

// Phase 3 route exports — binding
export type {
  BindingEntry,
  BindingUpsertInput,
  BindingUpsertOutput,
  BindingGetInput,
  BindingGetOutput,
  ProtocolBinding,
} from './routes/binding';
export {
  BindingEntrySchema,
  BindingUpsertInputSchema,
  BindingUpsertOutputSchema,
  BindingGetInputSchema,
  BindingGetOutputSchema,
} from './routes/binding';
