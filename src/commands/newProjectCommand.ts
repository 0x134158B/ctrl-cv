import * as vscode from "vscode";
import * as fs from "fs-extra";
import * as path from "path";
import * as uuid from "node-uuid";
import ICommand from "./command";
import ITemplate from "./template";
import clone from "./cloneTemplateFile";
import SourceFile from "./sourceFile";

import * as minimatch from "minimatch";

//let minimatch = require("minimatch");

export default class NewProjectCommand implements ICommand {
  _workerPath: string = "";
  _workerId: string = "";

  async handle(
    context: vscode.ExtensionContext,
    args: vscode.Uri[]
  ): Promise<void> {
    try {
      const argsPath = this._analysisArgs(args);
      // 1.选择模板
      let templateUri: vscode.Uri;
      if (argsPath.templateUri) {
        templateUri = argsPath.templateUri;
      } else {
        templateUri = await this._selectTemplatePath();
      }
      // 2.读取模板
      let template: ITemplate = await this._readTemplateFile(templateUri);

      // 3.设置项目名
      let projectName = await this._setProjectName();
      // 4.设置替换字符串
      let replace: IReplace | undefined;
      if (
        template.replace &&
        template.replace.files &&
        template.replace.files.length > 0 &&
        template.replace.sign
      ) {
        let newStr = await this._setNewStr(
          projectName,
          template.replace.files,
          template.replace.sign
        );
        replace = {
          files: template.replace.files,
          sign: template.replace.sign,
          newStr: newStr,
        };
      }
      // 5.设置安装目录
      if (!argsPath.installUri) {
        argsPath.installUri = await this._setInstallUri();
      }

      // 6.设置工作目录
      this._setWorker(argsPath.installUri);

      // 7.拉取模板文件源
      let sourceFiles = await clone(template, this._workerPath);
      // 8.排除不需要的文件
      sourceFiles = this._exclude(sourceFiles, [
        ...(template.exclude ?? []),
        ".git/**",
        "**/.git/**",
        "**/*.ccv.json",
        "*.ccv.json",
      ]);
      // 9.安装
      await this._install(
        argsPath.installUri!,
        projectName,
        sourceFiles,
        replace,
        template.sources.isfile
      );
      // 10.执行预设脚本
      await this._executeScript();
    } finally {
      // 11.清理工作目录
      await this._clearWorker();
    }

    vscode.window.showInformationMessage("new project from template!");
  }

  _setWorker(installUri: vscode.Uri) {
    this._workerId = uuid.v1().replace(/-/g, "");
    this._workerPath = path.join(installUri.fsPath, this._workerId);
  }

  _analysisArgs(args: vscode.Uri[]): IArgsPath {
    if (!args || args.length === 0) {
      return {};
    }
    const arg = args[0];
    if (arg.fsPath.endsWith(".ccv.json")) {
      return { templateUri: arg };
    }
    return { installUri: arg };
  }

  async _selectTemplatePath(): Promise<vscode.Uri> {
    const templatePath = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      openLabel: "选择",
      title: "选择模板文件",
      filters: {
        json: ["ccv.json"],
      },
    });
    if (!templatePath || templatePath.length === 0) {
      throw new Error("未选择模板文件");
    }
    return templatePath![0];
  }

  async _readTemplateFile(fileUri: vscode.Uri): Promise<ITemplate> {
    const template = await fs.readJson(fileUri.fsPath);
    if (!template) {
      throw new Error("模板文件不存在");
    }
    return template as ITemplate;
  }

  async _setProjectName(): Promise<string> {
    const pname = await vscode.window.showInputBox({
      value: "",
      prompt: "请输入项目名",
      placeHolder: "请输入项目名/文件名",
      password: false,
      ignoreFocusOut: true,
    });
    if (!pname) {
      throw new Error("未设置项目名");
    }
    return pname!;
  }

  async _setNewStr(
    projectName: string,
    files: string[],
    sign: string
  ): Promise<string> {
    let pname = await vscode.window.showInputBox({
      value: "",
      prompt: `请输入替换字符串，默认使用项目名[${projectName}]`,
      placeHolder: `替换文件[${files.join(",")}]，目标字符串[${sign}]`,
      password: false,
      ignoreFocusOut: true,
    });
    return pname ?? projectName;
  }

  async _setInstallUri(): Promise<vscode.Uri> {
    const templatePath = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: "选择",
      title: "选择项目安装位置",
    });
    if (!templatePath || templatePath.length === 0) {
      throw new Error("未选择项目安装位置");
    }
    return templatePath![0];
  }

  _exclude(sourceFiles: SourceFile[], exclude: string[]): SourceFile[] {
    return sourceFiles.filter((x) => !this._match(x.internalPath, exclude));
  }

  async _install(
    installUri: vscode.Uri,
    projectName: string,
    sourceFiles: SourceFile[],
    replace?: IReplace,
    isfile?: boolean
  ): Promise<void> {
    if (isfile && sourceFiles.length === 1) {
      let file = sourceFiles[0];
      let filePath = path.join(
        installUri.fsPath,
        projectName + path.extname(file.internalPath)
      );
      if (replace && this._match(file.internalPath, replace.files)) {
        let data = (await fs.readFile(file.getPath())).toString();
        data = data.replace(new RegExp(replace.sign, "gm"), replace.newStr);
        if (fs.existsSync(filePath)) {
          throw new Error(`文件[${filePath}]已存在`);
        }
        await fs.createFile(filePath);
        await fs.writeFile(filePath, data);
      } else {
        await fs.copy(file.getPath(), filePath);
      }
      return;
    }
    let installPath = path.join(installUri.fsPath, projectName);
    for (let i = 0; i < sourceFiles.length; i++) {
      let file = sourceFiles[i];
      let filePath: string;
      if (replace && this._match(file.internalPath, replace.files)) {
        let data = (await fs.readFile(file.getPath())).toString();
        data = data.replace(new RegExp(replace.sign, "gm"), replace.newStr);
        filePath = path.join(
          installPath,
          file.internalPath.replace(
            new RegExp(replace.sign, "g"),
            replace.newStr
          )
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

  async _executeScript(): Promise<void> {}

  _match(file: string, modes: string[]): boolean {
    return (
      modes!.filter((y) => minimatch(file, y, { noext: true })).length !== 0
    );
  }

  async _clearWorker(): Promise<void> {
    await fs.remove(this._workerPath);
  }
}

interface IArgsPath {
  installUri?: vscode.Uri;
  templateUri?: vscode.Uri;
}

interface IReplace {
  files: string[];
  sign: string;
  newStr: string;
}
