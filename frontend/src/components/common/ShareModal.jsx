import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import {
  FaUserPlus,
  FaLink,
  FaGlobe,
  FaLock,
  FaCopy,
  FaCheck,
  FaUserCircle,
  FaTimes,
  FaShieldAlt,
} from "react-icons/fa";
import { api } from "../../services/api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const ShareModal = ({ isOpen, onClose, item, onCopy }) => {
  const [loading, setLoading] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [role, setRole] = useState("viewer");
  const [sharedWith, setSharedWith] = useState([]);
  const [generalAccess, setGeneralAccess] = useState("restricted"); // restricted, public
  const [generalRole, setGeneralRole] = useState("viewer"); 
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      fetchSharingSettings();
    }
  }, [isOpen, item]);

  const fetchSharingSettings = async () => {
    setLoading(true);
    try {
      const encodedKey = item.key.split('/').map(part => encodeURIComponent(part)).join('/');
      const response = await api.get(
        `/api/s3/share/${encodedKey}`
      );
      const data = response.data.data;
      setSharedWith(data.sharedWith || []);
      setGeneralAccess(data.generalAccess || "restricted");
      setGeneralRole(data.generalRole || "viewer");
    } catch (err) {
      console.error("Failed to fetch sharing settings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPeople = () => {
    if (!emailInput) return;
    const emails = emailInput
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e);
    const newShares = emails.map((email) => ({ email, role }));

    // Avoid duplicates
    const existingEmails = new Set(sharedWith.map((s) => s.email));
    const uniqueNewShares = newShares.filter(
      (s) => !existingEmails.has(s.email)
    );

    setSharedWith([...sharedWith, ...uniqueNewShares]);
    setEmailInput("");
  };

  const handleRemovePerson = (email) => {
    setSharedWith(sharedWith.filter((s) => s.email !== email));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.post("/api/s3/share", {
        key: item.key,
        sharedWith,
        generalAccess,
        generalRole,
      });
      onClose();
    } catch (err) {
      console.error("Failed to save sharing settings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    // Proactively set to public if not already, to match "anyone with the link" expectation
    if (generalAccess === 'restricted') {
      setGeneralAccess('public');
    }

    // Call API to create/get short link
    api.post("/api/s3/share/link", { key: item.key })
      .then((res) => {
        if (res.data.success) {
          const shortId = res.data.data.id;
          const shareUrl = `${window.location.origin}/share/${shortId}`;
          navigator.clipboard.writeText(shareUrl);
          setCopied(true);
          
          // Also save the status update to the backend
          api.post("/api/s3/share", {
            key: item.key,
            sharedWith,
            generalAccess: 'public',
            generalRole,
          }).catch(err => console.error("Failed to auto-update access", err));

          if (onCopy) onCopy();
          setTimeout(() => setCopied(false), 2000);
        }
      })
      .catch((err) => console.error("Failed to generate short link", err));
  };

  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share item" maxWidth="520px">
      <div className="flex flex-col gap-8">
        
        {/* Item Info Summary */}
        <div className="flex items-center gap-4 bg-slate-50/80 p-4 rounded-[20px] border border-slate-100">
           <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl">
              {item.isFolder ? '📁' : '📄'}
           </div>
           <div className="flex-1 min-w-0">
              <div className="font-semibold text-[#1b3764] truncate text-[15px]">{item.name}</div>
              <div className="text-[12px] text-slate-400 font-medium uppercase tracking-wider">
                {item.isFolder ? 'Folder' : 'File'} • {item.size ? 'Artifact' : 'Shared Item'}
              </div>
           </div>
        </div>

        {/* Add People Section */}
        <div className="space-y-4">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.2em] ml-1">
            Add people and groups
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white border-2 border-slate-100 rounded-[24px] p-2 focus-within:border-[#1b3764] focus-within:ring-4 focus-within:ring-[#1b3764]/5 transition-all shadow-sm">
            <Input
              type="text"
              placeholder="Email addresses..."
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="flex-1 border-none bg-transparent focus-visible:ring-0 shadow-none px-4 h-12 font-medium text-[14px]"
            />
            <div className="flex items-center gap-2 pr-2 w-full sm:w-auto">
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-[110px] h-10 border-none bg-slate-100/50 hover:bg-slate-100 transition-colors text-[13px] font-semibold text-slate-500 rounded-[14px] focus:ring-0 px-4">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="commenter">Commenter</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleAddPeople}
                className="bg-[#1b3764] hover:bg-[#1b3764]/95 rounded-[16px] font-semibold text-[13px] h-10 px-6 sm:flex-shrink-0"
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* People with access list */}
        <div className="space-y-4">
          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.2em] ml-1">
            People with access
          </h4>
          
          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
            {/* Owner */}
             <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-[18px] transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shadow-sm">
                    <FaUserCircle className="text-slate-400 text-xl" />
                </div>
                <div className="flex flex-col">
                    <div className="text-[14px] font-semibold text-[#1b3764]">Me (Owner)</div>
                    <div className="text-[12px] text-slate-400 font-medium">owner@example.com</div>
                </div>
              </div>
              <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest bg-white border border-slate-100 px-3 py-1 rounded-full">Owner</div>
            </div>

            {sharedWith.map((person, index) => (
               <div key={index} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-[18px] transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-[14px] bg-slate-100 flex items-center justify-center text-[#1b3764] font-semibold text-sm">
                      {person.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                      <div className="text-[14px] font-semibold text-[#1b3764]">{person.email.split('@')[0]}</div>
                      <div className="text-[12px] text-slate-400 font-medium">{person.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                     <Select 
                        value={person.role}
                        onValueChange={(val) => {
                            const newShared = [...sharedWith];
                            newShared[index].role = val;
                            setSharedWith(newShared);
                        }}
                     >
                        <SelectTrigger className="h-9 border-none bg-transparent hover:bg-white hover:shadow-sm transition-all text-[13px] font-semibold text-slate-500 rounded-lg focus:ring-0 px-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="commenter">Commenter</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                        </SelectContent>
                     </Select>
                     <Button 
                       variant="ghost"
                       size="icon"
                       onClick={() => handleRemovePerson(person.email)} 
                       className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                     >
                        <FaTimes size={12} />
                     </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* General Access */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.2em] ml-1">
                General access
            </h4>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-start gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center text-lg shadow-sm border ${
                      generalAccess === 'restricted' 
                      ? "bg-slate-50 text-slate-400 border-slate-100" 
                      : "bg-green-50 text-green-500 border-green-100"
                  }`}>
                      {generalAccess === 'restricted' ? <FaLock /> : <FaGlobe />}
                  </div>
                  <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                          <Select value={generalAccess} onValueChange={setGeneralAccess}>
                              <SelectTrigger className="h-6 border-none bg-transparent hover:bg-slate-100 transition-colors text-[14px] font-semibold text-[#1b3764] p-0 focus:ring-0 w-auto gap-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                <SelectItem value="restricted">Restricted</SelectItem>
                                <SelectItem value="public">Anyone with link</SelectItem>
                              </SelectContent>
                          </Select>
                          
                          {generalAccess === 'public' && (
                             <>
                               <span className="text-slate-300 font-light">•</span>
                               <Select value={generalRole} onValueChange={setGeneralRole}>
                                 <SelectTrigger className="h-6 border-none bg-transparent hover:bg-slate-100 transition-colors text-[14px] font-medium text-slate-500 p-0 focus:ring-0 w-auto gap-2">
                                   <SelectValue />
                                 </SelectTrigger>
                                 <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                   <SelectItem value="viewer">Viewer</SelectItem>
                                   <SelectItem value="commenter">Commenter</SelectItem>
                                   <SelectItem value="editor">Editor</SelectItem>
                                 </SelectContent>
                               </Select>
                             </>
                          )}
                      </div>
                      <div className="text-[12px] text-slate-400 font-medium leading-tight">
                          {generalAccess === 'restricted' 
                              ? "Only people with access can open" 
                              : "Anyone on the internet with the link can view"}
                      </div>
                  </div>
              </div>
              
              <Button 
                  variant="outline"
                  onClick={handleCopyLink}
                  className={`flex items-center gap-3 px-6 h-12 rounded-[18px] font-semibold text-[13px] transition-all border-2 shadow-sm ${
                    copied 
                    ? "bg-green-50 text-green-600 border-green-100 hover:bg-green-100" 
                    : "text-[#1b3764] border-slate-100 hover:border-[#1b3764] hover:bg-white"
                  }`}
              >
                 {copied ? <FaCheck size={14} /> : <FaLink size={14} />}
                 {copied ? "Link Copied" : "Copy Shared Link"}
              </Button>
            </div>
        </div>

        {/* Final Actions */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button 
                onClick={handleSave}
                loading={loading}
                className="bg-[#1b3764] hover:bg-[#1b3764]/95 px-10 h-14 rounded-[20px] font-semibold text-[15px] shadow-[0_10px_20px_rgba(27,55,100,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
                Done
            </Button>
        </div>

      </div>
    </Modal>
  );
};

export default ShareModal;
