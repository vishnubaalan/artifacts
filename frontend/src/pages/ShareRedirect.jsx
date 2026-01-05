import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../services/api";
import { FaSpinner, FaExclamationTriangle, FaDownload } from "react-icons/fa";

const ShareRedirect = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const resolveLink = async () => {
      try {
        const response = await api.get(`/api/s3/share/link/${id}`);
        if (response.data.success) {
          // Redirect to the S3 presigned URL
          window.location.href = response.data.data.url;
        } else {
          setError(response.data.message || "Link resolution failed");
        }
      } catch (err) {
        if (err.response && err.response.status === 403) {
          setError("This link is private. Only authorized users can access it.");
        } else {
          setError("Failed to resolve link. It may have expired or is invalid.");
        }
      } finally {
        setLoading(false);
      }
    };

    resolveLink();
  }, [id]);

  if (loading) {
    return (
      <div style={{ 
        height: "100vh", display: "flex", flexDirection: "column", 
        alignItems: "center", justifyContent: "center", gap: "16px",
        fontFamily: "Inter, sans-serif"
      }}>
        <FaSpinner className="animate-spin" style={{ fontSize: "40px", color: "var(--primary)" }} />
        <p style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Preparing your download...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        height: "100vh", display: "flex", flexDirection: "column", 
        alignItems: "center", justifyContent: "center", gap: "24px",
        fontFamily: "Inter, sans-serif", padding: "20px", textAlign: "center"
      }}>
        <div style={{ 
          width: "64px", height: "64px", borderRadius: "50%", 
          background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center" 
        }}>
          <FaExclamationTriangle style={{ fontSize: "32px", color: "#ef4444" }} />
        </div>
        <div style={{ maxWidth: "400px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>Link Error</h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: "1.5" }}>{error}</p>
        </div>
        <button 
          onClick={() => window.location.href = "/"}
          style={{ 
            padding: "10px 24px", background: "var(--primary)", color: "#fff",
            border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600
          }}
        >
          Go to Home
        </button>
      </div>
    );
  }

  return null;
};

export default ShareRedirect;
