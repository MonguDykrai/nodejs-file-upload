// reference 
// https://juejin.cn/post/7066795897643860004
// https://juejin.cn/user/377887733062525

const http = require("http");
const path = require("path");
const fse = require("fs-extra");
const multiparty = require("multiparty");

const server = http.createServer();
const UPLOAD_DIR = path.resolve(__dirname, ".", "target"); // 大文件存储目录

server.on("request", async (req, res) => {
  console.log(req);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    res.status = 200;
    res.end();
    return;
  }

  // 使用 multiparty 包处理前端传来的 FormData
  // 在 multiparty.parse 的回调中，files 参数保存了 FormData 中文件，fields 参数保存了 FormData 中非文件的字段
  const multipart = new multiparty.Form();

  multipart.parse(req, async (err, fields, files) => {
    if (err) {
      return;
    }
    const [chunk] = files.chunk;
    const [hash] = fields.hash;
    const [filehash] = fields.filehash;
    const chunkDir = path.resolve(UPLOAD_DIR, filehash);

   // 切片目录不存在，创建切片目录
    if (!fse.existsSync(chunkDir)) {
      await fse.mkdirs(chunkDir);
    }

    // fs-extra 专用方法，类似 fs.rename 并且跨平台
    // fs-extra 的 rename 方法 windows 平台会有权限问题
    await fse.move(chunk.path, `${chunkDir}/${hash}`);
    res.end("received file chunk");
  });
});
server.listen(3000, () => console.log("正在监听 3000 端口"));