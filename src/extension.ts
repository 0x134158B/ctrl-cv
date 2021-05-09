import * as vscode from "vscode";
import ICommand from "./commands/command";
import NewProjectCommand from "./commands/newProjectCommand";

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
            console.log(error);
          }
        }
      )
    );
  }

  //新建项目
  registerCommand("CCV.Project.New", NewProjectCommand);

}

export function deactivate() {
  console.log("end");
}
