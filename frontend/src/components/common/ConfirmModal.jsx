import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { FaExclamationTriangle, FaInfoCircle } from "react-icons/fa";

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  type = "danger",
}) => {
  const isDanger = type === "danger";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="fixed inset-0 z-50 backdrop-blur-[12px] bg-gradient-to-br from-[#1b3764]/85 to-[#0f172a]/90" />
      <DialogContent className="sm:max-w-[400px] rounded-[32px] p-8 border-none shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] gap-0 bg-white/95 backdrop-blur-2xl">
        <DialogHeader className="flex flex-col items-center">
          <div
            className={`w-20 h-20 ${
              isDanger
                ? "bg-red-50 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                : "bg-blue-50 text-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
            } rounded-[24px] flex items-center justify-center text-3xl mb-6 transform rotate-3`}
          >
            {isDanger ? (
              <FaExclamationTriangle className="-rotate-3" />
            ) : (
              <FaInfoCircle className="-rotate-3" />
            )}
          </div>
          <DialogTitle className="text-center text-2xl font-semibold text-[#1b3764] tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center text-[15px] pt-4 leading-relaxed text-[#64748b] font-normal">
            {message}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 py-7 rounded-[20px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all text-[15px]"
          >
            Cancel
          </Button>
          <Button
            variant={isDanger ? "destructive" : "default"}
            onClick={onConfirm}
            className={`flex-[1.5] py-7 rounded-[20px] font-semibold text-[15px] transition-all hover:scale-[1.02] active:scale-[0.98] ${
              isDanger
                ? "bg-red-500 hover:bg-red-600 shadow-[0_10px_20px_rgba(239,68,68,0.25)]"
                : "bg-[#1b3764] hover:bg-[#1b3764]/90 shadow-[0_10px_20px_rgba(27,55,100,0.25)]"
            }`}
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmModal;
