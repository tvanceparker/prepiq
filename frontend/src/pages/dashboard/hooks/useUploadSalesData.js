import { useState } from "react";
import { uploadSalesData } from "../../../api/dashboard"; 

export const useUploadSalesData = () => {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    const upload = async (file, overwrite = false) => {
        setUploading(true);
        setError(null);

        try {
            const data = await uploadSalesData(file, overwrite);
            setResult(data);
            return data;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setUploading(false);
        }
    };

    return { upload, uploading, error, result };
};
