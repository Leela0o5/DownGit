import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

function DownGit() {
  const [inputURL, setInputUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);

  const parseGitHubURL = (url) => {
    const match = url.match(
      /github.com\/(.*?)\/(.*?)\/(blob|tree)\/(.*?)\/(.*)/
    );
    if (!match) throw new Error("Invalid GitHub URL. Please try again.");
    return {
      owner: match[1],
      repo: match[2],
      branch: match[4],
      path: match[5],
    };
  };

  const fetchFolderContents = async (
    owner,
    repo,
    branch,
    path,
    zipInstance
  ) => {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GitHub API error: ${res.statusText}`);
    const items = await res.json();

    for (const item of items) {
      if (item.type === "file") {
        const fileContent = await fetch(item.download_url).then((res) =>
          res.text()
        );
        zipInstance.file(item.path, fileContent);
      } else if (item.type === "dir") {
        await fetchFolderContents(owner, repo, branch, item.path, zipInstance);
      }
    }
  };

  const download = async () => {
    setLoading(true);
    setError("");
    try {
      const { owner, path, repo, branch } = parseGitHubURL(inputURL);
      const apiURL = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
      const res = await fetch(apiURL);

      if (!res.ok) {
        throw new Error(`GitHub API error: ${res.statusText}`);
      }

      const data = await res.json();
      const zip = new JSZip();

      if (Array.isArray(data)) {
        // Folder
        await fetchFolderContents(owner, repo, branch, path, zip);
      } else if (data.download_url) {
        // Single file
        const content = await fetch(data.download_url).then((res) =>
          res.text()
        );
        zip.file(data.name, content);
      } else {
        throw new Error("Unsupported path or non-downloadable item.");
      }

      const blob = await zip.generateAsync({ type: "blob" });

      let folderName = path.split("/").pop();

      if (!folderName) {
        folderName = "download";
      }

      saveAs(blob, folderName + ".zip");
      setInputUrl("");
    } catch (err) {
      setError(err.message);
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        setError("");
        setInputUrl("");
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="blob blob1"></div>
      <div className="blob blob2"></div>
      <div className="blob blob3"></div>

      <div className="glass-container">
        <h1>DownGit</h1>
        <input
          type="text"
          placeholder="Paste the GitHub URL here"
          value={inputURL}
          onChange={(e) => setInputUrl(e.target.value)}
        />
        <button onClick={download} disabled={loading}>
          {loading ? "Downloading..." : "Download as ZIP"}
        </button>
      </div>

      {showToast && <div className="toast">{error}</div>}
    </div>
  );
}

export default DownGit;
