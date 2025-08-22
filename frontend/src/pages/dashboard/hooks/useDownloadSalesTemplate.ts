import { useState } from 'react';
import { downloadSalesTemplate } from '../../../api/dashboard';

export function useDownloadSalesTemplate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function downloadTemplate(defaultDate?: string) {
    setLoading(true);
    setError(null);

    try {
      const blob = await downloadSalesTemplate(defaultDate);
      const { blob: fileBlob, filename: respFilename } = blob as any;
      const filename = respFilename || (defaultDate ? `sale_template_${defaultDate.split('T')[0]}.xlsx` : `sale_template_${new Date().toISOString().slice(0,10)}.xlsx`);
      const url = window.URL.createObjectURL(fileBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'sales_upload_template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return { downloadTemplate, loading, error };
}
