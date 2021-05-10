import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs-extra";
import ICommand from "./command";
import ITemplate from "../core/template";
import CreateProject from "../core/createProject";

export default class SimpleGitCloneCommand implements ICommand {
  async handle(
    context: vscode.ExtensionContext,
    args: vscode.Uri[]
  ): Promise<void> {
    // 生成简单模板
    let template: ITemplate = await _setTemplate();

    // 设置项目名
    let projectName = await _setProjectName();

    // 设置安装目录
    const installUri = await _setInstallUri(args);

    let createProject: CreateProject = new CreateProject(
      context.logUri.fsPath,
      template,
      projectName,
      installUri.fsPath,
      undefined
    );
    await createProject.handle();
  }
}

async function _setTemplate(): Promise<ITemplate> {
  const git = await vscode.window.showInputBox({
    value: "",
    prompt: "请输入git项目地址",
    placeHolder: "请输入有效的git clone 地址",
    password: false,
    ignoreFocusOut: true,
  });
  if (!git) {
    throw new Error("未输入git项目地址");
  }
  return {
    sources: {
      git: git,
    },
  };
}

async function _setProjectName(): Promise<string> {
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

async function _setInstallUri(args: vscode.Uri[]): Promise<vscode.Uri> {
  if (args && args.length !== 0) {
    const arg = args[0];
    let info = await fs.stat(arg.fsPath);
    if (info.isDirectory()) {
      return arg;
    }
    let dir = path.dirname(arg.fsPath);
    return vscode.Uri.file(dir);
  }
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
