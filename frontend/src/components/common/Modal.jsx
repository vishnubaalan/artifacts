import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { X } from "lucide-react";

const Modal = ({ isOpen, onClose, title, children, maxWidth = "500px" }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="fixed inset-0 z-50 backdrop-blur-[12px] bg-gradient-to-br from-[#1b3764]/85 to-[#0f172a]/90" />
      <DialogContent 
        className="rounded-[32px] overflow-hidden p-0 border-none shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] bg-white/95 backdrop-blur-2xl"
        style={{ maxWidth: maxWidth }}
      >
        <DialogHeader className="px-9 py-7 border-b border-slate-50 bg-white">
          <DialogTitle className="text-xl font-semibold text-[#1b3764] tracking-tight">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="p-9 overflow-y-auto max-h-[85vh]">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
