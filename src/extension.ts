import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "helloworld" is now active!');

  //新建项目
  context.subscriptions.push(
    vscode.commands.registerCommand("CCV.Project.New", async (args) => {
      let path: string;
      if (args) {
        path = args.fsPath;
      } else {
        path = await getInstallPath();
      }

      vscode.window.showInformationMessage("new project!");
    })
  );

  //根据当前选中文件创建模板
  context.subscriptions.push(
    vscode.commands.registerCommand("CCV.Template.New.File", () => {
      vscode.window.showInformationMessage("new template from current file!");
    })
  );

  //根据当前选中文件夹创建模板
  context.subscriptions.push(
    vscode.commands.registerCommand("CCV.Template.New.Folder", () => {
      vscode.window.showInformationMessage("new template from current folder!");
    })
  );

  //根据git仓库创建模板
  context.subscriptions.push(
    vscode.commands.registerCommand("CCV.Template.New.Git", () => {
      vscode.window.showInformationMessage("new template from git repository!");
    })
  );

  //删除模板
  context.subscriptions.push(
    vscode.commands.registerCommand("CCV.Template.Delete", () => {
      vscode.window.showInformationMessage("new template from git repository!");
    })
  );
}

// this method is called when your extension is deactivated
export function deactivate() {
  console.log("end");
}

async function getInstallPath(): Promise<string> {
  let u = await vscode.window.showOpenDialog({
    canSelectFiles: false, // 是否可选文件
    canSelectFolders: true, // 是否可选文件夹
    canSelectMany: false, // 是否可以选择多个
    openLabel: "确定",
  });
  if (u && u.length > 0) {
    return u[0].path;
  }
  throw new Error("请选择文件夹");
}
