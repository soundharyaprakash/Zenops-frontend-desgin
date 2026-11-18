"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { CIBulkUpload } from "./CIBulkUpload";

interface CIBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CIBulkUploadModal({ isOpen, onClose, onSuccess }: CIBulkUploadModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Import Configuration Items (CSV)"
      description="Upload or paste CSV spreadsheet data to batch create multiple CIs in the CMDB."
      maxWidth="4xl"
    >
      <div className="p-6">
        <CIBulkUpload
          onSuccess={() => {
            if (onSuccess) onSuccess();
            onClose();
          }}
          onCancel={onClose}
        />
      </div>
    </Modal>
  );
}
