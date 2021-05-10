import ITemplate from "./template";
import cloneSourceFile from "./cloneSourceFile";
import SourceFile from "./sourceFile";
import ShellAsync from "./shellAsync";

import * as fs from "fs-extra";
import * as path from "path";
import * as minimatch from "minimatch";
import * as uuid from "node-uuid";

export default class CreateProject {
  _workerId: string;
  _workerPath: string;
  _template: ITemplate;
  _projectName: string;
  _installPath: string;
  _replace?: IReplace;

  constructor(
    workerPath: string,
    template: ITemplate,
    projectName: string,
    installPath: string,
    replace?: IReplace
  ) {
    this._workerId = uuid.v1().replace(/-/g, "");
    this._workerPath = path.join(workerPath, this._workerId);
    this._template = template;
    this._projectName = projectName;
    this._installPath = installPath;
    this._replace = replace;
  }

  async handle() {
    try {
      // 拉取模板文件源
      let sourceFiles = await cloneSourceFile(this._template, this._workerPath);
      // 排除不需要的文件
      sourceFiles = _exclude(sourceFiles, [
        ...(this._template.exclude ?? []),
        ".git/**",
        "**/.git/**",
        "**/*.ccv.json",
        "*.ccv.json",
      ]);
      // 安装
      await _install(
        sourceFiles,
        this._installPath,
        this._projectName,
        this._replace,
        this._template.sources.isfile
      );
      // 执行预设脚本
      if (this._template.script && this._template.script !== "") {
        await _executeScript(this._template.script);
      }
    } finally {
      // 清理工作目录
      await _clearWorker(this._workerPath);
    }
  }
}

function _match(file: string, modes: string[]): boolean {
  return modes!.filter((y) => minimatch(file, y, { noext: true })).length !== 0;
}

function _exclude(sourceFiles: SourceFile[], exclude: string[]): SourceFile[] {
  return sourceFiles.filter((x) => !_match(x.internalPath, exclude));
}

async function _install(
  sourceFiles: SourceFile[],
  installRootPath: string,
  projectName: string,
  replace?: IReplace,
  isfile?: boolean
): Promise<void> {
  if (isfile && sourceFiles.length === 1) {
    await _installSingleFile(
      sourceFiles[0],
      installRootPath,
      projectName,
      replace
    );
  } else {
    await _installProject(sourceFiles, installRootPath, projectName, replace);
  }
}

async function _installSingleFile(
  file: SourceFile,
  installRootPath: string,
  projectName: string,
  replace?: IReplace
) {
  let filePath = path.join(
    installRootPath,
    projectName + path.extname(file.internalPath)
  );
  if (replace && _match(file.internalPath, replace.files)) {
    let data = (await fs.readFile(file.getPath())).toString();
    data = data.replace(new RegExp(replace.sign, "gm"), replace.filler);
    if (fs.existsSync(filePath)) {
      throw new Error(`文件[${filePath}]已存在`);
    }
    await fs.createFile(filePath);
    await fs.writeFile(filePath, data);
  } else {
    await fs.copy(file.getPath(), filePath);
  }
}

async function _installProject(
  sourceFiles: SourceFile[],
  installRootPath: string,
  projectName: string,
  replace?: IReplace
) {
  let installPath = path.join(installRootPath, projectName);
  for (let i = 0; i < sourceFiles.length; i++) {
    let file = sourceFiles[i];
    let filePath: string;
    if (replace && _match(file.internalPath, replace.files)) {
      let data = (await fs.readFile(file.getPath())).toString();
      data = data.replace(new RegExp(replace.sign, "gm"), replace.filler);
      filePath = path.join(
        installPath,
        file.internalPath.replace(new RegExp(replace.sign, "g"), replace.filler)
      );
      if (fs.existsSync(filePath)) {
        throw new Error(`文件[${filePath}]已存在`);
      }
      await fs.createFile(filePath);
      await fs.writeFile(filePath, data);
    } else {
      filePath = path.join(installPath, file.internalPath);
      await fs.copy(file.getPath(), filePath);
    }
  }
}

async function _executeScript(script: string): Promise<void> {
  await ShellAsync.exec(script);
}

async function _clearWorker(workerPath: string): Promise<void> {
  await fs.remove(workerPath);
}

interface IReplace {
  files: string[];
  sign: string;
  filler: string;
}
