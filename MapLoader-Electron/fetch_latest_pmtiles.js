const unzipper = require("unzipper");
const tar = require("tar");
const request = require("request");
const { Readable } = require("node:stream");

async function fetchLatestPMTiles() {
    let ghApiRequest = await fetch("https://api.github.com/repos/protomaps/go-pmtiles/releases");
    let body = await ghApiRequest.json();
    console.log(body);
    let tag = body[0].tag_name;
    let url = `https://github.com/protomaps/go-pmtiles/releases/download/${tag}/go-pmtiles`
    switch (process.platform) {
        case "win32":
            url += `_${tag.replaceAll("v", "")}_Windows_${process.arch === "x64" ? "x86_64" : "arm64"}.zip`;
            console.log("Fetching PMTiles from " + url);
            unzipper.Open.url(request, url).then(d => d.extract({ path: "./", filter: file => file.path.endsWith("pmtiles.exe") }));
            break
        case "darwin":
            url += `-${tag.replaceAll("v", "")}_Darwin_${process.arch === "x64" ? "x86_64" : "arm64"}.zip`;
            unzipper.Open.url(request, url).then(d => d.extract({ path: "./", filter: file => file.path.endsWith("pmtiles") }));
            break
        default:
            url += `_${tag.replaceAll("v", "")}_Linux_${process.arch === "x64" ? "x86_64" : "arm64"}.tar.gz`;
            fetch(url).then(res => {
                Readable.fromWeb(res.body).pipe(tar.extract({ filter: path => path.endsWith("pmtiles"), cwd: "./" }));
            });
            break
    }
}

fetchLatestPMTiles();