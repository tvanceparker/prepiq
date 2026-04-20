import { useState } from 'react';
import { uploadSalesData } from '../../../api/dashboard';
import type { SalesUploadResponseDTO } from '../../../interfaces/dashboardInterfaceFrontend';

export const useUploadSalesData = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<SalesUploadResponseDTO | null>(null);

  const reset = () => {
    setError(null);
    setResult(null);
  };

  const upload = async (file: File, overwrite = false) => {
    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const data = await uploadSalesData(file, overwrite);
      setResult(data);
      return data;
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, error, result, reset };
};
