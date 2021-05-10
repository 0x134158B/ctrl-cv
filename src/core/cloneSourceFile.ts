import ITemplate from "./template";
import SourceFile from "./sourceFile";
import ShellAsync from "./shellAsync";

import * as fs from "fs-extra";
import * as Path from "path";

export default async function cloneSourceFile(
  template: ITemplate,
  workerPath: string
): Promise<SourceFile[]> {
  if (template.sources.git && template.sources.git !== "") {
    return await _git(
      workerPath,
      template.sources.git,
      template.sources.tag,
      template.sources.path
    );
  } else if (template.sources.path) {
    return await _local(template.sources.path);
  } else {
    throw new Error("模板文件源设置错误");
  }
}

async function _local(filePath: string): Promise<SourceFile[]> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`模板源文件未找到[${filePath}]`);
  }
  let info = await fs.stat(filePath);
  if (info.isFile()) {
    return [new SourceFile(filePath)];
  }
  if (info.isDirectory()) {
    return await _toSourceFileArray(filePath, "");
  }
  throw new Error("未知文件类型");
}

async function _git(
  workerPath: string,
  git: string,
  bot?: string,
  path?: string
): Promise<SourceFile[]> {
  if (!fs.existsSync(workerPath)) {
    await fs.mkdir(workerPath, { recursive: true });
  }
  let commandString = bot
    ? `git clone ${git} ${workerPath} -b ${bot} --single-branch`
    : `git clone ${git} ${workerPath} --single-branch`;
  let result = await ShellAsync.exec(commandString);
  if (result) {
    workerPath = path
      ? Path.join(workerPath, Path.normalize(path))
      : workerPath;
    return await _toSourceFileArray(workerPath, "");
  }
  throw new Error("执行git clone 命令失败");
}

async function _toSourceFileArray(
  root: string,
  filePath: string
): Promise<SourceFile[]> {
  let s: SourceFile[] = [];
  let p = Path.resolve(root, filePath);
  let files = await fs.readdir(p);
  for (let i = 0; i < files.length; i++) {
    let xp = Path.join(filePath, files[i]);
    let jp = Path.join(p, files[i]);
    let info = await fs.stat(jp);
    if (info.isFile()) {
      s = [...s, new SourceFile(xp, root)];
    }
    if (info.isDirectory()) {
      let cs = await _toSourceFileArray(root, xp);
      s = [...s, ...cs];
    }
  }
  return s;
}
