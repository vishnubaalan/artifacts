import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

const InputModal = ({ isOpen, onClose, onSubmit, title, label, placeholder, initialValue = '', submitText = 'Create' }) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) setValue(initialValue);
  }, [isOpen, initialValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="fixed inset-0 z-50 backdrop-blur-[12px] bg-gradient-to-br from-[#1b3764]/85 to-[#0f172a]/90" />
      <DialogContent className="sm:max-w-[450px] rounded-[32px] p-10 border-none shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] gap-0 bg-white/95 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-[#1b3764] tracking-tight mb-8">
            {title}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="space-y-4">
            <Label htmlFor="modal-input" className="text-[12px] font-semibold text-slate-400 uppercase tracking-[0.15em] ml-1">
              {label}
            </Label>
            <Input 
              id="modal-input"
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={placeholder}
              className="h-14 px-6 rounded-2xl border-2 border-slate-100 bg-white focus:border-[#1b3764] focus:ring-0 transition-all font-medium text-[16px] text-slate-700 placeholder:text-slate-300 placeholder:font-normal"
            />
          </div>

          <div className="flex items-center justify-end gap-6 pt-2">
            <button 
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 font-semibold text-[15px] transition-colors"
            >
              Cancel
            </button>
            <Button 
              type="submit"
              disabled={!value.trim()}
              className="px-10 py-7 rounded-2xl font-semibold text-[15px] bg-[#1b3764] hover:bg-[#1b3764]/90 text-white shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
            >
              {submitText}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InputModal;
