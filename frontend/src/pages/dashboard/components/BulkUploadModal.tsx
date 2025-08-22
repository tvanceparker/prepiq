import React, { useState, useCallback } from 'react';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Button from '../../../components/Button';
import Typography from '@mui/material/Typography';
import { useUploadSalesData } from '../hooks/useUploadSalesData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpload?: (file: File) => Promise<any>;
}

export default function BulkUploadModal({ isOpen, onClose, onUpload }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const { upload: internalUpload } = useUploadSalesData();

  const handleFile = React.useCallback(async (f: File | null) => {
    if (!f) return;
    const uploader = onUpload ?? internalUpload;
    await uploader(f);
    onClose();
  }, [onUpload, internalUpload, onClose]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) await handleFile(f);
    },
    [handleFile]
  );

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f) await handleFile(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <Box sx={{ width: 700, mx: 'auto', mt: '8%', p: 4, bgcolor: 'background.paper' }}>
        <Typography variant="h6">Upload Menu CSV or XLSX</Typography>

        <Box
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          sx={{ border: '2px dashed', borderColor: dragOver ? 'primary.main' : 'grey.300', p: 3, mt: 2, borderRadius: 1, textAlign: 'center' }}
        >
          <Typography variant="body2" sx={{ mb: 1 }}>
            Drag and drop your CSV or XLSX file here, or click to select file
          </Typography>
          <input id="file-upload" type="file" accept=".csv,.xlsx" style={{ display: 'none' }} onChange={handleChange} />
          <label htmlFor="file-upload">
            <Button variant="create">Select File</Button>
          </label>
        </Box>

        <Box mt={2} display="flex" justifyContent="flex-end">
          <Button onClick={onClose} variant="clear">Cancel</Button>
        </Box>
      </Box>
    </Modal>
  );
}
