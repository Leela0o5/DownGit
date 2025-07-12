import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { HardDriveDownload } from "lucide-react";
import clsx from "clsx";

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
    console.log("Here")
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
    <div className="w-full h-screen flex justify-center items-center bg-github-dark drop-shadow-xl flex-col">
      <div className="card">
        <h1 className="text-primary-text font-github font-bold text-3xl">
          DownGit
        </h1>
        <p className="text-center font-github text-secondary-text">
          Download any GitHub repo in one click
        </p>

        <input
          type="text"
          placeholder="Enter Repo Url..."
          onChange={e => setInputUrl(e.target.value)}
          className="bg-text-bar transition-all text-sm ease-in-out my-7 px-2 font-github focus:border-text-url-border focus:border-2 py-[0.3rem] border border-text-bar-border rounded-lg outline-none text-white w-[80%] placeholder-secondary-text"
        />

        <span 
          onClick={download}
          className={clsx(`flex gap-2 text-primary-text text-sm bg-btn-primary w-[70%] py-1.5 text-center items-center justify-center rounded-lg border border-btn-border hover:bg-btn-hover active:scale-[0.98] transition-all ease-in-out`, {'cursor-pointer': !loading, 'cursor-wait': loading})}>
          <button className="pointer-events-none" disabled={loading}>Download</button>
          <HardDriveDownload size={17} />
        </span>
      </div>
      <p 
      className={clsx("border border-border-color text-orange-400 shadow-2xl shadow-gray-700 font-github bg-github-card-bg absolute px-20 py-4 rounded-lg transition-all ease-in-out duration-300",
        {
          'opacity-100 bottom-10': showToast,
          'opacity-0 bottom-0': !showToast,
        }
      )}>{error}</p>
    </div>
  );
}

export default DownGit;
