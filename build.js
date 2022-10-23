const fs = require("fs");
const path = require("path");
const Handlebars = require("handlebars");
const config = require("./build.config");

function buildHTML(filename, data) {
  const source = fs.readFileSync(filename, "utf8").toString();
  const template = Handlebars.compile(source);
  const output = template(data);

  return output;
}

function copyIfNewer(relativePath, srcDir, destDIr) {
  const destPath = path.join(destDIr, relativePath);
  const srcPath = path.join(srcDir, relativePath);
  if (fs.existsSync(destPath)) {
    const destMT = fs.statSync(destPath).mtime;
    const srcMT = fs.statSync(srcPath).mtime;
    if (srcMT <= destMT) {
      console.log(destPath, "alreay exist");
      return;
    }
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
  console.log("copied", destPath);
}

function listFileRecursive(Directory, oFiles) {
  fs.readdirSync(Directory).forEach((File) => {
    const Absolute = path.join(Directory, File);
    if (fs.statSync(Absolute).isDirectory())
      return listFileRecursive(Absolute, oFiles);
    else {
      oFiles.push(Absolute);
    }
  });
}

async function main() {
  // handlebars render html
  for (const file of config.files) {
    const html = buildHTML(path.join(config.src, file.path), file.variables);
    const outfilePath = path.join(config.output, file.path)
    fs.mkdirSync(path.dirname(outfilePath), {recursive:true})
    fs.writeFile(outfilePath, html, function (err) {
      if (err) return console.log(err);
      console.log(`${file.path} generated.`);
    });
  }
  // copy static files to dist
  const static_files = [];
  listFileRecursive(config.static, static_files);
  for (const file of static_files) {
    const relativePath = path.relative(config.static, file);
    copyIfNewer(relativePath, config.static, config.output);
  }
}

main();