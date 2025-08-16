import { useState } from "react";
import { downloadSalesTemplate } from "../../../api/dashboard";  // make sure import matches

export function useDownloadSalesTemplate() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function downloadTemplate(defaultDate) {
        setLoading(true);
        setError(null);

        try {
            // Pass defaultDate param to API call
            const blob = await downloadSalesTemplate(defaultDate);

            // Trigger file download in browser, use filename suggested by server when available
            const { blob: fileBlob, filename: respFilename } = blob;
            const filename = respFilename || (defaultDate ? `sale_template_${defaultDate.split("T")[0]}.xlsx` : `sale_template_${new Date().toISOString().slice(0,10)}.xlsx`);
            const url = window.URL.createObjectURL(fileBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename || "sales_upload_template.xlsx";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }

    return { downloadTemplate, loading, error };
}
