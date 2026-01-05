import { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaCloudUploadAlt,
  FaFileAlt,
  FaTimes,
  FaLayerGroup,
  FaStopCircle,
} from "react-icons/fa";

import { getFilesFromEvent, isFolderPlaceholder } from "../utils/fileScanner";

export default function UploadArtifact({
  onUploadComplete,
  initialFiles,
  currentPath,
  autoTrigger = null, // 'file' | 'folder' | null
}) {
  const [files, setFiles] = useState(initialFiles || []);
  const [status, setStatus] = useState("idle"); // idle, uploading, success, error
  const [fileProgress, setFileProgress] = useState({}); // { index: progress }
  const [fileStatuses, setFileStatuses] = useState({}); // { index: 'pending' | 'uploading' | 'success' | 'error' | 'cancelled' }
  const [overallProgress, setOverallProgress] = useState(0);

  const activeXhrs = useRef({}); // { index: XHR }

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      setFiles(initialFiles);
    }
  }, [initialFiles]);

  useEffect(() => {
    if (autoTrigger === "file") {
      document.getElementById("file-input")?.click();
    } else if (autoTrigger === "folder") {
      document.getElementById("folder-input")?.click();
    }
  }, [autoTrigger]);

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const validFiles = await getFilesFromEvent(e);

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
      setStatus("idle");
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    console.log("Selected files:", selectedFiles.length);

    // Filter out folder placeholders immediately to avoid UI confusion
    const validFiles = selectedFiles.filter(
      (file) => !isFolderPlaceholder(file)
    );

    if (validFiles.length < selectedFiles.length) {
      console.warn("Filtered out folder placeholders from selection");
      // If ALL files were filtered out (meaning they were all folders), warn the user
      if (validFiles.length === 0) {
        // Use a toast or simple alert since we don't have access to toast here easily
        // or you can use window.alert for now
        alert(
          "Folder uploads must be done via the 'Select Folder' button. Please try again using that option."
        );
      }
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
      setStatus("idle");
    }
  };

  const removeFile = (index) => {
    if (status === "uploading" && activeXhrs.current[index]) {
      activeXhrs.current[index].abort();
      delete activeXhrs.current[index];
    }
    setFiles((prev) => prev.filter((_, i) => i !== index));

    // Clean up status and progress
    const newProgress = { ...fileProgress };
    delete newProgress[index];
    setFileProgress(newProgress);

    const newStatuses = { ...fileStatuses };
    delete newStatuses[index];
    setFileStatuses(newStatuses);
  };

  const cancelSpecificUpload = (index) => {
    if (activeXhrs.current[index]) {
      activeXhrs.current[index].abort();
      delete activeXhrs.current[index];
      setFileStatuses((prev) => ({ ...prev, [index]: "cancelled" }));
      setFileProgress((prev) => ({ ...prev, [index]: 0 }));
    }
  };

  const uploadFile = async (file, index) => {
    try {
      setFileStatuses((prev) => ({ ...prev, [index]: "uploading" }));

      const relativePath = file.webkitRelativePath || file.name;

      // Fix potential path duplication:
      // If currentPath is "temp" and relativePath starts with "temp/", strip it to avoid "temp/temp/file.txt"
      const cleanedPath =
        currentPath && relativePath.startsWith(`${currentPath}/`)
          ? relativePath.slice(currentPath.length + 1)
          : relativePath;

      const key = currentPath
        ? `${currentPath.replace(/\/$/, "")}/${cleanedPath}`
        : cleanedPath;

      console.log(`Uploading file: ${file.name}, Key: ${key}`);

      const urlResponse = await api.post("/api/s3/upload-url", {
        fileName: key,
        contentType: file.type || "application/octet-stream",
      });

      const { url } = urlResponse.data.data;

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        activeXhrs.current[index] = xhr;

        xhr.open("PUT", url);
        xhr.setRequestHeader(
          "Content-Type",
          file.type || "application/octet-stream"
        );

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round(
              (event.loaded / event.total) * 100
            );
            setFileProgress((prev) => ({ ...prev, [index]: percentComplete }));
          }
        };

        xhr.onload = () => {
          delete activeXhrs.current[index];
          if (xhr.status === 200 || xhr.status === 204) {
            setFileProgress((prev) => ({ ...prev, [index]: 100 }));
            setFileStatuses((prev) => ({ ...prev, [index]: "success" }));
            resolve();
          } else {
            setFileStatuses((prev) => ({ ...prev, [index]: "error" }));
            reject(new Error(`Failed to upload ${file.name}`));
          }
        };

        xhr.onerror = () => {
          delete activeXhrs.current[index];
          setFileStatuses((prev) => ({ ...prev, [index]: "error" }));
          reject(new Error(`XHR error for ${file.name}`));
        };

        xhr.onabort = () => {
          delete activeXhrs.current[index];
          setFileStatuses((prev) => ({ ...prev, [index]: "cancelled" }));
          resolve(); // Resolve so Promise.all doesn't fail
        };

        xhr.send(file);
      });
    } catch (error) {
      console.error(`Error initiating upload for ${file.name}:`, error);
      setFileStatuses((prev) => ({ ...prev, [index]: "error" }));
      throw error;
    }
  };

  // Monitor overall progress and completion
  useEffect(() => {
    if (status !== "uploading" || files.length === 0) return;

    const currentStatuses = Object.values(fileStatuses);
    const progressValues = Object.entries(fileProgress);

    // Calculate overall progress
    // We include all files in the average.
    // If a file is cancelled or successful, its contribution is 100% to the completion flow.
    let totalProgress = 0;
    files.forEach((_, idx) => {
      if (
        fileStatuses[idx] === "success" ||
        fileStatuses[idx] === "cancelled"
      ) {
        totalProgress += 100;
      } else {
        totalProgress += fileProgress[idx] || 0;
      }
    });

    const avgProgress = Math.round(totalProgress / files.length);
    setOverallProgress(avgProgress);

    // Check for completion
    const isDone = files.every((_, idx) =>
      ["success", "error", "cancelled"].includes(fileStatuses[idx])
    );

    if (isDone) {
      setTimeout(() => {
        setOverallProgress(100);
        setStatus("success");

        setTimeout(() => {
          if (onUploadComplete) onUploadComplete();
        }, 1500);
      }, 500);
    }
  }, [fileProgress, fileStatuses, status, files.length, onUploadComplete]);

  const handleUpload = async () => {
    if (files.length === 0) return;

    try {
      setStatus("uploading");
      setFileProgress({});
      setOverallProgress(0);
      activeXhrs.current = {};

      const uploadPromises = files.map((file, index) => {
        if (isFolderPlaceholder(file)) {
          console.warn("Skipping folder placeholder:", file.name);
          setFileStatuses((prev) => ({ ...prev, [index]: "success" }));
          return Promise.resolve();
        }

        return uploadFile(file, index);
      });

      await Promise.all(uploadPromises);
    } catch (error) {
      console.error("One or more uploads failed:", error);
      // We don't set status "error" here immediately because the useEffect
      // will handle the final state once all promises resolve/reject.
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return (
    <div
      style={{
        padding: "32px",
        maxHeight: "80vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ marginBottom: "24px" }}>
        <h3
          className="text-h3"
          style={{ color: "var(--primary)", marginBottom: "4px" }}
        >
          Upload Artifacts
        </h3>
        <p
          style={{
            fontSize: "13px",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>You are uploading to:</span>
          <span style={{ fontWeight: 600, color: "var(--primary)" }}>
            My Drive
          </span>
          {currentPath &&
            currentPath.split("/").map((part, i) => (
              <span
                key={i}
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                  /
                </span>
                <span style={{ fontWeight: 600, color: "var(--primary)" }}>
                  {part}
                </span>
              </span>
            ))}
        </p>
      </div>

      {status !== "uploading" && (
        <div
          role="button"
          tabIndex="0"
          aria-label="Click to browse files to upload"
          style={{
            border: "2px dashed #e2e8f0",
            borderRadius: "16px",
            padding: "24px",
            textAlign: "center",
            marginBottom: "24px",
            backgroundColor: "#f8fafc",
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            flexShrink: 0,
          }}
          onClick={() => document.getElementById("file-input").click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ")
              document.getElementById("file-input").click();
          }}
          onMouseOver={(e) => {
            if (status !== "uploading") {
              e.currentTarget.style.backgroundColor = "#f1f5f9";
              e.currentTarget.style.borderColor = "var(--primary-light)";
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "#f8fafc";
            e.currentTarget.style.borderColor = "#e2e8f0";
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (status !== "uploading") {
              e.currentTarget.style.backgroundColor = "#f1f5f9";
              e.currentTarget.style.borderColor = "var(--primary-light)";
            }
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.style.backgroundColor = "#f8fafc";
            e.currentTarget.style.borderColor = "#e2e8f0";
          }}
          onDrop={handleDrop}
        >
          <input
            id="file-input"
            type="file"
            multiple
            onChange={handleFileChange}
            style={{ display: "none" }}
            disabled={status === "uploading"}
          />
          <input
            id="folder-input"
            type="file"
            webkitdirectory=""
            directory=""
            mozdirectory=""
            onChange={handleFileChange}
            style={{ display: "none" }}
            disabled={status === "uploading"}
          />
          <div style={{ color: "var(--primary)", opacity: 0.8 }}>
            <FaCloudUploadAlt size={48} />
          </div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginTop: "8px",
            }}
          >
            {files.length > 0 ? "Add more" : "Drag & Drop files or folders"}
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              marginTop: "4px",
            }}
          >
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Is it a file?
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                document.getElementById("folder-input").click();
              }}
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--primary)",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Upload a folder instead
            </span>
          </div>
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          marginBottom: "24px",
          paddingRight: "4px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {files.map((f, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: "#fff",
              border: "1px solid #f1f5f9",
              borderRadius: "12px",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              position: "relative",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
              opacity: fileStatuses[idx] === "cancelled" ? 0.6 : 1,
              transition: "opacity 0.3s",
            }}
          >
            <div style={{ color: "var(--text-muted)" }}>
              <FaFileAlt />
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {f.webkitRelativePath || f.name}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {formatBytes(f.size)}{" "}
                {fileStatuses[idx] === "cancelled" && "(Cancelled)"}
              </div>
            </div>

            {fileStatuses[idx] === "uploading" ? (
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--primary)",
                  }}
                >
                  {fileProgress[idx] || 0}%
                </div>
                <button
                  onClick={() => cancelSpecificUpload(idx)}
                  title="Cancel this upload"
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#ef4444",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <FaStopCircle size={16} />
                </button>
              </div>
            ) : fileStatuses[idx] === "success" ? (
              <div style={{ color: "#16a34a" }}>
                <FaCheckCircle />
              </div>
            ) : fileStatuses[idx] === "error" ? (
              <div style={{ color: "#ef4444" }}>
                <FaExclamationCircle />
              </div>
            ) : fileStatuses[idx] === "cancelled" ? (
              <div
                style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700 }}
              >
                VOID
              </div>
            ) : (
              <button
                onClick={() => removeFile(idx)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <FaTimes />
              </button>
            )}

            {fileStatuses[idx] === "uploading" && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  height: "2px",
                  backgroundColor: "var(--primary)",
                  width: `${fileProgress[idx] || 0}%`,
                  transition: "width 0.2s",
                  borderRadius: "0 0 0 12px",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {status === "uploading" && files.length > 1 && (
        <div
          style={{
            marginBottom: "24px",
            padding: "16px",
            backgroundColor: "#f0f9ff",
            borderRadius: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--primary)",
              }}
            >
              Overall Progress
            </span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--primary)",
              }}
            >
              {overallProgress}%
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: "6px",
              backgroundColor: "#e0f2fe",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${overallProgress}%`,
                height: "100%",
                backgroundColor: "var(--primary)",
                transition: "width 0.3s",
              }}
            ></div>
          </div>
        </div>
      )}

      {status === "error" && (
        <div
          role="alert"
          style={{
            color: "#d93025",
            marginBottom: "24px",
            fontSize: "13px",
            backgroundColor: "#fef2f2",
            padding: "12px",
            borderRadius: "12px",
            border: "1px solid #fee2e2",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FaExclamationCircle /> Upload failed. Some files could not be stored.
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", flexShrink: 0 }}>
        <button
          onClick={() => {
            // Cancel all active ones if in progress
            Object.values(activeXhrs.current).forEach((xhr) => xhr.abort());
            activeXhrs.current = {};
            if (status === "uploading") {
              setStatus("idle");
            } else {
              setFiles([]);
              setFileStatuses({});
              setFileProgress({});
              setOverallProgress(0);
            }
          }}
          className="btn-secondary"
          style={{
            flex: 1,
            backgroundColor: "#fff",
            color: "var(--text-secondary)",
            border: "1px solid #e2e8f0",
            padding: "12px",
            borderRadius: "12px",
            fontWeight: 600,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          {status === "uploading" ? "Stop All" : "Clear All"}
        </button>
        {status !== "success" && (
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || status === "uploading"}
            className="btn-primary"
            style={{
              flex: 2,
              opacity: files.length === 0 || status === "uploading" ? 0.6 : 1,
              cursor:
                files.length === 0 || status === "uploading"
                  ? "not-allowed"
                  : "pointer",
              display: "flex",
              backgroundColor: "var(--primary-hex)",
              color: "#fff",
              padding: "12px",
              borderRadius: "12px",
              fontWeight: 600,
              fontSize: "14px",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {status === "uploading" ? (
              "Uploading..."
            ) : (
              <>
                <FaLayerGroup />
                Confirm Upload ({files.length})
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
