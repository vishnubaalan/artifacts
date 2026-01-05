import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { FaCheckCircle } from "react-icons/fa";

const Toast = ({ message, isOpen, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-slate-900/90 backdrop-blur-xl text-white px-7 py-3.5 rounded-full border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <FaCheckCircle className="text-emerald-400 text-lg" />
      <span className="text-[14px] font-semibold tracking-wide">{message}</span>
    </div>,
    document.body
  );
};

export default Toast;
