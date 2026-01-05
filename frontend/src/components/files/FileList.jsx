import { useState, useEffect } from "react";
import { api } from "../../services/api";
import {
  FaFolder,
  FaFile,
  FaFileImage,
  FaFilePdf,
  FaFileWord,
  FaTrash,
  FaShareAlt,
  FaList,
  FaThLarge,
  FaEllipsisV,
  FaDownload,
  FaEye,
  FaChevronRight,
  FaStar,
  FaRegStar,
  FaPlus,
  FaFolderPlus,
  FaFileUpload,
  FaFolderOpen,
  FaUndo,
} from "react-icons/fa";
import { format } from "date-fns";
import ConfirmModal from "../common/ConfirmModal";
import InputModal from "../common/InputModal";
import ShareModal from "../common/ShareModal";
import Toast from "../common/Toast";
import { encodeId } from "../../utils/idMapping";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";
import { Button } from "../ui/button";
import FilePreviewModal from "../common/FilePreviewModal";

// In-memory cache for file listings
const listCache = new Map();

const FileList = ({
  refreshTrigger,
  onNavigate,
  currentPath,
  searchQuery,
  viewType,
  onStorageRefresh,
  onUploadClick,
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("viewMode") || "list";
  });

  useEffect(() => {
    localStorage.setItem("viewMode", viewMode);
  }, [viewMode]);
  const [starredKeys, setStarredKeys] = useState([]);

  useEffect(() => {
    fetchStarredKeys();
  }, [refreshTrigger]);

  const fetchStarredKeys = async () => {
    try {
      const response = await api.get("/api/s3/starred-keys");
      setStarredKeys(response.data.data);
    } catch (err) {
      console.error("Failed to fetch starred keys:", err);
    }
  };

  const [nextContinuationToken, setNextContinuationToken] = useState(null);
  const [tokenHistory, setTokenHistory] = useState([null]); // [ Page1Token (null), Page2Token, ... ]
  const [currentPage, setCurrentPage] = useState(1);
  const [isTruncated, setIsTruncated] = useState(false);

  // Modal & Notification States
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    itemKey: null,
    itemName: "",
  });
  const [folderModal, setFolderModal] = useState({ isOpen: false });
  const [notification, setNotification] = useState({
    isOpen: false,
    message: "",
  });
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    file: null,
  });
  const [shareModal, setShareModal] = useState({
    isOpen: false,
    item: null,
  });

  const [selectedKeys, setSelectedKeys] = useState([]);

  const toggleSelection = (e, key) => {
    e.stopPropagation();
    setSelectedKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = (itemsToSelect) => {
    if (selectedKeys.length === itemsToSelect.length) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(itemsToSelect.map(i => i.key));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedKeys.length === 0) return;
    
    // For trash forever delete
    const confirmMsg = `Are you sure you want to permanently delete these ${selectedKeys.length} items? This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setLoading(true);
      await api.post("/api/s3/bulk-delete", selectedKeys);
      setSelectedKeys([]);
      setNotification({
        isOpen: true,
        message: `${selectedKeys.length} items deleted successfully`,
      });
      fetchItems(true);
    } catch (err) {
      setError("Failed to delete items");
    } finally {
      setLoading(false);
    }
  };

  const toggleStar = async (e, key) => {
    e.stopPropagation();
    try {
      const response = await api.post("/api/s3/toggle-star", { key });
      setStarredKeys(response.data.data);
      if (viewType === "starred") {
        fetchItems(true);
      }
    } catch (err) {
      console.error("Failed to toggle star:", err);
    }
  };

  const getFilteredItems = () => {
    let result = [...items];

    // Search filter
    if (searchQuery) {
      result = result.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // View type filter
    if (["recent", "starred", "trash"].includes(viewType)) {
      // Server-side handles these specialized views now
      return result;
    } else if (viewType === "shared") {
      result = []; // Placeholder for shared
    }

    return result;
  };

  const filteredItems = getFilteredItems();

  useEffect(() => {
    fetchItems(true);
  }, [refreshTrigger, currentPath, viewType]);

  const fetchItems = async (reset = false, direction = "none") => {
    try {
      setLoading(true);

      let token = null;
      if (reset) {
        setTokenHistory([null]);
        setCurrentPage(1);
        token = null;
      } else if (direction === "next") {
        token = nextContinuationToken;
      } else if (direction === "prev") {
        token = tokenHistory[currentPage - 2];
      }

      const isSpecialView = ["recent", "starred", "trash", "shared"].includes(
        viewType
      );
      const prefix =
        viewType === "trash"
          ? "trash/"
          : isSpecialView
          ? ""
          : currentPath
          ? `${currentPath}/`
          : "";

      // Check Cache for Reset/First Load
      const cacheKey = `${viewType}:${prefix}:${currentPage}`;
      if (reset && listCache.has(cacheKey)) {
        setItems(listCache.get(cacheKey));
        setLoading(false); // Background update will happen
      }

      const params = {
        prefix,
        limit: 10,
        continuationToken: token || undefined,
        recursive: isSpecialView ? "true" : "false",
        viewType: viewType,
      };

      const response = await api.get("/api/s3/list", { params });
      const {
        items: newItems,
        nextContinuationToken: nextToken,
        isTruncated: truncated,
      } = response.data.data;

      setItems(newItems);
      listCache.set(cacheKey, newItems);
      setNextContinuationToken(nextToken);
      setIsTruncated(truncated);

      if (direction === "next") {
        setTokenHistory((prev) => [...prev, nextToken]);
        setCurrentPage((prev) => prev + 1);
      } else if (direction === "prev") {
        setCurrentPage((prev) => prev - 1);
      } else if (reset) {
        setTokenHistory([null, nextToken]);
      }

      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (isTruncated) {
      fetchItems(false, "next");
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      fetchItems(false, "prev");
    }
  };

  const handleFolderClick = (folderName) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setCurrentPage(1);
    onNavigate(newPath.replace(/\/$/, ""));
  };

  const handlePreview = async (item) => {
    try {
      // Show loading state immediately if desired, or better:
      // Open modal with loading state?
      // FilePreviewModal handles its own loading if given a file object.
      // But we need the URL first.
      // Or we pass the KEY to the modal and let it fetch? No, modal expects file:{url, name}.
      // So fetch URL here.
      const response = await api.get("/api/s3/file-url", {
        params: { key: item.key },
      });
      setPreviewModal({
        isOpen: true,
        file: {
          ...item,
          url: response.data.data.url,
        },
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = async (item) => {
    // Open Share Modal
    setShareModal({
      isOpen: true,
      item: item,
    });
  };

   const handleDownload = async (key, fileName, isFolder = false) => {
    try {
      if (isFolder) {
        // Folder download logic
        const response = await api.get(
          `/api/s3/download-folder/${encodeURIComponent(key)}`,
          { responseType: 'blob' }
        );
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${fileName}.zip`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const response = await api.get(
        `/api/s3/file-url/${encodeURIComponent(key)}?download=true`
      );
      const url = response.data.data.url;
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = (item) => {
    setDeleteModal({
      isOpen: true,
      itemKey: item.key,
      itemName: item.name,
    });
  };

  const confirmDelete = async () => {
    try {
      if (viewType === "trash") {
        // Permanent delete
        await api.delete(
          `/api/s3/files/${encodeURIComponent(deleteModal.itemKey)}`
        );
      } else {
        // Move to trash
        await api.post("/api/s3/move-to-trash", { key: deleteModal.itemKey });
      }
      setDeleteModal({ isOpen: false, itemKey: null, itemName: "" });
      fetchItems();
      setNotification({
        isOpen: true,
        message:
          viewType === "trash"
            ? "File deleted permanently"
            : "File moved to trash",
      });
      if (onStorageRefresh) onStorageRefresh();
    } catch (err) {
      console.error(err);
      alert("Action failed");
    }
  };

  const handleRestore = async (e, key) => {
    e.stopPropagation();
    try {
      await api.post("/api/s3/restore", { key });
      fetchItems();
      setNotification({ isOpen: true, message: "File restored successfully" });
      if (onStorageRefresh) onStorageRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to restore file");
    }
  };

  const handleCreateFolderClick = () => {
    setFolderModal({ isOpen: true });
  };

  const submitCreateFolder = async (folderName) => {
    try {
      const prefix = currentPath ? `${currentPath}/${folderName}` : folderName;
      await api.post("/api/s3/create-folder", { folderName: prefix });
      setFolderModal({ isOpen: false });
      fetchItems();
    } catch (err) {
      console.error(err);
      alert("Failed to create folder");
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "svg"].includes(ext))
      return <FaFileImage style={{ color: "#f43f5e" }} />;
    if (["pdf"].includes(ext))
      return <FaFilePdf style={{ color: "#ef4444" }} />;
    if (["doc", "docx"].includes(ext))
      return <FaFileWord style={{ color: "#3b82f6" }} />;
    return <FaFile style={{ color: "#94a3b8" }} />;
  };

  const getFileType = (fileName) => {
    const ext = fileName.split(".").pop().toLowerCase();
    if (ext === fileName.toLowerCase()) return "File";
    return ext.toUpperCase() + " File";
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  if (loading)
    return (
      <div
        aria-live="polite"
        aria-busy="true"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
          gap: "16px",
        }}
      >
        <div className="spinner" aria-hidden="true"></div>
        <span
          style={{
            fontSize: "14px",
            color: "var(--text-secondary)",
            fontWeight: 500,
          }}
        >
          Syncing with S3 Storage...
        </span>
      </div>
    );

  return (
    <div className="fade-in">
      <ShareModal
        isOpen={shareModal.isOpen}
        onClose={() => setShareModal({ isOpen: false, item: null })}
        item={shareModal.item}
        onSave={() => {
          setNotification({ isOpen: true, message: "Sharing updated" });
        }}
        onCopy={() => {
          setNotification({
            isOpen: true,
            message: "Link copied to clipboard",
          });
        }}
      />
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "32px",
        }}
      >
        <div>
          <h3
            className="text-h3"
            style={{ color: "var(--primary)", marginBottom: "4px" }}
          >
            {viewType === "recent"
              ? "Recent"
              : viewType === "starred"
              ? "Starred"
              : viewType === "trash"
              ? "Bin"
              : viewType === "shared"
              ? "Shared with me"
              : currentPath
              ? currentPath.split("/").pop()
              : "My Drive"}
          </h3>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            {filteredItems.length}{" "}
            {filteredItems.length === 1 ? "item" : "items"} in this directory
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {!["recent", "starred", "trash", "shared"].includes(viewType) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="flex items-center gap-2 bg-[#1b3764] hover:bg-[#1b3764]/90 text-white shadow-[0_8px_20px_rgba(27,55,100,0.15)] rounded-xl h-[42px] px-5 font-bold transition-all hover:-translate-y-0.5 border-none">
                  <FaPlus aria-hidden="true" />
                  <span>New</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="px-3 py-2 text-[11px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-50 mb-1"> Create New </DropdownMenuLabel>
                <DropdownMenuItem onClick={handleCreateFolderClick}>
                  <FaFolderPlus className="text-blue-500" /> 
                  <span>New Folder</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-50" />
                <DropdownMenuItem onClick={() => onUploadClick && onUploadClick("file")}>
                  <FaFileUpload className="text-emerald-500" /> 
                  <span>File Upload</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUploadClick("folder")}>
                  <FaFolderOpen className="text-violet-500" /> 
                  <span>Folder Upload</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {viewType === "trash" && filteredItems.length > 0 && (
            <div style={{ display: "flex", gap: "8px" }}>
               <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectAll(filteredItems)}
                className="h-10 px-4 rounded-xl border-slate-200 text-slate-500 font-semibold hover:bg-slate-50"
              >
                {selectedKeys.length === filteredItems.length ? "Deselect All" : "Select All"}
              </Button>
              {selectedKeys.length > 0 && (
                 <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="h-10 px-5 rounded-xl font-semibold bg-red-500 hover:bg-red-600 shadow-sm transition-all"
                >
                  <FaTrash className="mr-2" size={12} />
                  Delete ({selectedKeys.length})
                </Button>
              )}
            </div>
          )}

          <div
            role="group"
            aria-label="View Mode"
            style={{
              display: "flex",
              gap: "8px",
              backgroundColor: "var(--secondary)",
              padding: "6px",
              borderRadius: "14px",
            }}
          >
            <button
              onClick={() => setViewMode("list")}
              aria-label="List View"
              aria-pressed={viewMode === "list"}
              style={{
                background: viewMode === "list" ? "var(--background)" : "transparent",
                border: "none",
                padding: "10px",
                borderRadius: "10px",
                display: "flex",
                cursor: "pointer",
                boxShadow:
                  viewMode === "list"
                    ? "0 4px 6px -1px rgba(0,0,0,0.1)"
                    : "none",
                color:
                  viewMode === "list" ? "var(--primary)" : "var(--text-muted)",
              }}
            >
              <FaList size={16} aria-hidden="true" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              aria-label="Grid View"
              aria-pressed={viewMode === "grid"}
              style={{
                background: viewMode === "grid" ? "var(--background)" : "transparent",
                border: "none",
                padding: "10px",
                borderRadius: "10px",
                display: "flex",
                cursor: "pointer",
                boxShadow:
                  viewMode === "grid"
                    ? "0 4px 6px -1px rgba(0,0,0,0.1)"
                    : "none",
                color:
                  viewMode === "grid" ? "var(--primary)" : "var(--text-muted)",
              }}
            >
              <FaThLarge size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {filteredItems.length === 0 && (
        <div
          aria-label="Empty Directory"
          style={{
            padding: "100px 40px",
            textAlign: "center",
            color: "var(--text-muted)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
            border: "2px dashed var(--border)",
            borderRadius: "24px",
            backgroundColor: "hsl(var(--muted) / 0.1)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: "80px",
              height: "80px",
              backgroundColor: "var(--background)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
            }}
          >
            <FaFolder size={32} color="#cbd5e1" />
          </div>
          <div style={{ maxWidth: "300px" }}>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--primary)",
                marginBottom: "8px",
              }}
            >
              Empty Directory
            </div>
            <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
              This folder doesn't have any files yet. Drag and drop files or use
              the 'Upload' button to get started.
            </div>
          </div>
        </div>
      )}

      {filteredItems.length > 0 &&
        (viewMode === "list" ? (
       
          <div className="file-list-table" style={{ background: "var(--background)", borderRadius: "20px", border: "1px solid var(--border)" }}>
            <table
              aria-label={`Files in ${currentPath || "My Drive"}`}
              style={{ width: "100%", borderCollapse: "collapse" }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                   {viewType === "trash" && (
                    <th style={{ padding: "16px 24px", width: "40px" }}>
                      <input 
                        type="checkbox" 
                        checked={selectedKeys.length === filteredItems.length && filteredItems.length > 0}
                        onChange={() => handleSelectAll(filteredItems)}
                        className="w-4 h-4 accent-[#1b3764] rounded cursor-pointer"
                      />
                    </th>
                  )}
                  <th
                    style={{
                      textAlign: "left",
                      padding: "16px 24px",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Name
                  </th>
                  <th
                    className="hide-on-mobile"
                    style={{
                      textAlign: "left",
                      padding: "16px 24px",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Type
                  </th>
                  <th
                    className="hide-on-mobile"
                    style={{
                      textAlign: "left",
                      padding: "16px 24px",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Size
                  </th>
                  <th
                    className="hide-on-mobile"
                    style={{
                      textAlign: "left",
                      padding: "16px 24px",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Last Modified
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "16px 24px",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.key}
                    onClick={() =>
                      item.isFolder
                        ? handleFolderClick(item.name)
                        : handlePreview(item)
                    }
                    style={{
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      fontSize: "14px",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor = "var(--secondary)")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        item.isFolder
                          ? handleFolderClick(item.name)
                          : handlePreview(item);
                    }}
                    tabIndex="0"
                    aria-label={`${item.isFolder ? "Folder" : "File"}: ${
                      item.name
                    }`}
                  >
                    {viewType === "trash" && (
                      <td style={{ padding: "16px 24px" }}>
                        <input 
                          type="checkbox" 
                          checked={selectedKeys.includes(item.key)}
                          onChange={(e) => toggleSelection(e, item.key)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 accent-[#1b3764] rounded cursor-pointer"
                        />
                      </td>
                    )}
                    <td style={{ padding: "16px 24px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                        }}
                      >
                        <div
                          aria-hidden="true"
                          style={{
                            width: "40px",
                            height: "40px",
                            backgroundColor: item.isFolder
                              ? "rgba(99, 102, 241, 0.1)"
                              : "#f1f5f9",
                            borderRadius: "10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "18px",
                          }}
                        >
                          {item.isFolder ? (
                            <FaFolder style={{ color: "#6366f1" }} />
                          ) : (
                            getFileIcon(item.name)
                          )}
                        </div>
                        <div
                          onClick={(e) => toggleStar(e, item.key)}
                          style={{
                            cursor: "pointer",
                            color: starredKeys.includes(item.key)
                              ? "#eab308"
                              : "#cbd5e1",
                            display: "flex",
                            alignItems: "center",
                          }}
                          aria-label={
                            starredKeys.includes(item.key) ? "Unstar" : "Star"
                          }
                        >
                          {starredKeys.includes(item.key) ? (
                            <FaStar size={14} />
                          ) : (
                            <FaRegStar size={14} />
                          )}
                        </div>
                        <span
                          style={{
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td
                      className="hide-on-mobile"
                      style={{
                        padding: "16px 24px",
                        color: "var(--text-secondary)",
                        fontSize: "14px",
                      }}
                    >
                      {item.isFolder ? "Folder" : getFileType(item.name)}
                    </td>
                    <td
                      className="hide-on-mobile"
                      style={{
                        padding: "16px 24px",
                        color: "var(--text-secondary)",
                        fontSize: "14px",
                      }}
                    >
                      {item.isFolder ? "--" : formatBytes(item.size)}
                    </td>
                    <td
                      className="hide-on-mobile"
                      style={{
                        padding: "16px 24px",
                        color: "var(--text-secondary)",
                        fontSize: "14px",
                      }}
                    >
                      {item.lastModified
                        ? format(new Date(item.lastModified), "MMM d, yyyy")
                        : "--"}
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "4px",
                          justifyContent: "flex-end",
                        }}
                      >
                        {viewType === "trash" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(e, item.key);
                            }}
                            aria-label={`Restore ${item.name}`}
                            className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                          >
                            <FaUndo aria-hidden="true" size={14} />
                          </Button>
                        ) : (
                          <div style={{ display: "flex", gap: "4px" }}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(item.key, item.name, item.isFolder);
                              }}
                              title={item.isFolder ? `Download Folder (${item.name})` : `Download ${item.name}`}
                              className="h-9 w-9 text-slate-500 hover:text-[#1b3764] hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <FaDownload aria-hidden="true" size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShare(item);
                              }}
                              title={`Share ${item.name}`}
                              className="h-9 w-9 text-slate-500 hover:text-[#1b3764] hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <FaShareAlt aria-hidden="true" size={14} />
                            </Button>
                          </div>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-slate-400 hover:text-[#1b3764] hover:bg-slate-100 rounded-full transition-all"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FaEllipsisV size={14} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="px-3 py-2 text-[11px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-50 mb-1">
                              File Actions
                            </DropdownMenuLabel>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                item.isFolder ? handleFolderClick(item.name) : handlePreview(item);
                              }}
                            >
                              <FaEye className="text-slate-400" />
                              <span>View Details</span>
                            </DropdownMenuItem>
                            
                             <DropdownMenuItem 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleDelete(item);
                               }}
                               className="text-red-500 focus:text-red-600 focus:bg-red-50"
                             >
                               <FaTrash className="opacity-70" />
                               <span>
                                 {viewType === "trash" ? "Delete Forever" : "Move to Trash"}
                               </span>
                             </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            role="list"
            aria-label={`Files in ${currentPath || "All Files"}`}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "24px",
            }}
          >
            {filteredItems.map((item) => (
              <div
                key={item.key}
                role="listitem"
                tabIndex="0"
                onClick={() =>
                  item.isFolder
                    ? handleFolderClick(item.name)
                    : handlePreview(item)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    item.isFolder
                      ? handleFolderClick(item.name)
                      : handlePreview(item);
                }}
                aria-label={`${item.isFolder ? "Folder" : "File"}: ${
                  item.name
                }`}
                style={{
                  background: "#fff",
                  borderRadius: "24px",
                  border: "1px solid #f1f5f9",
                  padding: "24px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)",
                  position: "relative",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow =
                    "0 20px 25px -5px rgba(0, 0, 0, 0.08)";
                  e.currentTarget.style.borderColor = "var(--primary-light)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 6px -1px rgba(0, 0, 0, 0.02)";
                  e.currentTarget.style.borderColor = "#f1f5f9";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  {viewType === "trash" && (
                    <div 
                      style={{ position: "absolute", top: "12px", left: "12px", zIndex: 10 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedKeys.includes(item.key)}
                        onChange={(e) => toggleSelection(e, item.key)}
                        className="w-5 h-5 accent-[#1b3764] rounded-md cursor-pointer shadow-sm"
                      />
                    </div>
                  )}
                  <div
                    aria-hidden="true"
                    style={{
                      width: "56px",
                      height: "56px",
                      backgroundColor: item.isFolder
                        ? "rgba(99, 102, 241, 0.1)"
                        : "#f8fafc",
                      borderRadius: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px",
                      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
                    }}
                  >
                    {item.isFolder ? (
                      <FaFolder style={{ color: "#6366f1" }} />
                    ) : (
                      getFileIcon(item.name)
                    )}
                  </div>
                      <div style={{ display: "flex", gap: "2px" }}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(item.key, item.name, item.isFolder);
                          }}
                          className="h-8 w-8 text-slate-400 hover:text-[#1b3764] rounded-full"
                        >
                          <FaDownload size={12} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(item);
                          }}
                          className="h-8 w-8 text-slate-400 hover:text-[#1b3764] rounded-full"
                        >
                          <FaShareAlt size={12} />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-[#1b3764] hover:bg-slate-100 rounded-full transition-all"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FaEllipsisV size={12} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="px-3 py-2 text-[11px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-50 mb-1">
                              File Actions
                            </DropdownMenuLabel>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                item.isFolder ? handleFolderClick(item.name) : handlePreview(item);
                              }}
                            >
                              <FaEye className="text-slate-400" />
                              <span>View Details</span>
                            </DropdownMenuItem>
                            
                             {viewType === "trash" && (
                                <DropdownMenuItem 
                                  onClick={(e) => handleRestore(e, item.key)}
                                  className="text-blue-600 focus:text-blue-600 focus:bg-blue-50"
                                >
                                  <FaUndo className="opacity-70" />
                                  <span>Restore</span>
                                </DropdownMenuItem>
                             )}

                            <DropdownMenuSeparator className="bg-slate-50" />
                            
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item);
                              }}
                              className="text-red-500 focus:text-red-600 focus:bg-red-50"
                            >
                              <FaTrash className="opacity-70" />
                              <span>
                                {viewType === "trash" ? "Delete Forever" : "Move to Trash"}
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginBottom: "6px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: "15px",
                    }}
                  >
                    {item.name}
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginTop: "4px"
                    }}
                  >
                    <span>{item.isFolder ? "Folder" : getFileType(item.name)}</span>
                    <span style={{ color: "#e2e8f0" }}>•</span>
                    {!item.isFolder && (
                      <>
                        <span>{formatBytes(item.size)}</span>
                        <span style={{ color: "#e2e8f0" }}>•</span>
                      </>
                    )}
                    <span>
                      {item.lastModified
                        ? format(new Date(item.lastModified), "MMM d")
                        : ""}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    opacity: 0,
                    transition: "opacity 0.2s",
                  }}
                  className="card-hover-reveal"
                  aria-hidden="true"
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "var(--primary)",
                    }}
                  >
                    View Details
                  </span>
                  <FaChevronRight size={10} color="var(--primary)" />
                </div>

                <style>
                  {`.card-hover-reveal { opacity: 0; } tr:hover .card-hover-reveal, div:hover > .card-hover-reveal { opacity: 1; }`}
                </style>
              </div>
            ))}
          </div>
        ))}
      {/* Modal Components */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() =>
          setDeleteModal({ isOpen: false, itemKey: null, itemName: "" })
        }
        onConfirm={confirmDelete}
        title={
          viewType === "trash"
            ? "Confirm Permanent Deletion"
            : "Confirm Move to Trash"
        }
        message={
          viewType === "trash"
            ? `Are you sure you want to delete "${deleteModal.itemName}" permanently? This action cannot be undone.`
            : `Are you sure you want to move "${deleteModal.itemName}" to the trash?`
        }
        confirmText={viewType === "trash" ? "Delete Forever" : "Move to Trash"}
      />

      {filteredItems.length > 0 && (currentPage > 1 || isTruncated) && (
        <div className="flex flex-col items-center gap-2 mt-6 mb-8">
          <div className="text-[13px] text-slate-500 font-semibold mb-2">
            Page {currentPage}{" "}
            {isTruncated ? "(more files available)" : "(end of list)"}
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={handlePrevPage}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              <PaginationItem>
                <PaginationLink isActive>{currentPage}</PaginationLink>
              </PaginationItem>

              {isTruncated && (
                <PaginationItem>
                  <PaginationLink
                    onClick={handleNextPage}
                    className="cursor-pointer"
                  >
                    {currentPage + 1}
                  </PaginationLink>
                </PaginationItem>
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={handleNextPage}
                  className={
                    !isTruncated
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <InputModal
        isOpen={folderModal.isOpen}
        onClose={() => setFolderModal({ isOpen: false })}
        onSubmit={submitCreateFolder}
        title="Create New Folder"
        label="Folder Name"
        placeholder="Enter folder name..."
        submitText="Create Folder"
      />

      <FilePreviewModal
        isOpen={previewModal.isOpen}
        file={previewModal.file}
        onClose={() => setPreviewModal({ isOpen: false, file: null })}
      />

      <Toast
        isOpen={notification.isOpen}
        message={notification.message}
        onClose={() => setNotification({ isOpen: false, message: "" })}
      />
    </div>
  );
};

export default FileList;
