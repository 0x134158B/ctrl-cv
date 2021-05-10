import * as vscode from "vscode";
import * as fs from "fs-extra";
import * as path from "path";
import ICommand from "./command";
import ITemplate from "../core/template";
import CreateProject from "../core/createProject";

export default class CreateProjectCommand implements ICommand {
  async handle(
    context: vscode.ExtensionContext,
    args: vscode.Uri[]
  ): Promise<void> {
    // 解析传入参数
    const argsPath = await _analysisArgs(args);

    // 选择模板
    let templateUri: vscode.Uri;
    if (argsPath.templateUri) {
      templateUri = argsPath.templateUri;
    } else {
      templateUri = await _selectTemplatePath();
    }
    // 读取模板
    let template: ITemplate = await _readTemplateFile(templateUri);

    // 设置项目名
    let projectName = await _setProjectName();
    // 设置替换字符串
    let replace;
    if (
      template.replace &&
      template.replace.files &&
      template.replace.files.length > 0 &&
      template.replace.sign
    ) {
      replace = {
        files: template.replace.files,
        sign: template.replace.sign,
        filler: await _setFiller(
          projectName,
          template.replace.files,
          template.replace.sign
        ),
      };
    }
    // 设置安装目录
    if (!argsPath.installUri) {
      argsPath.installUri = await _setInstallUri();
    }

    let createProject: CreateProject = new CreateProject(
      context.logUri.fsPath,
      template,
      projectName,
      argsPath.installUri.fsPath,
      replace
    );
    await createProject.handle();
  }
}

async function _analysisArgs(args: vscode.Uri[]): Promise<IArgsPath> {
  if (!args || args.length === 0) {
    return {};
  }
  const arg = args[0];
  if (arg.fsPath.endsWith(".ccv.json")) {
    return { templateUri: arg };
  }
  let info = await fs.stat(arg.fsPath);
  if (info.isDirectory()) {
    return { installUri: arg };
  }
  let dir = path.dirname(arg.fsPath);
  return { installUri: vscode.Uri.file(dir) };
}

async function _selectTemplatePath(): Promise<vscode.Uri> {
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

async function _readTemplateFile(fileUri: vscode.Uri): Promise<ITemplate> {
  const template = await fs.readJson(fileUri.fsPath);
  if (!template) {
    throw new Error("模板文件不存在");
  }
  return template as ITemplate;
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

async function _setFiller(
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

async function _setInstallUri(): Promise<vscode.Uri> {
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
interface IArgsPath {
  installUri?: vscode.Uri;
  templateUri?: vscode.Uri;
}
