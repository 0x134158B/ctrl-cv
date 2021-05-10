import * as vscode from "vscode";
import ICommand from "./commands/command";
import CreateProjectCommand from "./commands/createProjectCommand";
import SimpleGitCloneCommand from "./commands/simpleGitCloneCommand";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "helloworld" is now active!');

  function registerCommand<T extends ICommand>(
    commandName: string,
    commandNew: new () => T
  ) {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        commandName,
        async (...args: vscode.Uri[]) => {
          try {
            await new commandNew().handle(context, args);
          } catch (error) {
            vscode.window.showErrorMessage(error.message);
          }
        }
      )
    );
  }

  //新建项目
  registerCommand("CCV.Project.New", CreateProjectCommand);

  registerCommand("CCV.Project.New.Simple", SimpleGitCloneCommand);
}

export function deactivate() {}
