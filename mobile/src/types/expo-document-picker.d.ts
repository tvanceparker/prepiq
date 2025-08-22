declare module 'expo-document-picker' {
  export type DocumentPickerAsset = {
    uri: string;
    name?: string;
    mimeType?: string;
    size?: number;
  };
  export type DocumentPickerResult = { canceled: boolean; assets?: DocumentPickerAsset[] };
  export function getDocumentAsync(options?: {
    type?: string | string[];
  }): Promise<DocumentPickerResult>;
}
