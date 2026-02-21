const unzipper = require("unzipper");
const tar = require("tar");
const request = require("request");
const { Readable } = require("node:stream");
const { exec } = require("child_process");

let authkey = process.env.GH_ACTION_API_KEY;

async function fetchLatestPMTiles() {
  let ghApiRequest = await fetch(
    "https://api.github.com/repos/protomaps/go-pmtiles/releases",
  {
    headers: {
        Authorization: `Bearer ${authkey}`,
    }
  });
  let body = await ghApiRequest.json();
  let tag = body[0].tag_name;
  let url = `https://github.com/protomaps/go-pmtiles/releases/download/${tag}/go-pmtiles`;
  switch (process.platform) {
    case "win32":
      url += `_${tag.replaceAll("v", "")}_Windows_${process.arch === "x64" ? "x86_64" : "arm64"}.zip`;
      console.log("Fetching PMTiles from " + url);
      unzipper.Open.url(request, url).then((d) =>
        d.extract({
          path: "./",
          filter: (file) => file.path.endsWith("pmtiles.exe"),
        }),
      );
      break;
    case "darwin":
      url += `-${tag.replaceAll("v", "")}_Darwin_${process.arch === "x64" ? "x86_64" : "arm64"}.zip`;
      let zip = unzipper.Open.url(request, url);
      zip.then((d) =>
        d
          .extract({
            path: "./",
            filter: (file) => file.path.endsWith("pmtiles"),
          })
          .then(() => {
            // Make the file executable
            exec("chmod +x pmtiles");
          }),
      );
      break;
    default:
      url += `_${tag.replaceAll("v", "")}_Linux_${process.arch === "x64" ? "x86_64" : "arm64"}.tar.gz`;
      fetch(url).then((res) => {
        Readable.fromWeb(res.body)
          .pipe(
            tar.extract({
              filter: (path) => path.endsWith("pmtiles"),
              cwd: "./",
            }),
          )
          .on("finish", () => {
            // Make the file executable
            exec("chmod +x pmtiles");
          });
      });
      break;
  }
}

fetchLatestPMTiles();
