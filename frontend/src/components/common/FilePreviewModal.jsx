import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { FaSpinner, FaDownload, FaExclamationTriangle, FaFileAlt } from "react-icons/fa";
import { Button } from "../ui/button";

const FilePreviewModal = ({ isOpen, onClose, file }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [content, setContent] = useState(null);

  useEffect(() => {
    if (isOpen && file) {
      setLoading(true);
      setError(null);
      setContent(null);

      const ext = file.name.split(".").pop().toLowerCase();
      
      // Text/Code files that we want to fetch and display
      const textExtensions = [
        "txt", "md", "json", "js", "jsx", "ts", "tsx", "css", "html", 
        "xml", "yaml", "yml", "sql", "java", "py", "c", "cpp", "h", 
        "sh", "log", "conf", "ini", "env"
      ];

      if (textExtensions.includes(ext)) {
        fetch(file.url)
          .then(res => {
            if (!res.ok) throw new Error("Failed to fetch file content");
            return res.text();
          })
          .then(text => {
            setContent(text);
            setLoading(false);
          })
          .catch(err => {
            console.error(err);
            setError("Failed to load file content");
            setLoading(false);
          });
      } else {
        const previewableExts = ["jpg", "jpeg", "png", "gif", "svg", "webp", "mp4", "webm", "mov", "mp3", "wav", "ogg", "pdf", "docx", "xlsx", "pptx", "doc", "xls", "ppt"];
        if (!previewableExts.includes(ext)) {
            setLoading(false);
        }
      }
    }
  }, [isOpen, file]);

  if (!file) return null;

  const ext = file.name.split(".").pop().toLowerCase();
  
  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const renderContent = () => {
    const url = file.url;

    if (content !== null) {
      return (
        <div className="w-full bg-slate-950 rounded-[20px] overflow-hidden border border-slate-800 shadow-inner">
          <pre className="w-full max-h-[70vh] overflow-auto p-8 text-[13px] leading-relaxed font-mono whitespace-pre-wrap text-slate-300 custom-scrollbar">
            {content}
          </pre>
        </div>
      );
    }

    // Images
    if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext)) {
      return (
        <div className="flex items-center justify-center w-full bg-slate-50/50 rounded-[24px] p-4 min-h-[400px]">
          <img
            src={url}
            alt={file.name}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError("Failed to load image");
            }}
            className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg border border-white"
          />
        </div>
      );
    }

    // Video
    if (["mp4", "webm", "mov"].includes(ext)) {
      return (
        <div className="w-full bg-black rounded-[24px] overflow-hidden shadow-2xl">
          <video
            controls
            autoPlay
            src={url}
            onLoadedData={() => setLoading(false)}
            onError={() => {
               setLoading(false);
               setError("Failed to load video");
            }}
            className="w-full max-h-[70vh]"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // Audio
    if (["mp3", "wav", "ogg"].includes(ext)) {
       return (
        <div className="w-full p-12 bg-white rounded-[24px] border-2 border-slate-100 flex flex-col items-center gap-8 shadow-sm">
            <div className="w-20 h-20 bg-blue-50 rounded-[24px] flex items-center justify-center text-3xl text-blue-500 shadow-inner">
               🎵
            </div>
            <audio
              controls
              autoPlay
              src={url}
              onLoadedData={() => setLoading(false)}
              onError={() => {
                  setLoading(false);
                  setError("Failed to load audio");
              }}
              className="w-full"
            >
              Your browser does not support the audio element.
            </audio>
        </div>
      );
    }

    // PDF / Office
    if (["pdf", "docx", "xlsx", "pptx", "doc", "xls", "ppt"].includes(ext)) {
      const isOffice = ["docx", "xlsx", "pptx", "doc", "xls", "ppt"].includes(ext);
      const viewerUrl = isOffice 
        ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
        : url;
      
      return (
        <div className="w-full bg-slate-100 rounded-[24px] overflow-hidden border border-slate-200 shadow-inner">
          <iframe
            src={viewerUrl}
            title={file.name}
            onLoad={() => setLoading(false)}
            className="w-full h-[70vh] border-none"
          />
        </div>
      );
    }

    // Fallback
    return (
      <div className="flex flex-col items-center justify-center text-center p-14 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] space-y-8">
        <div className="w-24 h-24 bg-white rounded-[28px] shadow-sm flex items-center justify-center text-4xl border border-slate-100 transform rotate-3">
           <FaFileAlt className="text-slate-300 -rotate-3" />
        </div>
        <div className="space-y-3 max-w-[320px]">
          <h3 className="text-xl font-semibold text-[#1b3764] tracking-tight">Preview not available</h3>
          <p className="text-[14px] text-slate-500 font-normal leading-relaxed">
            We can't preview this file type directly, but you can download it to your device.
          </p>
        </div>
        {file.size && (
           <div className="px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm text-[12px] font-medium text-slate-400 tracking-wider uppercase">
              Size: {formatBytes(file.size)}
           </div>
        )}
        <Button
          onClick={() => {
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", file.name);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
          className="h-14 px-10 rounded-[20px] bg-[#1b3764] hover:bg-[#1b3764]/95 font-semibold text-[15px] shadow-[0_10px_20px_rgba(27,55,100,0.2)] transition-all hover:scale-[1.05] active:scale-[0.95] flex items-center gap-3"
        >
          <FaDownload size={14} /> Download Now
        </Button>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={file.name} maxWidth="900px">
      <div className="relative min-h-[300px] flex items-center justify-center">
        {loading && !error && (
           <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
              <div className="w-12 h-12 border-4 border-[#1b3764]/10 border-t-[#1b3764] rounded-full animate-spin"></div>
              <span className="text-[12px] font-semibold text-slate-400 uppercase tracking-widest mt-2">Opening Artifact...</span>
           </div>
        )}
        
        {error ? (
          <div className="flex flex-col items-center gap-4 text-red-500 p-10 bg-red-50 rounded-[24px] border border-red-100">
            <FaExclamationTriangle size={32} />
            <p className="font-medium">{error}</p>
          </div>
        ) : (
          !loading && renderContent()
        )}
      </div>
    </Modal>
  );
};

export default FilePreviewModal;
