import { useState } from 'react';
import { uploadSalesData } from '../../../api/dashboard';

export const useUploadSalesData = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<any>(null);

  const upload = async (file: File, overwrite = false) => {
    setUploading(true);
    setError(null);

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

  return { upload, uploading, error, result };
};
