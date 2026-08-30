import React, { useState } from 'react';
import { X, Upload, Image as ImageIcon, Check, AlertCircle, FileText, ExternalLink, Sparkles } from 'lucide-react';
import { useRole } from '../RoleContext';
import { resolveStorageUrl } from '../../utils';

export interface ProductionProofUploadProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: any; // EditorAssignment or Production record
}

export const ProductionProofUploadModal: React.FC<ProductionProofUploadProps> = ({
  isOpen,
  onClose,
  assignment
}) => {
  const { pushUpdate, logActivity, currentUserName, refreshData } = useRole();

  const [proofInputType, setProofInputType] = useState<'file' | 'url'>('file');
  const [proofUrl, setProofUrl] = useState('');
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [proofLabel, setProofLabel] = useState('Client Review & Communication Proof');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !assignment) return null;

  const assignmentId = assignment.assignment_id;
  const taskName = assignment.speciality || assignment.task_name || 'Production Task';
  const staffName = assignment.staff_name || 'Assigned Editor';
  const orderId = assignment.order_id || assignment.production_id || '';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size must be less than 10MB.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setFileData(reader.result as string);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalProofUrl = proofInputType === 'file' ? fileData : proofUrl;

    if (!finalProofUrl) {
      setErrorMsg('Please select an image file or enter a valid proof URL.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      if (assignmentId) {
        // STRICT TASK ISOLATION: Update ONLY this task's assignment_id in editor_assignments
        await pushUpdate('editor_assignments', 'assignment_id', assignmentId, {
          confirmation_proof: finalProofUrl,
          customer_communication_proof: finalProofUrl,
          proof_url: finalProofUrl,
          uploaded_proof: finalProofUrl,
          updated_at: new Date().toISOString()
        });
      } else if (assignment.production_id) {
        // Update main production record proof
        await pushUpdate('production', 'production_id', assignment.production_id, {
          client_communication_proof: finalProofUrl,
          updated_at: new Date().toISOString()
        });
      }

      await logActivity({
        log_id: `log_${Date.now()}`,
        user_name: currentUserName || 'Editor',
        role: 'Production Staff',
        action: `Uploaded Proof Image for Task (${taskName}) assigned to ${staffName}`,
        module: 'Production',
        record_id: orderId,
        timestamp: new Date().toISOString()
      });

      if (refreshData) refreshData();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to upload proof image.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[240] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <Upload className="w-3 h-3" />
              TASK-SPECIFIC PROOF UPLOAD
            </span>
            <h3 className="text-base font-bold text-white mt-1">
              {taskName}
            </h3>
            <p className="text-xs text-zinc-400 font-mono">Assigned Staff: {staffName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4 text-xs font-mono">
          
          {/* Input Type Selector */}
          <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setProofInputType('file')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                proofInputType === 'file' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Upload Local File
            </button>
            <button
              type="button"
              onClick={() => setProofInputType('url')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                proofInputType === 'url' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Paste Image URL
            </button>
          </div>

          {proofInputType === 'file' ? (
            <div className="space-y-2">
              <label className="text-zinc-300 font-bold block">Select Proof Image / Screenshot *</label>
              <div className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-xl p-4 text-center transition-all bg-zinc-900/40">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="task_proof_file_input"
                />
                <label htmlFor="task_proof_file_input" className="cursor-pointer space-y-2 block">
                  <ImageIcon className="w-8 h-8 text-emerald-400 mx-auto" />
                  <span className="text-xs font-bold text-zinc-200 block">
                    {fileName ? fileName : 'Click to select proof image file'}
                  </span>
                  <span className="text-[10px] text-zinc-500 block">
                    Supports JPG, PNG, WEBP, PDF (Max 10MB)
                  </span>
                </label>
              </div>

              {fileData && (
                <div className="mt-2 p-2 bg-zinc-900 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block mb-1">Image Preview:</span>
                  <img
                    src={fileData}
                    alt="Proof Preview"
                    className="max-h-36 max-w-full rounded-lg object-contain mx-auto"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-zinc-300 font-bold block">Proof Image Direct Storage URL *</label>
              <input
                type="url"
                placeholder="https://..."
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-zinc-300 font-bold block">Proof Description / Label</label>
            <input
              type="text"
              value={proofLabel}
              onChange={(e) => setProofLabel(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-850">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition-all cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              disabled={isUploading}
            >
              <Upload className="w-4 h-4" />
              <span>{isUploading ? 'Uploading...' : 'Save Task Proof'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
