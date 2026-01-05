import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
  useParams,
} from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import FileList from "./components/files/FileList";
import UploadArtifact from "./components/UploadArtifact";
import Dashboard from "./components/Dashboard";
import ShareRedirect from "./pages/ShareRedirect";

import { encodeId, decodeId } from "./utils/idMapping";
import { getFilesFromEvent } from "./utils/fileScanner";
import { ThemeProvider } from "./components/theme-provider";

function Breadcrumbs({ currentPath, onNavigate }) {
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    onNavigate(path);
    if (path) {
      navigate(`/drive/${encodeId(path)}`);
    } else {
      navigate("/drive");
    }
  };

  return (
    <div
      className="breadcrumbs"
      style={{
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "14px",
        color: "var(--text-secondary)",
        backgroundColor: "rgba(255,255,255,0.5)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <span
        onClick={() => handleNavigate("")}
        style={{ cursor: "pointer", fontWeight: 600, color: "var(--primary)" }}
      >
        My Drive
      </span>
      {currentPath &&
        currentPath.split("/").map((part, index, arr) => (
          <span
            key={index}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <span style={{ color: "var(--text-muted)" }}>/</span>
            <span
              style={{
                cursor: "pointer",
                fontWeight: index === arr.length - 1 ? 600 : 400,
                color:
                  index === arr.length - 1
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
              }}
              onClick={() => {
                const newPath = arr.slice(0, index + 1).join("/");
                handleNavigate(newPath);
              }}
            >
              {part}
            </span>
          </span>
        ))}
    </div>
  );
}

function DriveView({ viewType, storageRefreshTrigger, onStorageRefresh }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFiles, setDraggedFiles] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  // Extract current path ID from URL and decode it
  const pathId = params["*"] || "";
  const currentPath = decodeId(pathId);

  const refreshFiles = () => setRefreshTrigger((prev) => prev + 1);

  const handleNavigate = (newPath) => {
    if (newPath) {
      navigate(`/drive/${encodeId(newPath)}`);
    } else {
      navigate("/drive");
    }
    setSidebarOpen(false); // Close sidebar on mobile after navigation
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = await getFilesFromEvent(e);
    if (files && files.length > 0) {
      setDraggedFiles(files);
      setShowUploadModal(true);
    }
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setDraggedFiles([]);
  };

  const handleUploadComplete = () => {
    closeUploadModal();
    refreshFiles();
    onStorageRefresh();
  };

  const getTitle = () => {
    switch (viewType) {
      case "dash":
        return "Activity";
      case "shared":
        return "Shared";
      case "recent":
        return "Recent";
      case "starred":
        return "Starred";
      case "trash":
        return "Bin";
      default:
        return "My Drive";
    }
  };

  return (
    <div
      className="app-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Sidebar
        onUploadClick={() => setShowUploadModal(true)}
        refreshTrigger={storageRefreshTrigger}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 999,
          }}
        />
      )}

      {isDragging && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(27, 55, 100, 0.4)",
            backdropFilter: "blur(8px)",
            zIndex: 5000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "4px dashed white",
            margin: "20px",
            borderRadius: "24px",
            pointerEvents: "none",
          }}
        >
          <div style={{ textAlign: "center", color: "white" }}>
            <div style={{ fontSize: "64px", marginBottom: "20px" }}>🚀</div>
            <h2 style={{ fontSize: "32px", fontWeight: 800 }}>
              Drop files to upload
            </h2>
            <p style={{ fontSize: "18px", opacity: 0.9 }}>
              Your files will be uploaded to S3 instantly
            </p>
          </div>
        </div>
      )}

      <main className="main-content">
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          title={getTitle()}
          showSearch={viewType !== "dash"}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {viewType === "all" && (
          <Breadcrumbs currentPath={currentPath} onNavigate={handleNavigate} />
        )}

        <div className="content-area">
          {viewType === "dash" ? (
            <Dashboard refreshTrigger={storageRefreshTrigger} />
          ) : (
            <FileList
              refreshTrigger={refreshTrigger}
              onNavigate={handleNavigate}
              currentPath={currentPath}
              searchQuery={searchQuery}
              viewType={viewType}
              onStorageRefresh={onStorageRefresh}
              onUploadClick={(type) => setShowUploadModal(type || true)}
            />
          )}
        </div>
      </main>

      {showUploadModal && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(135deg, rgba(27, 55, 100, 0.85) 0%, rgba(15, 23, 42, 0.9) 100%)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          <div
            className="modal-container"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRadius: "32px",
              boxShadow:
                "0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)",
              minWidth: "400px",
              maxWidth: "500px",
              width: "100%",
              position: "relative",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              animation: "modalSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
              overflow: "hidden",
            }}
          >
            {/* Decorative gradient top bar */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "4px",

                backgroundSize: "200% 100%",
                animation: "gradientShift 3s ease infinite",
              }}
            />

            <button
              onClick={closeUploadModal}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                border: "none",
                background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--text-muted)",
                zIndex: 1,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                fontSize: "14px",
                fontWeight: 700,
              }}
              onMouseOver={(e) => {
                e;
                e.currentTarget.style.color = "var(--primary)";
                e.currentTarget.style.transform = "rotate(90deg) scale(1.1)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(27, 55, 100, 0.2)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.transform = "rotate(0deg) scale(1)";
                e.currentTarget.style.boxShadow =
                  "0 2px 8px rgba(0, 0, 0, 0.08)";
              }}
            >
              ✕
            </button>
            <UploadArtifact
              onUploadComplete={handleUploadComplete}
              initialFiles={draggedFiles}
              currentPath={currentPath}
              autoTrigger={
                draggedFiles.length > 0
                  ? null
                  : showUploadModal === "file"
                  ? "file"
                  : showUploadModal === "folder"
                  ? "folder"
                  : null
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [storageRefreshTrigger, setStorageRefreshTrigger] = useState(0);
  const triggerStorageRefresh = () =>
    setStorageRefreshTrigger((prev) => prev + 1);

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <DriveView
                viewType="dash"
                storageRefreshTrigger={storageRefreshTrigger}
                onStorageRefresh={triggerStorageRefresh}
              />
            }
          />
          <Route
            path="/drive/*"
            element={
              <DriveView
                viewType="all"
                storageRefreshTrigger={storageRefreshTrigger}
                onStorageRefresh={triggerStorageRefresh}
              />
            }
          />
          <Route
            path="/shared"
            element={
              <DriveView
                viewType="shared"
                storageRefreshTrigger={storageRefreshTrigger}
                onStorageRefresh={triggerStorageRefresh}
              />
            }
          />
          <Route
            path="/recent"
            element={
              <DriveView
                viewType="recent"
                storageRefreshTrigger={storageRefreshTrigger}
                onStorageRefresh={triggerStorageRefresh}
              />
            }
          />
          <Route
            path="/starred"
            element={
              <DriveView
                viewType="starred"
                storageRefreshTrigger={storageRefreshTrigger}
                onStorageRefresh={triggerStorageRefresh}
              />
            }
          />
          <Route
            path="/trash"
            element={
              <DriveView
                viewType="trash"
                storageRefreshTrigger={storageRefreshTrigger}
                onStorageRefresh={triggerStorageRefresh}
              />
            }
          />
          <Route
            path="/storage"
            element={
              <DriveView
                viewType="all"
                storageRefreshTrigger={storageRefreshTrigger}
                onStorageRefresh={triggerStorageRefresh}
              />
            }
          />
          <Route path="/share/:id" element={<ShareRedirect />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
